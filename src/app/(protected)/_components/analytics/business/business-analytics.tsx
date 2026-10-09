"use client";

import { ReactNode, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { UserRole } from "@prisma/client";
import { HashLoader } from "react-spinners";
import { Card, CardContent } from "@/src/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { LOCATION_LABELS } from "@/src/lib/godown";
import { BarList, TrendChart, inr, num } from "./charts";
import DayAnalytics from "../dayAnalytics";
import MonthAnalytics from "../monthAnalytics";
import TopSoldKurti from "../topSoldKurti";
import PartyWiseSales from "../partyWiseCount";
import TopMonthlySellingKurti from "../topMonthlySellingKurti";
import AvailableKurtiSizes from "../awailableKurtiSizes";
import KurtiReports from "../kurtiReports";
import KurtiOnlineReports from "../kurtiOnlineReports";

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const istToday = () => new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10);
const shift = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86400000).toISOString().slice(0, 10);

const PRESETS: { key: string; label: string; range: () => [string, string] }[] = [
  { key: "today", label: "Today", range: () => [istToday(), istToday()] },
  { key: "yesterday", label: "Yesterday", range: () => [shift(istToday(), -1), shift(istToday(), -1)] },
  { key: "7d", label: "Last 7 days", range: () => [shift(istToday(), -6), istToday()] },
  { key: "month", label: "This month", range: () => [`${istToday().slice(0, 8)}01`, istToday()] },
  {
    key: "lastMonth",
    label: "Last month",
    range: () => {
      const first = `${istToday().slice(0, 8)}01`;
      const lastDay = shift(first, -1);
      return [`${lastDay.slice(0, 8)}01`, lastDay];
    },
  },
  { key: "custom", label: "Custom", range: () => [istToday(), istToday()] },
];

const SOLD_BY_LABELS: Record<string, string> = {
  ...LOCATION_LABELS,
  HALL: "Hall",
  ONLINE: "Online",
  UNRECORDED: "Location not recorded",
};
const labelOf = (key: string) => SOLD_BY_LABELS[key] || key;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  TRACKINGPENDING: "Tracking pending",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

const shortDay = (day: string) =>
  new Date(`${day}T00:00:00.000Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

function useBusiness(tab: string, from: string, to: string, enabled = true) {
  return useQuery({
    queryKey: ["businessAnalytics", tab, from, to],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/business?tab=${tab}&from=${from}&to=${to}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      return json.data;
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-5">
        <h3 className="text-base font-semibold text-gray-800 mb-3">{title}</h3>
        {children}
      </CardContent>
    </Card>
  );
}

function Loading({ query }: { query: { isError: boolean; error: unknown } }) {
  if (query.isError) {
    return <p className="text-sm text-red-600">{(query.error as Error).message}</p>;
  }
  return (
    <div className="flex justify-center py-16">
      <HashLoader color="#36D7B7" size={35} />
    </div>
  );
}

function Kpi({
  label,
  value,
  current,
  previous,
  tone = "text-gray-900",
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  tone?: string;
}) {
  const change =
    previous && current !== undefined ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${tone}`}>{value}</p>
        {change !== null && (
          <p className={`text-xs mt-1 ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% vs previous period
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DesignTable({
  rows,
  columns,
}: {
  rows: any[];
  columns: { header: string; cell: (row: any) => ReactNode }[];
}) {
  if (!rows.length) return <p className="text-sm text-gray-500">Nothing to show.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="p-2">Design</th>
            {columns.map((c) => (
              <th key={c.header} className="p-2">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  {row.image ? (
                    <img src={row.image} alt={row.code} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100" />
                  )}
                  <span className="font-medium">{row.code}</span>
                </div>
              </td>
              {columns.map((c) => (
                <td key={c.header} className="p-2">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------------ tabs

function OverviewTab({ from, to, canSeeProfit }: { from: string; to: string; canSeeProfit: boolean }) {
  const query = useBusiness("overview", from, to);
  const d = query.data;
  // keepPreviousData would otherwise show the old range while the new one loads.
  if (!d || query.isPlaceholderData || query.isError) return <Loading query={query} />;
  const k = d.kpis;
  const p = d.previousKpis;
  const totalSales = d.soldBy.reduce((sum: number, r: any) => sum + r.sales, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Sales" value={inr(k.sales)} current={k.sales} previous={p.sales} tone="text-blue-600" />
        {canSeeProfit && (
          <Kpi
            label={`Profit · ${k.margin}% margin`}
            value={inr(k.profit)}
            current={k.profit}
            previous={p.profit}
            tone="text-green-600"
          />
        )}
        <Kpi label="Pieces sold" value={num(k.pieces)} current={k.pieces} previous={p.pieces} />
        <Kpi label="Bills" value={num(k.bills)} current={k.bills} previous={p.bills} />
        <Kpi label="Average bill" value={inr(k.avgBill)} current={k.avgBill} previous={p.avgBill} />
        <Kpi label="Average per piece" value={inr(k.avgPiece)} current={k.avgPiece} previous={p.avgPiece} />
        <Kpi label="Online sales" value={inr(d.channels.online.sales)} />
        <Kpi label="Offline sales" value={inr(d.channels.offline.sales)} />
      </div>

      <Section title="Sales trend (dashed = previous period)">
        <TrendChart
          data={d.trend.map((t: any) => ({ label: shortDay(t.date), value: t.sales, compare: t.prevSales }))}
        />
        <p className="text-xs text-gray-500 mt-2">
          {d.bestDay && <>Best day {shortDay(d.bestDay.date)} ({inr(d.bestDay.sales)}). </>}
          {d.worstDay && <>Weakest day {shortDay(d.worstDay.date)} ({inr(d.worstDay.sales)}).</>}
        </p>
      </Section>

      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Sold by (counter / hall / online)">
          <BarList
            rows={d.soldBy
              .filter((r: any) => r.pieces > 0)
              .map((r: any) => ({
                label: labelOf(r.name),
                value: r.sales,
                note: `${num(r.pieces)} pcs${
                  canSeeProfit ? ` · profit ${inr(r.profit)}` : ""
                }${totalSales ? ` · ${Math.round((r.sales / totalSales) * 100)}%` : ""}`,
              }))}
          />
        </Section>
        <Section title="Payment mix">
          <BarList
            color="bg-emerald-500"
            rows={d.payments.map((r: any) => ({
              label: r.name,
              value: r.sales,
              note: `${num(r.bills)} bills`,
            }))}
          />
        </Section>
      </div>

      <Section title="Which weekday sells most">
        <BarList
          color="bg-violet-500"
          rows={d.weekday.map((r: any) => ({ label: r.day, value: r.sales, note: `${num(r.pieces)} pcs` }))}
        />
      </Section>
    </div>
  );
}

function ProductsTab({ from, to, canSeeProfit }: { from: string; to: string; canSeeProfit: boolean }) {
  const query = useBusiness("products", from, to);
  const d = query.data;
  // keepPreviousData would otherwise show the old range while the new one loads.
  if (!d || query.isPlaceholderData || query.isError) return <Loading query={query} />;

  const list = (rows: any[]) =>
    rows.map((r) => ({
      label: r.name,
      value: r.sales,
      note: `${num(r.pieces)} pcs${canSeeProfit ? ` · profit ${inr(r.profit)}` : ""}`,
    }));

  return (
    <div className="space-y-4">
      <Section title="Top 10 designs (by pieces)">
        <DesignTable
          rows={d.topDesigns}
          columns={[
            { header: "Category", cell: (r) => r.category },
            { header: "Party", cell: (r) => r.party },
            { header: "Pieces", cell: (r) => num(r.pieces) },
            { header: "Sales", cell: (r) => inr(r.sales) },
            ...(canSeeProfit ? [{ header: "Profit", cell: (r: any) => inr(r.profit) }] : []),
          ]}
        />
      </Section>
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Category-wise sales">
          <BarList rows={list(d.categories)} />
        </Section>
        <Section title="Party-wise sales">
          <BarList color="bg-amber-500" rows={list(d.parties)} />
        </Section>
      </div>
      <Section title="Size-wise sales">
        <BarList color="bg-violet-500" rows={list(d.sizes)} />
      </Section>
    </div>
  );
}

function StockTab({ from, to, canSeeProfit }: { from: string; to: string; canSeeProfit: boolean }) {
  const query = useBusiness("stock", from, to);
  const d = query.data;
  // keepPreviousData would otherwise show the old range while the new one loads.
  if (!d || query.isPlaceholderData || query.isError) return <Loading query={query} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {d.locations.map((l: any) => (
          <Card key={l.location} className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">{labelOf(l.location)}</p>
              <p className="text-2xl font-semibold mt-1">{num(l.pieces)} pcs</p>
              <p className="text-xs text-gray-500 mt-1">
                Worth {inr(l.sellValue)}
                {canSeeProfit && <> · cost {inr(l.costValue)}</>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-sm text-gray-600">Total stock: {num(d.totalPieces)} pieces.</p>

      <Section title={`Fast sellers running low (under ${d.lowStockCoverDays} days of stock)`}>
        <DesignTable
          rows={d.lowStock}
          columns={[
            { header: "Left", cell: (r) => num(r.remaining) },
            { header: "Sold (30 days)", cell: (r) => num(r.sold30) },
            { header: "Days left", cell: (r) => r.coverDays },
          ]}
        />
      </Section>

      <Section title={`Dead stock - no sale in ${d.deadStock.days} days`}>
        <p className="text-sm text-gray-600 mb-3">
          {num(d.deadStock.designs)} designs · {num(d.deadStock.pieces)} pieces · selling value{" "}
          {inr(d.deadStock.sellValue)}
          {canSeeProfit && <> · cost {inr(d.deadStock.costValue)}</>}
        </p>
        <DesignTable
          rows={d.deadStock.top}
          columns={[
            { header: "Category", cell: (r) => r.category },
            { header: "Pieces", cell: (r) => num(r.pieces) },
            { header: "Selling value", cell: (r) => inr(r.sellValue) },
          ]}
        />
      </Section>

      <Section title="In the godown but not on any floor">
        <p className="text-sm text-gray-600 mb-3">
          {num(d.godownNotOnFloor.designs)} designs · {num(d.godownNotOnFloor.pieces)} pieces waiting to be
          moved
        </p>
        <DesignTable
          rows={d.godownNotOnFloor.top}
          columns={[{ header: "Pieces in godown", cell: (r) => num(r.pieces) }]}
        />
      </Section>

      <Section title={`Stock added in this period - ${num(d.added.pieces)} pieces`}>
        <div className="grid lg:grid-cols-2 gap-4">
          <BarList
            color="bg-emerald-500"
            format={(v) => `${num(v)} pcs`}
            rows={d.added.byParty.map((r: any) => ({ label: r.name, value: r.pieces }))}
          />
          <BarList
            color="bg-amber-500"
            format={(v) => `${num(v)} pcs`}
            rows={d.added.byLocation.map((r: any) => ({
              label: r.name === "BEFORE_LOCATIONS" ? "Location not recorded" : labelOf(r.name),
              value: r.pieces,
            }))}
          />
        </div>
      </Section>
    </div>
  );
}

function MoneyTab({ from, to }: { from: string; to: string }) {
  const query = useBusiness("money", from, to);
  const d = query.data;
  // keepPreviousData would otherwise show the old range while the new one loads.
  if (!d || query.isPlaceholderData || query.isError) return <Loading query={query} />;
  const pending = d.pending;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Sales" value={inr(d.sales)} tone="text-blue-600" />
        <Kpi label="Gross profit" value={inr(d.grossProfit)} tone="text-green-600" />
        <Kpi label="Expenses" value={inr(d.expenses.total)} tone="text-red-600" />
        <Kpi
          label="Net profit"
          value={inr(d.netProfit)}
          tone={d.netProfit >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <Section title="Expenses by reason">
          <BarList color="bg-red-400" rows={d.expensesByReason.map((r: any) => ({ label: r.name, value: r.amount }))} />
          {d.expenses.unpaid > 0 && (
            <p className="text-xs text-gray-500 mt-3">{inr(d.expenses.unpaid)} of these expenses is still unpaid.</p>
          )}
        </Section>
        <Section title="Payments still pending">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between">
              <span>Shop bills ({num(pending.shopBills.count)})</span>
              <span>{inr(pending.shopBills.amount)}</span>
            </li>
            <li className="flex justify-between">
              <span>Order bills ({num(pending.orderBills.count)})</span>
              <span>{inr(pending.orderBills.amount)}</span>
            </li>
            <li className="flex justify-between">
              <span>Customer orders ({num(pending.customerOrders.count)})</span>
              <span>{inr(pending.customerOrders.amount)}</span>
            </li>
          </ul>
          <h4 className="text-sm font-semibold mt-4 mb-2">Wallet</h4>
          {d.wallet.length === 0 ? (
            <p className="text-sm text-gray-500">No wallet activity.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {d.wallet.map((w: any) => (
                <li key={w.type} className="flex justify-between">
                  <span>
                    {w.type === "CREDIT" ? "Credited" : "Debited"} ({num(w.count)})
                  </span>
                  <span>{inr(w.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function OnlineTab({ from, to }: { from: string; to: string }) {
  const query = useBusiness("online", from, to);
  const d = query.data;
  // keepPreviousData would otherwise show the old range while the new one loads.
  if (!d || query.isPlaceholderData || query.isError) return <Loading query={query} />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Orders placed" value={num(d.orders)} />
        <Kpi label="Order value" value={inr(d.value)} tone="text-blue-600" />
        <Kpi label="Payment pending" value={inr(d.pendingPaymentValue)} tone="text-amber-600" />
        <Kpi label="Cancelled / rejected" value={`${d.cancelRate}%`} tone="text-red-600" />
      </div>
      <Section title="Orders by status">
        <BarList
          format={num}
          rows={d.byStatus.map((s: any) => ({
            label: STATUS_LABELS[s.status] || s.status,
            value: s.orders,
            note: inr(s.amount),
          }))}
        />
        <p className="text-xs text-gray-500 mt-3">
          Shipping charges on live orders: {inr(d.shippingCharges)}.
        </p>
      </Section>
    </div>
  );
}

function Alerts({ from, to }: { from: string; to: string }) {
  const query = useBusiness("alerts", from, to);
  const alerts: { key: string; count: number; text: string }[] = query.data?.alerts || [];
  if (!alerts.length) return null;
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="font-semibold text-amber-900 mb-2">Needs attention</p>
      <ul className="text-sm text-amber-900 space-y-1">
        {alerts.map((a) => (
          <li key={a.key}>
            <span className="font-semibold">{num(a.count)}</span> {a.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------ page

export default function BusinessAnalytics() {
  const user = useCurrentUser();
  const canSeeProfit = user?.role === UserRole.ADMIN;
  const [preset, setPreset] = useState("month");
  const [custom, setCustom] = useState<[string, string]>([istToday(), istToday()]);

  const [from, to] = useMemo<[string, string]>(
    () => (preset === "custom" ? custom : PRESETS.find((p) => p.key === preset)!.range()),
    [preset, custom]
  );
  const validRange = from <= to;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold">Business Analytics</h2>
        <div className="flex flex-wrap items-end gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded border text-sm ${
                preset === p.key ? "bg-blue-600 text-white border-blue-600" : "bg-white hover:bg-gray-50"
              }`}
            >
              {p.label}
            </button>
          ))}
          {preset === "custom" && (
            <>
              <input
                type="date"
                value={custom[0]}
                onChange={(e) => setCustom([e.target.value, custom[1]])}
                className="border rounded px-2 py-1.5 text-sm"
              />
              <input
                type="date"
                value={custom[1]}
                onChange={(e) => setCustom([custom[0], e.target.value])}
                className="border rounded px-2 py-1.5 text-sm"
              />
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500">
        {shortDay(from)} to {shortDay(to)}
      </p>

      {!validRange ? (
        <p className="text-sm text-red-600">The start date must not be after the end date.</p>
      ) : (
        <>
          <Alerts from={from} to={to} />
          <Tabs defaultValue="overview">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              {canSeeProfit && <TabsTrigger value="money">Money</TabsTrigger>}
              <TabsTrigger value="online">Online orders</TabsTrigger>
              <TabsTrigger value="reports">Detailed reports</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewTab from={from} to={to} canSeeProfit={canSeeProfit} />
            </TabsContent>
            <TabsContent value="products">
              <ProductsTab from={from} to={to} canSeeProfit={canSeeProfit} />
            </TabsContent>
            <TabsContent value="stock">
              <StockTab from={from} to={to} canSeeProfit={canSeeProfit} />
            </TabsContent>
            {canSeeProfit && (
              <TabsContent value="money">
                <MoneyTab from={from} to={to} />
              </TabsContent>
            )}
            <TabsContent value="online">
              <OnlineTab from={from} to={to} />
            </TabsContent>
            <TabsContent value="reports">
              <div className="rounded-xl border">
                <DayAnalytics />
                <MonthAnalytics />
                <TopSoldKurti />
                <PartyWiseSales />
                <TopMonthlySellingKurti />
                <AvailableKurtiSizes />
                <KurtiReports />
                <KurtiOnlineReports />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
