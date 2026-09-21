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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

export interface PendingFloorMoveItem {
  id: string;
  code: string;
  category: string;
  party: string;
  sellingPrice: string;
  image: { url?: string } | null;
  pendingSizes: { size: string; quantity: number; godownQuantity: number }[];
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
 * Lists every product/size whose pieces are all sitting in the godown, so nothing
 * is on the selling floor for that size. These are the pieces the floor team keeps
 * hunting for, and the ones an admin should bring down to sell.
 */
export const PendingFloorMoves: React.FC<PendingFloorMovesProps> = ({
  refreshKey = 0,
  pageSize: initialPageSize = 20,
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

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (appliedSearch) params.set("search", appliedSearch);
      const res = await fetch(`/api/kurti/godown/pending?${params.toString()}`);
      const json = await res.json();
      const data = json?.data || { items: [], total: 0, totalPieces: 0 };
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPieces(data.totalPieces || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, appliedSearch]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending, refreshKey]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-sm">
          {loading ? (
            <span className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : total === 0 ? (
            <span className="font-semibold text-emerald-700">
              ✅ Nothing pending - every size with stock has pieces on the selling
              floor.
            </span>
          ) : (
            <span className="font-semibold text-amber-800">
              ⚠️ {total} product(s), {totalPieces} piece(s) are only in the godown
              and need to be moved down for sale.
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
            <select
              className="p-2 border rounded-md"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(parseInt(e.target.value));
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>

      {total > 0 && (
        <>
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
                  Sizes stuck in godown
                </TableHead>
                <TableHead className="text-center font-bold text-base">
                  Pieces
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
                      href={`/catalogue/${String(
                        row.category
                      ).toLowerCase()}/${String(row.code).toLowerCase()}`}
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">{row.category}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {row.pendingSizes.map((sz) => (
                        <span
                          key={sz.size}
                          className="text-xs font-bold bg-amber-100 text-amber-800 rounded-md px-2 py-1"
                        >
                          {sz.size}: {sz.godownQuantity}/{sz.quantity}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-semibold">
                    {row.pendingPieces}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant={"outline" as any}
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </Button>
            <span className="text-sm">Page {page}</span>
            <Button
              type="button"
              variant={"outline" as any}
              disabled={loading || page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
