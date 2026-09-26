"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import React, { useState } from "react";
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
import { getFloorQty, getGodownQty, getTotalQty } from "@/src/lib/godown";
import { PendingFloorMoves } from "../_components/godown/pending-floor-moves";

type Direction = "TO_GODOWN" | "TO_FLOOR";

interface LastMove {
  code: string;
  size: string;
  direction: Direction;
  totalQuantity: number;
  godownQuantity: number;
  floorQuantity: number;
}

function GodownStockPage() {
  const [code, setCode] = useState("");
  const [direction, setDirection] = useState<Direction>("TO_GODOWN");
  const [kurti, setKurti] = useState<any>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
        direction,
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
        direction,
        totalQuantity: data.totalQuantity,
        godownQuantity: data.godownQuantity,
        floorQuantity: data.floorQuantity,
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

  const toGodown = direction === "TO_GODOWN";

  return (
    <Card className="w-full h-full rounded-none">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">🏬 Godown Stock</p>
        <p className="text-sm text-center text-gray-600">
          Record which pieces are lying in the godown and which are down on the
          selling floor. This never changes the total piece count - it only moves a
          piece between the two.
        </p>
      </CardHeader>

      <CardContent className="w-full flex flex-col justify-center flex-wrap gap-3">
        {/* Direction toggle */}
        <div className="flex flex-row flex-wrap gap-2 items-center">
          <span className="text-sm font-semibold">Scanning to:</span>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setDirection("TO_GODOWN")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                toGodown
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              ⬆️ To Godown
            </button>
            <button
              type="button"
              onClick={() => setDirection("TO_FLOOR")}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${
                !toGodown
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              ⬇️ To Selling Floor
            </button>
          </div>
        </div>

        <p
          className={`text-xs font-semibold rounded-md px-2 py-1.5 border w-fit ${
            toGodown
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toGodown
            ? "Each scan marks 1 piece as kept in the godown, so the selling floor count goes down by 1."
            : "Each scan brings 1 piece down from the godown, so the selling floor count goes up by 1."}
        </p>

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
            {toGodown ? "Move to Godown" : "Move to Floor"}
          </Button>
        </div>

        {lastMove && (
          <div className="p-3 rounded-lg border border-gray-200 bg-slate-50 w-fit">
            <p className="font-bold">
              {lastMove.code} - {lastMove.size}
            </p>
            <div className="flex gap-4 mt-1 text-sm">
              <span>
                Total: <b>{lastMove.totalQuantity}</b>
              </span>
              <span className="text-amber-800">
                In godown: <b>{lastMove.godownQuantity}</b>
              </span>
              <span className="text-emerald-700">
                On floor: <b>{lastMove.floorQuantity}</b>
              </span>
            </div>
          </div>
        )}

        {kurti ? (
          <div className="p-3 bg-slate-200 mt-1 w-[340px] rounded-lg">
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
                  <TableHead className="font-bold border text-white">
                    SIZE
                  </TableHead>
                  <TableHead className="font-bold border text-white">
                    TOTAL
                  </TableHead>
                  <TableHead className="font-bold border text-white">
                    GODOWN
                  </TableHead>
                  <TableHead className="font-bold border text-white">
                    FLOOR
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(kurti.sizes || []).map((sz: any, i: number) => (
                  <TableRow
                    key={i}
                    className={
                      getTotalQty(sz) > 0 && getFloorQty(sz) === 0
                        ? "bg-amber-100"
                        : ""
                    }
                  >
                    <TableCell className="border">
                      {String(sz.size).toUpperCase()}
                    </TableCell>
                    <TableCell className="border">{getTotalQty(sz)}</TableCell>
                    <TableCell className="border">{getGodownQty(sz)}</TableCell>
                    <TableCell className="border font-semibold">
                      {getFloorQty(sz)}
                    </TableCell>
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
          <p className="text-lg font-semibold">⬇️ Should be moved for sale</p>
          <PendingFloorMoves refreshKey={refreshKey} pageSize={10} compact />
        </div>
      </CardContent>
    </Card>
  );
}

const GodownStockHelp = () => {
  return (
    <>
      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
        <GodownStockPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.SELLER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default GodownStockHelp;
