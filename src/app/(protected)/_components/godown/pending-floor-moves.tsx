"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { LayoutGrid, List, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import {
  COUNTED_LOCATIONS,
  LOCATION_LABELS,
  PendingSource,
  STOCK_LOCATIONS,
} from "@/src/lib/godown";

type CountedLocation = (typeof COUNTED_LOCATIONS)[number];
type PendingView = "list" | "grid";

/** Places the missing pieces can be looked for, given the location they are missing at. */
const sourceOptions = (location: "" | CountedLocation): PendingSource[] => [
  // With no location chosen both floors are empty by definition.
  ...STOCK_LOCATIONS.filter((loc) =>
    location ? loc !== location : loc === "GODOWN" || loc === "SHOP_316"
  ),
  "ANY",
];

const sourceLabel = (source: PendingSource) =>
  source === "ANY" ? "elsewhere" : `in ${LOCATION_LABELS[source]}`;

const VIEW_STORAGE_KEY = "pendingFloorMoves.view";
const PAGE_SIZE_STORAGE_KEY = "pendingFloorMoves.pageSize";
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200];

const catalogueHref = (row: { category: string; code: string }) =>
  `/catalogue/${String(row.category).toLowerCase()}/${String(row.code).toLowerCase()}`;

/** Per-size pieces at the "Found at" location next to the size's total, with a sum row. */
const SizeTable = ({
  sizes,
  source,
  className = "",
}: {
  sizes: PendingFloorMoveItem["pendingSizes"];
  source: PendingSource;
  className?: string;
}) => {
  const foundAt = source === "ANY" ? "Elsewhere" : LOCATION_LABELS[source];
  const sumFound = sizes.reduce((sum, sz) => sum + sz.sourceQuantity, 0);
  const sumTotal = sizes.reduce((sum, sz) => sum + sz.quantity, 0);
  return (
    <table className={`w-full text-xs border border-amber-200 rounded-md overflow-hidden ${className}`}>
      <thead className="bg-amber-100 text-amber-900">
        <tr>
          <th className="px-1.5 py-1 text-left font-semibold">Size</th>
          <th className="px-1.5 py-1 text-right font-semibold">{foundAt}</th>
          <th className="px-1.5 py-1 text-right font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {sizes.map((sz) => (
          <tr key={sz.size} className="border-t border-amber-100">
            <td className="px-1.5 py-0.5 font-bold">{sz.size}</td>
            <td className="px-1.5 py-0.5 text-right font-bold text-amber-800">{sz.sourceQuantity}</td>
            <td className="px-1.5 py-0.5 text-right text-gray-700">{sz.quantity}</td>
          </tr>
        ))}
      </tbody>
      {sizes.length > 1 && (
        <tfoot className="border-t border-amber-200 bg-amber-50 font-bold">
          <tr>
            <td className="px-1.5 py-1">All</td>
            <td className="px-1.5 py-1 text-right text-amber-800">{sumFound}</td>
            <td className="px-1.5 py-1 text-right">{sumTotal}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
};

export interface PendingFloorMoveItem {
  id: string;
  code: string;
  category: string;
  party: string;
  sellingPrice: string;
  image: { url?: string } | null;
  pendingSizes: { size: string; quantity: number; sourceQuantity: number }[];
  pendingPieces: number;
}

interface PendingFloorMovesProps {
  /** Bump this number after a scan to pull a fresh list. */
  refreshKey?: number;
  pageSize?: number;
  /** Compact mode hides the search box - used on the scan page. */
  compact?: boolean;
}

/**
 * Lists every product/size with nothing at a location (both selling floors by
 * default) while pieces sit somewhere else (the godown by default). These are the
 * pieces the floor team keeps hunting for, and the ones to bring over to sell.
 * Shop 316 has no fixed categories, so "Not on Shop 316" + "Found at ..." is how
 * staff check whether a design is there yet.
 */
export const PendingFloorMoves: React.FC<PendingFloorMovesProps> = ({
  refreshKey = 0,
  pageSize: initialPageSize = 100,
  compact = false,
}) => {
  const [items, setItems] = useState<PendingFloorMoveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState<"" | CountedLocation>("");
  const [source, setSource] = useState<PendingSource>("GODOWN");
  const [categories, setCategories] = useState<string[]>([]);
  const [view, setView] = useState<PendingView>("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "list" || saved === "grid") setView(saved);
      const savedSize = parseInt(localStorage.getItem(PAGE_SIZE_STORAGE_KEY) || "", 10);
      if (PAGE_SIZE_OPTIONS.includes(savedSize)) setPageSize(savedSize);
    } catch {}
  }, []);

  const chooseView = (v: PendingView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v);
    } catch {}
  };

  const choosePageSize = (n: number) => {
    setPage(1);
    setPageSize(n);
    try {
      localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(n));
    } catch {}
  };

  const pageSizeOptions = PAGE_SIZE_OPTIONS.includes(pageSize)
    ? PAGE_SIZE_OPTIONS
    : [...PAGE_SIZE_OPTIONS, pageSize].sort((a, b) => a - b);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);

  // A refresh can shrink the list (e.g. after a scan) - don't strand the user
  // on a page past the end.
  useEffect(() => {
    if (!loading && page > totalPages) setPage(totalPages);
  }, [loading, page, totalPages]);

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (appliedSearch) params.set("search", appliedSearch);
      if (category) params.set("category", category);
      if (location) params.set("location", location);
      params.set("source", source);
      const res = await fetch(`/api/kurti/godown/pending?${params.toString()}`);
      const json = await res.json();
      const data = json?.data || { items: [], total: 0, totalPieces: 0 };
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPieces(data.totalPieces || 0);
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch, category, location, source]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending, refreshKey]);

  const placeLabel = location ? LOCATION_LABELS[location] : "the selling floor";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="p-2 border rounded-md text-sm"
          value={location}
          onChange={(e) => {
            setPage(1);
            const next = e.target.value as "" | CountedLocation;
            setLocation(next);
            if (!sourceOptions(next).includes(source)) setSource("GODOWN");
          }}
        >
          <option value="">All locations (not on any floor)</option>
          {COUNTED_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              Not on {LOCATION_LABELS[loc]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          Found at
          <select
            className="p-2 border rounded-md text-sm"
            value={source}
            onChange={(e) => {
              setPage(1);
              setSource(e.target.value as PendingSource);
            }}
          >
            {sourceOptions(location).map((src) => (
              <option key={src} value={src}>
                {src === "ANY" ? "Anywhere else" : LOCATION_LABELS[src]}
              </option>
            ))}
          </select>
        </label>
        <select
          className="p-2 border rounded-md text-sm"
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
        >
          <option value="">All categories</option>
          {/* Keep the chosen category listed even if it has nothing pending now. */}
          {(category && !categories.includes(category) ? [category, ...categories] : categories).map(
            (cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            )
          )}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-gray-700">
          Per page
          <select
            className="p-2 border rounded-md text-sm"
            value={pageSize}
            onChange={(e) => choosePageSize(parseInt(e.target.value, 10))}
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex rounded-md border overflow-hidden">
          {(["list", "grid"] as const).map((v) => (
            <button
              key={v}
              type="button"
              title={v === "list" ? "List view" : "Grid view"}
              onClick={() => chooseView(v)}
              className={`flex items-center gap-1 px-3 py-2 text-sm font-semibold ${
                view === v ? "bg-slate-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {v === "list" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
              {v === "list" ? "List" : "Grid"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-sm">
          {loading ? (
            <span className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : total === 0 ? (
            <span className="font-semibold text-emerald-700">
              ✅ Nothing pending - no size is {sourceLabel(source)} with none on {placeLabel}.
            </span>
          ) : (
            <span className="font-semibold text-amber-800">
              ⚠️ {total} product(s), {totalPieces} piece(s) are {sourceLabel(source)} with
              none on {placeLabel}.
            </span>
          )}
        </div>

        {!compact && (
          <div className="flex items-end gap-2">
            <Input
              className="w-[180px]"
              placeholder="Search code"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setAppliedSearch(search.trim().toUpperCase());
                }
              }}
            />
            <Button
              type="button"
              variant={"outline" as any}
              onClick={() => {
                setPage(1);
                setAppliedSearch(search.trim().toUpperCase());
              }}
            >
              Search
            </Button>
          </div>
        )}
      </div>

      {total > 0 && (
        <>
          {view === "grid" ? (
            <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
                >
                  {row.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.image.url}
                      alt={row.code}
                      className="w-full aspect-[3/4] object-cover bg-gray-100"
                    />
                  ) : (
                    <div className="w-full aspect-[3/4] bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                      No image
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <Link
                        className="font-semibold text-blue-600 hover:underline"
                        href={catalogueHref(row)}
                      >
                        {row.code}
                      </Link>
                      <span className="text-xs text-gray-500">{row.category}</span>
                    </div>
                    <SizeTable sizes={row.pendingSizes} source={source} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <Table className="mt-1 border border-collapse">
            <TableHeader>
              <TableRow className="text-black">
                <TableHead className="text-center font-bold text-base">
                  Sr.
                </TableHead>
                <TableHead className="text-center font-bold text-base">
                  Image
                </TableHead>
                <TableHead className="text-center font-bold text-base">
                  Code
                </TableHead>
                <TableHead className="text-center font-bold text-base">
                  Category
                </TableHead>
                <TableHead className="text-center font-bold text-base">
                  Sizes {sourceLabel(source)}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row, idx) => (
                <TableRow key={row.id}>
                  <TableCell className="text-center">
                    {(page - 1) * pageSize + idx + 1}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.image.url}
                        alt={row.code}
                        className="h-14 w-14 object-cover rounded-md mx-auto"
                      />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={catalogueHref(row)}
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{row.category}</TableCell>
                  <TableCell className="text-center">
                    <SizeTable sizes={row.pendingSizes} source={source} className="max-w-[260px] mx-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-600">
              Showing {firstShown}-{lastShown} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={"outline" as any}
                disabled={loading || page <= 1}
                onClick={() => setPage(1)}
              >
                First
              </Button>
              <Button
                type="button"
                variant={"outline" as any}
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-sm whitespace-nowrap">
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant={"outline" as any}
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
              <Button
                type="button"
                variant={"outline" as any}
                disabled={loading || page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                Last
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
