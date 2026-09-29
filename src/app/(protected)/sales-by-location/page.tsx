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
import { LOCATION_LABELS } from "@/src/lib/godown";
import type {
  LocationSaleRow,
  ReportLocation,
  SaleChannel,
  SoldBy,
} from "@/src/data/sales-by-location";

const CHANNELS: SaleChannel[] = ["SHOP_BILL", "SCAN", "ORDER_BILL", "CUSTOMER_ORDER"];

const CHANNEL_LABELS: Record<SaleChannel, string> = {
  SHOP_BILL: "Shop bills",
  SCAN: "Scan sales (/sell)",
  ORDER_BILL: "Order bills",
  CUSTOMER_ORDER: "Customer orders",
};

const placeLabel = (p: SoldBy | ReportLocation) =>
  p === "UNRECORDED" ? "Not recorded" : p === "ONLINE" ? "Online" : LOCATION_LABELS[p];

type Totals = { pieces: number; amount: number };
interface SummaryRow extends Totals {
  soldBy: SoldBy;
  byChannel: Record<SaleChannel, Totals>;
  stockFrom: Record<ReportLocation, number>;
}
interface Report extends Totals {
  summary: SummaryRow[];
}

const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Today in IST as YYYY-MM-DD, shifted by `days`. */
const istDay = (days = 0) =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000 + days * 86400000).toISOString().slice(0, 10);

function Cell({
  totals,
  onOpen,
  bold,
}: {
  totals: Totals;
  onOpen: () => void;
  bold?: boolean;
}) {
  if (!totals.pieces) return <span className="text-gray-400">-</span>;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`text-left hover:underline text-blue-700 ${bold ? "font-bold" : ""}`}
    >
      {totals.pieces} pcs
      <span className="block text-xs text-gray-600">{rupees(totals.amount)}</span>
    </button>
  );
}

/** "1st Floor 12 · Godown 30" - only for rows whose stock came from elsewhere. */
const stockFromText = (r: SummaryRow) =>
  (Object.entries(r.stockFrom) as [ReportLocation, number][])
    .filter(([, n]) => n > 0)
    .map(([loc, n]) => `${placeLabel(loc)} ${n}`)
    .join(" · ");

function SalesByLocationPage() {
  const [from, setFrom] = useState(istDay(-6));
  const [to, setTo] = useState(istDay());
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    soldBy: SoldBy;
    channel?: SaleChannel;
    rows: LocationSaleRow[];
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDetail(null);
      const res = await fetch(`/api/reports/sales-by-location?from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setReport(json.data);
    } catch (e: any) {
      setError(e.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
    // Load once on open; later loads come from the Show button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (soldBy: SoldBy, channel?: SaleChannel) => {
    try {
      setDetailLoading(true);
      const params = new URLSearchParams({ from, to, soldBy });
      if (channel) params.set("channel", channel);
      const res = await fetch(`/api/reports/sales-by-location?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load");
      setDetail({ soldBy, channel, rows: json.data || [] });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const channelTotal = (c: SaleChannel): Totals =>
    (report?.summary || []).reduce(
      (t, r) => ({
        pieces: t.pieces + r.byChannel[c].pieces,
        amount: t.amount + r.byChannel[c].amount,
      }),
      { pieces: 0, amount: 0 }
    );

  return (
    <Card className="w-full h-full rounded-none">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">📍 Sales by Location</p>
        <p className="text-sm text-center text-gray-600">
          Counter sales of the 1st Floor, 2nd Floor and Shop 316, and online sales -
          with where the online pieces were taken from.
        </p>
      </CardHeader>
      <CardContent className="w-full flex flex-col gap-4">
        <div className="flex flex-row flex-wrap items-end gap-2">
          <div className="flex flex-col">
            <span className="text-sm font-semibold">From</span>
            <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">To</span>
            <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
            Show
          </Button>
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        {report && (
          <div className="overflow-x-auto">
            <Table className="border border-collapse">
              <TableHeader>
                <TableRow className="bg-slate-800">
                  <TableHead className="font-bold border text-white">Sold by</TableHead>
                  {CHANNELS.map((c) => (
                    <TableHead key={c} className="font-bold border text-white">
                      {CHANNEL_LABELS[c]}
                    </TableHead>
                  ))}
                  <TableHead className="font-bold border text-white">Total</TableHead>
                  <TableHead className="font-bold border text-white">Stock taken from</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.summary
                  .filter((r) => r.soldBy !== "UNRECORDED" || r.pieces > 0)
                  .map((r) => (
                    <TableRow
                      key={r.soldBy}
                      className={
                        r.soldBy === "ONLINE"
                          ? "bg-blue-50"
                          : r.soldBy === "UNRECORDED"
                            ? "bg-amber-50"
                            : ""
                      }
                    >
                      <TableCell className="border font-semibold">
                        {placeLabel(r.soldBy)}
                        {r.soldBy !== "ONLINE" && r.soldBy !== "UNRECORDED" && (
                          <span className="block text-xs font-normal text-gray-500">counter</span>
                        )}
                      </TableCell>
                      {CHANNELS.map((c) => (
                        <TableCell key={c} className="border">
                          <Cell totals={r.byChannel[c]} onOpen={() => openDetail(r.soldBy, c)} />
                        </TableCell>
                      ))}
                      <TableCell className="border">
                        <Cell totals={r} bold onOpen={() => openDetail(r.soldBy)} />
                      </TableCell>
                      <TableCell className="border text-xs">
                        {r.soldBy === "ONLINE" ? stockFromText(r) || "-" : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="bg-slate-100">
                  <TableCell className="border font-bold">Total</TableCell>
                  {CHANNELS.map((c) => {
                    const t = channelTotal(c);
                    return (
                      <TableCell key={c} className="border font-semibold">
                        {t.pieces ? (
                          <>
                            {t.pieces} pcs
                            <span className="block text-xs text-gray-600">{rupees(t.amount)}</span>
                          </>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="border font-bold">
                    {report.pieces} pcs
                    <span className="block text-xs text-gray-600">{rupees(report.amount)}</span>
                  </TableCell>
                  <TableCell className="border" />
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-gray-600 mt-2">
              Online = /sell scans with &quot;Online order (WhatsApp)&quot; ticked, order bills
              and customer orders. &quot;Not recorded&quot; = scan sales made before locations
              were saved. Old shop bills are placed by the bill&apos;s shop. Customer-order
              amounts are the order value split across its pieces.
            </p>
          </div>
        )}

        {detailLoading && (
          <span className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading sales...
          </span>
        )}

        {detail && !detailLoading && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">
                {placeLabel(detail.soldBy)}
                {detail.channel ? ` · ${CHANNEL_LABELS[detail.channel]}` : ""} ·{" "}
                {detail.rows.length} sale line(s)
              </p>
              <Button type="button" variant={"outline" as any} onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table className="border border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">When</TableHead>
                    <TableHead className="font-bold">Code</TableHead>
                    <TableHead className="font-bold">Size</TableHead>
                    <TableHead className="font-bold">Qty</TableHead>
                    <TableHead className="font-bold">Amount</TableHead>
                    <TableHead className="font-bold">Taken from</TableHead>
                    <TableHead className="font-bold">Type</TableHead>
                    <TableHead className="font-bold">Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {/* Stored IST-shifted, so read it back as UTC */}
                        {new Date(r.soldAt).toLocaleString("en-IN", { timeZone: "UTC" })}
                      </TableCell>
                      <TableCell className="font-semibold">{r.code}</TableCell>
                      <TableCell>{r.size}</TableCell>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{rupees(r.amount)}</TableCell>
                      <TableCell className="text-xs">{placeLabel(r.stockFrom)}</TableCell>
                      <TableCell className="text-xs">{CHANNEL_LABELS[r.channel]}</TableCell>
                      <TableCell className="text-xs">{r.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SalesByLocationHelp = () => (
  <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
    <SalesByLocationPage />
  </RoleGateForComponent>
);

export default SalesByLocationHelp;
