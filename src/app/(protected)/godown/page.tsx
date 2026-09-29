"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import React, { useEffect, useState } from "react";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { getUserShop } from "@/src/actions/shop";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
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
import axios from "axios";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  getLocationQty,
  getTotalQty,
  locationForShopId,
  needsFloorMove,
} from "@/src/lib/godown";
import { PendingFloorMoves } from "../_components/godown/pending-floor-moves";

interface LastMove {
  code: string;
  size: string;
  totalQuantity: number;
  counts: Record<StockLocation, number>;
}

const LocationButtons = ({
  title,
  value,
  isDisabled,
  onChange,
}: {
  title: string;
  value: StockLocation;
  isDisabled: (loc: StockLocation) => boolean;
  onChange: (loc: StockLocation) => void;
}) => (
  <div className="flex flex-row flex-wrap items-center gap-2">
    <span className="text-sm font-semibold w-12">{title}</span>
    {STOCK_LOCATIONS.map((loc) => (
      <button
        key={loc}
        type="button"
        disabled={isDisabled(loc)}
        onClick={() => onChange(loc)}
        className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
          value === loc
            ? "bg-slate-800 border-slate-800 text-white"
            : isDisabled(loc)
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {LOCATION_LABELS[loc]}
      </button>
    ))}
  </div>
);

function GodownStockPage() {
  const user = useCurrentUser();
  const [code, setCode] = useState("");
  const [from, setFrom] = useState<StockLocation>("GODOWN");
  const [to, setTo] = useState<StockLocation>("FLOOR_1");
  // Shop logins may only move stock into or out of their own location.
  const [ownLocation, setOwnLocation] = useState<StockLocation | null>(null);
  const [kurti, setKurti] = useState<any>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user?.role !== UserRole.SHOP_SELLER || !user?.id) return;
    getUserShop(user.id)
      .then((shop) => {
        const loc = locationForShopId(shop?.id);
        if (!loc) return;
        setOwnLocation(loc);
        setFrom("GODOWN");
        setTo(loc);
      })
      .catch(() => {});
  }, [user?.role, user?.id]);

  const chooseFrom = (loc: StockLocation) => {
    setFrom(loc);
    if (ownLocation && loc !== ownLocation) {
      setTo(ownLocation);
    } else if (loc === to) {
      setTo(loc === "GODOWN" ? "FLOOR_1" : "GODOWN");
    }
  };

  const toDisabled = (loc: StockLocation) =>
    loc === from || (!!ownLocation && from !== ownLocation && loc !== ownLocation);

  const handleMove = async () => {
    const entered = code.trim();
    if (entered.length < 7) {
      toast.error("Please enter the full code with size, e.g. JR41223XL");
      return;
    }
    try {
      setSaving(true);
      const res = await axios.post(`/api/kurti/godown/move`, {
        code: entered.toUpperCase(),
        from,
        to,
      });
      const data = res.data.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(data.success);
      setKurti(data.data);
      setLastMove({
        code: data.data?.code,
        size: data.size,
        totalQuantity: data.totalQuantity,
        counts: data.counts,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      console.error("Error moving stock:", error);
      toast.error("Something went wrong!");
    } finally {
      setCode("");
      setSaving(false);
    }
  };

  return (
    <Card className="w-full h-full rounded-none">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">🏬 Stock Location</p>
        <p className="text-sm text-center text-gray-600">
          Record where each piece is: 1st Floor, 2nd Floor, Shop 316 or Godown. This
          never changes the total piece count - it only moves a piece from one place
          to another.
        </p>
      </CardHeader>

      <CardContent className="w-full flex flex-col justify-center flex-wrap gap-3">
        <div className="flex flex-col gap-2">
          <LocationButtons title="From" value={from} isDisabled={() => false} onChange={chooseFrom} />
          <LocationButtons title="To" value={to} isDisabled={toDisabled} onChange={setTo} />
          {ownLocation && (
            <p className="text-xs text-gray-600">
              Your login can move stock into or out of {LOCATION_LABELS[ownLocation]}.
            </p>
          )}
          <p className="text-xs font-semibold rounded-md px-2 py-1.5 border w-fit bg-slate-50 border-slate-200 text-slate-700">
            Each scan moves 1 piece from {LOCATION_LABELS[from]} to {LOCATION_LABELS[to]}.
          </p>
        </div>

        <div className="flex flex-row flex-wrap gap-2">
          <div className="flex flex-col flex-wrap">
            <h3>Product Code (with size)</h3>
            <Input
              className="w-[100%]"
              placeholder="e.g. JR41223XL"
              value={code}
              onKeyUp={(e) => {
                if (e.key === "Enter") {
                  handleMove();
                }
              }}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button
            type="button"
            className="mt-5"
            onClick={handleMove}
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
            Move to {LOCATION_LABELS[to]}
          </Button>
        </div>

        {lastMove && (
          <div className="p-3 rounded-lg border border-gray-200 bg-slate-50 w-fit">
            <p className="font-bold">
              {lastMove.code} - {lastMove.size}
            </p>
            <div className="flex flex-wrap gap-4 mt-1 text-sm">
              <span>
                Total: <b>{lastMove.totalQuantity}</b>
              </span>
              {STOCK_LOCATIONS.map((loc) => (
                <span key={loc}>
                  {LOCATION_LABELS[loc]}: <b>{lastMove.counts?.[loc] ?? 0}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        {kurti ? (
          <div className="p-3 bg-slate-200 mt-1 w-[440px] max-w-full rounded-lg">
            {kurti.images?.[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={kurti.images[0].url}
                alt={kurti.code}
                crossOrigin="anonymous"
                height={"300px"}
                width={"300px"}
              />
            )}
            <p className="font-bold">{`Code: ${String(
              kurti.code
            ).toUpperCase()}`}</p>
            <p className="text-2xl font-semibold mt-2 mb-1">{`Price - ${kurti.sellingPrice}/-`}</p>

            <Table className="border border-collapse">
              <TableHeader className="border text-white bg-slate-800">
                <TableRow>
                  <TableHead className="font-bold border text-white">SIZE</TableHead>
                  <TableHead className="font-bold border text-white">TOTAL</TableHead>
                  {STOCK_LOCATIONS.map((loc) => (
                    <TableHead key={loc} className="font-bold border text-white">
                      {LOCATION_LABELS[loc].toUpperCase()}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(kurti.sizes || []).map((sz: any, i: number) => (
                  <TableRow key={i} className={needsFloorMove(sz) ? "bg-amber-100" : ""}>
                    <TableCell className="border">
                      {String(sz.size).toUpperCase()}
                    </TableCell>
                    <TableCell className="border">{getTotalQty(sz)}</TableCell>
                    {STOCK_LOCATIONS.map((loc) => (
                      <TableCell key={loc} className="border">
                        {getLocationQty(sz, loc)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          ""
        )}

        {/* Pending move-to-floor alert */}
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-lg font-semibold">⬇️ Not on any showroom floor yet</p>
          <PendingFloorMoves refreshKey={refreshKey} pageSize={10} compact />
        </div>
      </CardContent>
    </Card>
  );
}

const GodownStockHelp = () => {
  return (
    <>
      <RoleGateForComponent
        allowedRole={[UserRole.ADMIN, UserRole.UPLOADER, UserRole.SHOP_SELLER]}
      >
        <GodownStockPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.SELLER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default GodownStockHelp;
