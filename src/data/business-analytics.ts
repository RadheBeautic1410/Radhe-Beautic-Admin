import { db } from "@/src/lib/db";
import { collectRows, LocationSaleRow } from "@/src/data/sales-by-location";
import {
  STOCK_LOCATIONS,
  StockLocation,
  getGodownQty,
  getLocationQty,
  getTotalQty,
  needsFloorMove,
} from "@/src/lib/godown";

/**
 * Owner-level business numbers for /analytics. Every sales figure comes from
 * `collectRows` (scans, shop bills, order bills, customer orders), so it agrees
 * with the Sales by Location report. Sales are net of bill discounts; profit is
 * sales minus the products' current actual price.
 *
 * `canSeeProfit` is false for roles that must not see cost, profit or expenses;
 * those fields are then left out of the result.
 */

const IST_OFFSET = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_RANGE_DAYS = 366;

export const istToday = () => new Date(Date.now() + IST_OFFSET).toISOString().slice(0, 10);

const shiftDay = (day: string, days: number) =>
  new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);

export const daysInRange = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;

const eachDay = (from: string, to: string) =>
  Array.from({ length: daysInRange(from, to) }, (_, i) => shiftDay(from, i));

const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const utcRange = (from: string, to: string) => ({
  gte: new Date(`${from}T00:00:00.000Z`),
  lte: new Date(`${to}T23:59:59.999Z`),
});
/** For records stamped with the real clock (not IST-shifted). */
const istRange = (from: string, to: string) => ({
  gte: new Date(`${from}T00:00:00.000+05:30`),
  lte: new Date(`${to}T23:59:59.999+05:30`),
});

const net = (r: LocationSaleRow) => r.amount - r.discount;
const round1 = (n: number) => Math.round(n * 10) / 10;
const imageUrl = (images: any[] | undefined) => (images?.[0] as any)?.url || null;

const realSales = async (from: string, to: string) =>
  (await collectRows({ from, to })).filter((r) => !r.code.toUpperCase().startsWith("TES"));

type Group = { pieces: number; sales: number; profit: number };
const emptyGroup = (): Group => ({ pieces: 0, sales: 0, profit: 0 });

const groupRows = (rows: LocationSaleRow[], key: (r: LocationSaleRow) => string) => {
  const map = new Map<string, Group>();
  for (const r of rows) {
    const g = map.get(key(r)) || emptyGroup();
    g.pieces += r.quantity;
    g.sales += net(r);
    g.profit += net(r) - r.cost;
    map.set(key(r), g);
  }
  return map;
};

const hideProfit = <T extends Record<string, any>>(obj: T, canSeeProfit: boolean) => {
  if (canSeeProfit) return obj;
  const { profit, margin, ...rest } = obj;
  return rest;
};

const summarize = (rows: LocationSaleRow[]) => {
  let sales = 0;
  let profit = 0;
  let pieces = 0;
  const bills = new Set<string>();
  for (const r of rows) {
    sales += net(r);
    profit += net(r) - r.cost;
    pieces += r.quantity;
    bills.add(r.billId);
  }
  return {
    sales,
    profit,
    pieces,
    bills: bills.size,
    avgBill: bills.size ? Math.round(sales / bills.size) : 0,
    avgPiece: pieces ? Math.round(sales / pieces) : 0,
    margin: sales ? round1((profit / sales) * 100) : 0,
  };
};

// ---------------------------------------------------------------- Overview

export const getOverview = async (from: string, to: string, canSeeProfit: boolean) => {
  const length = daysInRange(from, to);
  const prevTo = shiftDay(from, -1);
  const prevFrom = shiftDay(from, -length);
  const [rows, prevRows] = await Promise.all([
    realSales(from, to),
    realSales(prevFrom, prevTo),
  ]);

  const byDay = groupRows(rows, (r) => dayOf(r.soldAt));
  const prevByDay = groupRows(prevRows, (r) => dayOf(r.soldAt));
  const trend = eachDay(from, to).map((date, i) => {
    const g = byDay.get(date) || emptyGroup();
    return hideProfit(
      {
        date,
        sales: g.sales,
        profit: g.profit,
        pieces: g.pieces,
        prevSales: prevByDay.get(shiftDay(prevFrom, i))?.sales || 0,
      },
      canSeeProfit
    );
  });

  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byWeekday = groupRows(rows, (r) => weekdayNames[r.soldAt.getUTCDay()]);
  const weekday = weekdayNames.map((day) => {
    const g = byWeekday.get(day) || emptyGroup();
    return { day, sales: g.sales, pieces: g.pieces };
  });

  const toList = (map: Map<string, Group>) =>
    [...map.entries()]
      .map(([name, g]) => hideProfit({ name, ...g }, canSeeProfit))
      .sort((a, b) => b.sales - a.sales);

  const billsByPayment = new Map<string, Set<string>>();
  for (const r of rows) {
    const key = (r.paymentType || "UNKNOWN").toUpperCase();
    if (!billsByPayment.has(key)) billsByPayment.set(key, new Set());
    billsByPayment.get(key)!.add(r.billId);
  }
  const payments = toList(groupRows(rows, (r) => (r.paymentType || "UNKNOWN").toUpperCase())).map(
    (p) => ({ ...p, bills: billsByPayment.get(p.name)?.size || 0 })
  );

  const online = rows.filter((r) => r.soldBy === "ONLINE");
  const offline = rows.filter((r) => r.soldBy !== "ONLINE");
  const best = [...byDay.entries()].sort((a, b) => b[1].sales - a[1].sales);

  return {
    from,
    to,
    previous: { from: prevFrom, to: prevTo },
    kpis: hideProfit(summarize(rows), canSeeProfit),
    previousKpis: hideProfit(summarize(prevRows), canSeeProfit),
    trend,
    weekday,
    soldBy: toList(groupRows(rows, (r) => r.soldBy)),
    payments,
    channels: {
      online: { pieces: summarize(online).pieces, sales: summarize(online).sales },
      offline: { pieces: summarize(offline).pieces, sales: summarize(offline).sales },
    },
    bestDay: best[0] ? { date: best[0][0], sales: best[0][1].sales } : null,
    worstDay: best.length > 1 ? { date: best[best.length - 1][0], sales: best[best.length - 1][1].sales } : null,
  };
};

// ---------------------------------------------------------------- Products

export const getProducts = async (from: string, to: string, canSeeProfit: boolean) => {
  const rows = await realSales(from, to);

  const byCode = groupRows(rows, (r) => r.code);
  const topCodes = [...byCode.entries()].sort((a, b) => b[1].pieces - a[1].pieces).slice(0, 10);
  const kurtis = await db.kurti.findMany({
    where: { code: { in: topCodes.map(([code]) => code) } },
    select: { code: true, images: true, category: true, party: true },
  });
  const info = new Map(kurtis.map((k) => [k.code, k]));

  const toList = (map: Map<string, Group>, limit = 30) =>
    [...map.entries()]
      .map(([name, g]) => hideProfit({ name, ...g }, canSeeProfit))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);

  return {
    from,
    to,
    topDesigns: topCodes.map(([code, g]) =>
      hideProfit(
        {
          code,
          ...g,
          image: imageUrl(info.get(code)?.images),
          category: info.get(code)?.category || "",
          party: info.get(code)?.party || "",
        },
        canSeeProfit
      )
    ),
    categories: toList(groupRows(rows, (r) => r.category || "UNKNOWN")),
    parties: toList(groupRows(rows, (r) => r.party)),
    sizes: toList(groupRows(rows, (r) => String(r.size || "").toUpperCase() || "—"), 20),
  };
};

// ---------------------------------------------------------------- Stock

const LOW_STOCK_COVER_DAYS = 10;
const DEAD_STOCK_DAYS = 60;

const loadStockSnapshot = async () => {
  const kurtis = await db.kurti.findMany({
    where: { isDeleted: false, code: { not: { startsWith: "TES" } } },
    select: {
      code: true,
      category: true,
      party: true,
      sellingPrice: true,
      actualPrice: true,
      sizes: true,
      images: true,
    },
  });
  return kurtis.map((k) => {
    const sizes = (k.sizes || []) as any[];
    const perLocation = Object.fromEntries(
      STOCK_LOCATIONS.map((loc) => [loc, sizes.reduce((sum, s) => sum + getLocationQty(s, loc), 0)])
    ) as Record<StockLocation, number>;
    return {
      code: k.code,
      category: k.category,
      party: k.party,
      image: imageUrl(k.images),
      cost: parseInt(k.actualPrice) || 0,
      price: parseInt(k.sellingPrice) || 0,
      total: sizes.reduce((sum, s) => sum + getTotalQty(s), 0),
      perLocation,
      godownNotOnFloor: sizes.filter(needsFloorMove).reduce((sum, s) => sum + getGodownQty(s), 0),
    };
  });
};

export const getStock = async (from: string, to: string, canSeeProfit: boolean) => {
  const today = istToday();
  const [stock, recentRows, additions] = await Promise.all([
    loadStockSnapshot(),
    realSales(shiftDay(today, -(DEAD_STOCK_DAYS - 1)), today),
    db.stockAddition.findMany({
      where: { createdAt: istRange(from, to) },
      select: { code: true, quantity: true, location: true },
    }),
  ]);

  const locations = STOCK_LOCATIONS.map((loc) => {
    let pieces = 0;
    let costValue = 0;
    let sellValue = 0;
    for (const k of stock) {
      pieces += k.perLocation[loc];
      costValue += k.perLocation[loc] * k.cost;
      sellValue += k.perLocation[loc] * k.price;
    }
    return canSeeProfit ? { location: loc, pieces, costValue, sellValue } : { location: loc, pieces, sellValue };
  });

  const since30 = shiftDay(today, -29);
  const sold30 = new Map<string, number>();
  const lastSold = new Set<string>();
  for (const r of recentRows) {
    lastSold.add(r.code);
    if (dayOf(r.soldAt) >= since30) sold30.set(r.code, (sold30.get(r.code) || 0) + r.quantity);
  }

  const lowStock = stock
    .filter((k) => k.total > 0 && (sold30.get(k.code) || 0) >= 3)
    .map((k) => {
      const sold = sold30.get(k.code) || 0;
      return { code: k.code, image: k.image, remaining: k.total, sold30: sold, coverDays: round1((k.total / sold) * 30) };
    })
    .filter((k) => k.coverDays <= LOW_STOCK_COVER_DAYS)
    .sort((a, b) => a.coverDays - b.coverDays)
    .slice(0, 20);

  // Stock added in the last 60 days is not "dead" yet, whatever it has sold.
  const recentlyAdded = new Set(
    (
      await db.stockAddition.findMany({
        where: { createdAt: istRange(shiftDay(today, -(DEAD_STOCK_DAYS - 1)), today) },
        select: { code: true },
      })
    ).map((a) => a.code)
  );
  const dead = stock
    .filter((k) => k.total > 0 && !lastSold.has(k.code) && !recentlyAdded.has(k.code))
    .map((k) => ({
      code: k.code,
      image: k.image,
      category: k.category,
      pieces: k.total,
      costValue: k.total * k.cost,
      sellValue: k.total * k.price,
    }))
    .sort((a, b) => b.costValue - a.costValue);

  const pendingFloor = stock
    .filter((k) => k.godownNotOnFloor > 0)
    .sort((a, b) => b.godownNotOnFloor - a.godownNotOnFloor);

  const partyOf = new Map(stock.map((k) => [k.code, k.party]));
  const addedByParty = new Map<string, number>();
  const addedByLocation = new Map<string, number>();
  let addedPieces = 0;
  for (const a of additions) {
    addedPieces += a.quantity;
    const party = partyOf.get(a.code) || "Unknown";
    addedByParty.set(party, (addedByParty.get(party) || 0) + a.quantity);
    const loc = a.location || "BEFORE_LOCATIONS";
    addedByLocation.set(loc, (addedByLocation.get(loc) || 0) + a.quantity);
  }
  const toList = (m: Map<string, number>) =>
    [...m.entries()].map(([name, pieces]) => ({ name, pieces })).sort((a, b) => b.pieces - a.pieces);

  const stripCost = <T extends Record<string, any>>(o: T) => {
    if (canSeeProfit) return o;
    const { costValue, ...rest } = o;
    return rest;
  };

  return {
    from,
    to,
    totalPieces: stock.reduce((sum, k) => sum + k.total, 0),
    locations,
    lowStock,
    lowStockCoverDays: LOW_STOCK_COVER_DAYS,
    deadStock: {
      days: DEAD_STOCK_DAYS,
      designs: dead.length,
      pieces: dead.reduce((sum, k) => sum + k.pieces, 0),
      ...(canSeeProfit ? { costValue: dead.reduce((sum, k) => sum + k.costValue, 0) } : {}),
      sellValue: dead.reduce((sum, k) => sum + k.sellValue, 0),
      top: dead.slice(0, 20).map(stripCost),
    },
    godownNotOnFloor: {
      designs: pendingFloor.length,
      pieces: pendingFloor.reduce((sum, k) => sum + k.godownNotOnFloor, 0),
      top: pendingFloor
        .slice(0, 20)
        .map((k) => ({ code: k.code, image: k.image, pieces: k.godownNotOnFloor })),
    },
    added: { pieces: addedPieces, byParty: toList(addedByParty).slice(0, 15), byLocation: toList(addedByLocation) },
  };
};

// ---------------------------------------------------------------- Money

export const getMoney = async (from: string, to: string) => {
  const [rows, expenses, pendingShop, pendingOnline, pendingCustomer, wallet] = await Promise.all([
    realSales(from, to),
    db.expense.findMany({
      where: { date: utcRange(from, to) },
      select: { amount: true, isPaid: true, reason: { select: { name: true } } },
    }),
    db.offlineSellBatch.findMany({
      where: { saleTime: utcRange(from, to), paymentStatus: "PENDING" },
      select: { totalAmount: true },
    }),
    db.onlineSellBatch.findMany({
      where: { saleTime: utcRange(from, to), paymentStatus: "PENDING" },
      select: { totalAmount: true },
    }),
    db.customerOrder.findMany({
      where: {
        createdAt: istRange(from, to),
        paymentStatus: "PENDING",
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      select: { total: true },
    }),
    db.walletHistory.groupBy({
      by: ["type"],
      where: { createdAt: istRange(from, to) },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  const kpis = summarize(rows);
  const byReason = new Map<string, number>();
  let expenseTotal = 0;
  let expenseUnpaid = 0;
  for (const e of expenses) {
    expenseTotal += e.amount;
    if (!e.isPaid) expenseUnpaid += e.amount;
    const name = e.reason?.name || "Other";
    byReason.set(name, (byReason.get(name) || 0) + e.amount);
  }

  const sum = (list: { total?: number; totalAmount?: number }[]) =>
    list.reduce((s, x) => s + (x.total ?? x.totalAmount ?? 0), 0);

  return {
    from,
    to,
    sales: kpis.sales,
    grossProfit: kpis.profit,
    expenses: { total: expenseTotal, unpaid: expenseUnpaid, count: expenses.length },
    netProfit: kpis.profit - expenseTotal,
    expensesByReason: [...byReason.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount),
    pending: {
      shopBills: { count: pendingShop.length, amount: sum(pendingShop) },
      orderBills: { count: pendingOnline.length, amount: sum(pendingOnline) },
      customerOrders: { count: pendingCustomer.length, amount: sum(pendingCustomer) },
    },
    wallet: wallet.map((w) => ({ type: w.type, amount: w._sum.amount || 0, count: w._count._all })),
  };
};

// ---------------------------------------------------------------- Online orders

export const getOnline = async (from: string, to: string) => {
  const orders = await db.customerOrder.findMany({
    where: { createdAt: istRange(from, to) },
    select: { status: true, total: true, paymentStatus: true, shippingCharge: true },
  });

  const byStatus = new Map<string, { orders: number; amount: number }>();
  let pendingPayment = 0;
  let shipping = 0;
  let completedValue = 0;
  for (const o of orders) {
    const g = byStatus.get(o.status) || { orders: 0, amount: 0 };
    g.orders += 1;
    g.amount += o.total;
    byStatus.set(o.status, g);
    const cancelled = o.status === "CANCELLED" || o.status === "REJECTED";
    if (!cancelled) {
      shipping += o.shippingCharge;
      if (o.paymentStatus === "PENDING") pendingPayment += o.total;
      else completedValue += o.total;
    }
  }
  const cancelled = (byStatus.get("CANCELLED")?.orders || 0) + (byStatus.get("REJECTED")?.orders || 0);

  return {
    from,
    to,
    orders: orders.length,
    value: orders.reduce((sum, o) => sum + o.total, 0),
    paidValue: completedValue,
    pendingPaymentValue: pendingPayment,
    shippingCharges: shipping,
    cancelRate: orders.length ? round1((cancelled / orders.length) * 100) : 0,
    byStatus: [...byStatus.entries()].map(([status, g]) => ({ status, ...g })),
  };
};

// ---------------------------------------------------------------- Alerts

export const getAlerts = async (from: string, to: string, canSeeProfit: boolean) => {
  const today = istToday();
  const staleBefore = new Date(Date.now() - 2 * DAY_MS);
  const [rows, pendingShop, pendingOnline, staleOrders, stock] = await Promise.all([
    realSales(from, to),
    db.offlineSellBatch.count({ where: { saleTime: utcRange(from, to), paymentStatus: "PENDING" } }),
    db.onlineSellBatch.count({ where: { saleTime: utcRange(from, to), paymentStatus: "PENDING" } }),
    db.customerOrder.count({
      where: { status: { in: ["PENDING", "PROCESSING"] }, createdAt: { lt: staleBefore } },
    }),
    getStock(today, today, canSeeProfit),
  ]);

  const unrecorded = rows
    .filter((r) => r.stockFrom === "UNRECORDED")
    .reduce((sum, r) => sum + r.quantity, 0);

  const alerts = [
    { key: "pendingBills", count: pendingShop + pendingOnline, text: "bills with payment pending in this period" },
    { key: "staleOrders", count: staleOrders, text: "customer orders waiting more than 2 days (pending / processing)" },
    { key: "lowStock", count: stock.lowStock.length, text: `fast sellers with under ${stock.lowStockCoverDays} days of stock left` },
    { key: "notOnFloor", count: stock.godownNotOnFloor.designs, text: "designs still in the godown, not on any floor" },
    { key: "unrecorded", count: unrecorded, text: "pieces sold in this period with no stock location recorded" },
  ];
  return { alerts: alerts.filter((a) => a.count > 0) };
};
