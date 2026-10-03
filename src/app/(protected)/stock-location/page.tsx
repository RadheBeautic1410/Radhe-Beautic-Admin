"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import React, { useCallback, useEffect, useState } from "react";
import { UserRole } from "@prisma/client";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
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
import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  locationForShopId,
} from "@/src/lib/godown";
import { getUserShop } from "@/src/actions/shop";
import { useCurrentUser } from "@/src/hooks/use-current-user";

interface LocationStockItem {
  id: string;
  code: string;
  category: string;
  image: { url?: string } | null;
  sizes: { size: string; quantity: number; elsewhere: string }[];
  pieces: number;
}

interface Movement {
  id: string;
  code: string;
  size: string;
  quantity: number;
  fromLocation: StockLocation;
  toLocation: StockLocation | "CLEARED"; // CLEARED = emptied by a location stock-take
  movedBy?: string | null;
  createdAt: string;
}

function LocationStockList({
  location,
  refreshKey = 0,
}: {
  location: StockLocation;
  /** Bump to reload, e.g. after the location was cleared. */
  refreshKey?: number;
}) {
  const [items, setItems] = useState<LocationStockItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPieces, setTotalPieces] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const pageSize = 20;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        location,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (appliedSearch) params.set("search", appliedSearch);
      const res = await fetch(`/api/kurti/godown/location-stock?${params.toString()}`);
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
  }, [location, page, appliedSearch, refreshKey]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [location]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="text-sm font-semibold">
          {loading ? (
            <span className="flex items-center gap-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </span>
          ) : (
            <span>
              {LOCATION_LABELS[location]}: {total} product(s), {totalPieces} piece(s)
            </span>
          )}
        </div>
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
      </div>

      {total > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table className="border border-collapse">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center font-bold">Sr.</TableHead>
                  <TableHead className="text-center font-bold">Image</TableHead>
                  <TableHead className="text-center font-bold">Code</TableHead>
                  <TableHead className="text-center font-bold">Category</TableHead>
                  <TableHead className="text-center font-bold">
                    Sizes in {LOCATION_LABELS[location]}
                  </TableHead>
                  <TableHead className="text-center font-bold">Pieces</TableHead>
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
                        href={`/catalogue/${String(row.category).toLowerCase()}/${String(
                          row.code
                        ).toLowerCase()}`}
                      >
                        {row.code}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">{row.category}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {row.sizes.map((sz) => (
                          <span
                            key={sz.size}
                            title={`All locations: ${sz.elsewhere}`}
                            className="text-xs font-bold bg-slate-100 text-slate-800 rounded-md px-2 py-1"
                          >
                            {sz.size}: {sz.quantity}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{row.pieces}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

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
}

interface SummaryBox {
  location: StockLocation;
  pieces: number;
  designs: number;
  amount?: number; // admins only
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** One box per location plus a total: pieces, designs and (admins) stock value. */
function LocationSummary({
  refreshKey,
  selected,
  onSelect,
}: {
  refreshKey: number;
  selected: StockLocation;
  onSelect: (loc: StockLocation) => void;
}) {
  const [data, setData] = useState<{
    locations: SummaryBox[];
    pieces: number;
    amount?: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/kurti/godown/location-summary");
        const json = await res.json();
        if (res.ok) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

  if (loading && !data) {
    return (
      <span className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading stock totals...
      </span>
    );
  }
  if (!data) return null;

  const box = "rounded-lg border p-3 min-w-[150px] flex-1 text-left";
  return (
    <div className="flex flex-wrap gap-2">
      {data.locations.map((l) => (
        <button
          key={l.location}
          type="button"
          onClick={() => onSelect(l.location)}
          className={`${box} ${
            selected === l.location
              ? "border-slate-800 bg-slate-50"
              : "border-gray-200 bg-white hover:bg-gray-50"
          }`}
        >
          <p className="text-sm font-semibold text-gray-600">{LOCATION_LABELS[l.location]}</p>
          <p className="text-2xl font-bold">{l.pieces.toLocaleString("en-IN")} pcs</p>
          {l.amount !== undefined && (
            <p className="text-sm font-semibold text-emerald-700">{rupees(l.amount)}</p>
          )}
          <p className="text-xs text-gray-500">{l.designs.toLocaleString("en-IN")} designs</p>
        </button>
      ))}
      <div className={`${box} border-slate-800 bg-slate-800 text-white`}>
        <p className="text-sm font-semibold text-slate-300">Total</p>
        <p className="text-2xl font-bold">{data.pieces.toLocaleString("en-IN")} pcs</p>
        {data.amount !== undefined && (
          <p className="text-sm font-semibold text-emerald-300">{rupees(data.amount)}</p>
        )}
        <p className="text-xs text-slate-300">Amount = pieces × selling price</p>
      </div>
    </div>
  );
}

/** Admin stock-take: empty one location across every category, then re-scan it. */
function ClearLocationButton({
  location,
  onCleared,
}: {
  location: StockLocation;
  onCleared: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const clear = async () => {
    try {
      setBusy(true);
      setMessage(null);
      const res = await fetch("/api/kurti/godown/clear-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to clear");
      setMessage(json.data?.success || "Cleared");
      setPassword("");
      setOpen(false);
      onCleared();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
          Clear all {LOCATION_LABELS[location]} stock
        </Button>
        {message && <span className="text-sm font-semibold">{message}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-red-300 bg-red-50 p-3 w-fit max-w-full">
      <p className="text-sm font-semibold text-red-700">
        Sets every design&apos;s {LOCATION_LABELS[location]} stock to 0, in all categories. The
        other locations keep their pieces. Then re-scan the pieces in Add Stock with
        &quot;Add to: {LOCATION_LABELS[location]}&quot;. This cannot be undone - do it when
        {" "}{LOCATION_LABELS[location]} is not selling.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="password"
          className="w-[220px]"
          placeholder="Clear stock password"
          value={password}
          disabled={busy}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="button" variant="destructive" disabled={busy || !password} onClick={clear}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
          Clear {LOCATION_LABELS[location]}
        </Button>
        <Button
          type="button"
          variant={"outline" as any}
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setPassword("");
            setMessage(null);
          }}
        >
          Cancel
        </Button>
      </div>
      {message && <span className="text-sm font-semibold text-red-700">{message}</span>}
    </div>
  );
}

function RecentMovements() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/kurti/godown/move?limit=50`);
        const json = await res.json();
        setRows(json?.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <span className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading...
      </span>
    );
  }
  if (!rows.length) {
    return <p className="text-sm text-gray-600">No moves recorded yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table className="border border-collapse">
        <TableHeader>
          <TableRow>
            <TableHead className="font-bold">When</TableHead>
            <TableHead className="font-bold">Code</TableHead>
            <TableHead className="font-bold">Qty</TableHead>
            <TableHead className="font-bold">From → To</TableHead>
            <TableHead className="font-bold">By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((m) => (
            <TableRow key={m.id}>
              <TableCell className="text-xs whitespace-nowrap">
                {new Date(m.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </TableCell>
              <TableCell className="font-semibold">
                {m.code}-{m.size}
              </TableCell>
              <TableCell>{m.quantity}</TableCell>
              <TableCell className="whitespace-nowrap">
                {LOCATION_LABELS[m.fromLocation] || m.fromLocation} →{" "}
                {m.toLocation === "CLEARED"
                  ? "Cleared (stock-take)"
                  : LOCATION_LABELS[m.toLocation] || m.toLocation}
              </TableCell>
              <TableCell>{m.movedBy || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StockLocationPage() {
  const user = useCurrentUser();
  const [location, setLocation] = useState<StockLocation>("FLOOR_1");
  const canSeeMoves = user?.role === UserRole.ADMIN || user?.role === UserRole.UPLOADER;
  const [refreshKey, setRefreshKey] = useState(0);

  // Shop logins (1st floor, 2nd floor, Shop 316) start on their own location.
  // The session can load after the first render, hence the effect.
  useEffect(() => {
    if (user?.role !== UserRole.SHOP_SELLER || !user?.id) return;
    getUserShop(user.id)
      .then((shop) => {
        const loc = locationForShopId(shop?.id);
        if (loc) setLocation(loc);
      })
      .catch(() => {});
  }, [user?.role, user?.id]);

  return (
    <Card className="w-full h-full rounded-none">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">📍 Stock by Location</p>
        <p className="text-sm text-center text-gray-600">
          What is sitting on the 1st Floor, 2nd Floor, at Shop 316 and in the Godown
          right now.
        </p>
      </CardHeader>
      <CardContent className="w-full flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {STOCK_LOCATIONS.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLocation(loc)}
              className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                location === loc
                  ? "bg-slate-800 border-slate-800 text-white"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {LOCATION_LABELS[loc]}
            </button>
          ))}
        </div>

        <LocationSummary refreshKey={refreshKey} selected={location} onSelect={setLocation} />

        {user?.role === UserRole.ADMIN && (
          <ClearLocationButton
            key={location}
            location={location}
            onCleared={() => setRefreshKey((k) => k + 1)}
          />
        )}

        <LocationStockList location={location} refreshKey={refreshKey} />

        {canSeeMoves && (
          <div className="flex flex-col gap-2 mt-4">
            <p className="text-lg font-semibold">🔁 Recent moves</p>
            <RecentMovements />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const StockLocationHelp = () => {
  return (
    <RoleGateForComponent
      allowedRole={[
        UserRole.ADMIN,
        UserRole.UPLOADER,
        UserRole.SELLER,
        UserRole.SHOP_SELLER,
      ]}
    >
      <StockLocationPage />
    </RoleGateForComponent>
  );
};

export default StockLocationHelp;
