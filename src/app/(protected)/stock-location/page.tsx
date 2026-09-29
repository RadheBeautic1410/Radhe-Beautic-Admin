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
  toLocation: StockLocation;
  movedBy?: string | null;
  createdAt: string;
}

function LocationStockList({ location }: { location: StockLocation }) {
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
  }, [location, page, appliedSearch]);

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
                {LOCATION_LABELS[m.toLocation] || m.toLocation}
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

        <LocationStockList location={location} />

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
