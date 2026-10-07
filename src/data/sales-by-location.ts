import { db } from "@/src/lib/db";
import {
  STOCK_LOCATIONS,
  StockLocation,
  isHallSellType,
  isStockLocation,
  locationForShopId,
} from "@/src/lib/godown";

/**
 * Sales grouped by who sold them - a counter (1st floor, 2nd floor, Shop 316,
 * Godown), HALL or ONLINE - with the stock location each piece came from kept as
 * a separate breakdown. An online order picked from the 1st floor lowers 1st-floor
 * stock but is reported as an online sale, not a 1st-floor sale.
 *
 * Sources:
 *   - SHOP_BILL      OfflineSell (Sell Retailer / Hall Sales) - the shop's counter
 *                    sale, or HALL for hall bills (whose lines can come from any
 *                    location). Lines from before locations existed resolve by
 *                    the bill's shop.
 *   - SCAN           Sell (the /sell page). Counter sale, ONLINE when the
 *                    "Online order (WhatsApp)" box was ticked, or HALL when the
 *                    "Hall sale" box was ticked.
 *   - ORDER_BILL     OnlineSell (bills made from /orders) - always ONLINE.
 *   - CUSTOMER_ORDER CustomerOrder accepted with per-line locations - always
 *                    ONLINE. The order value is split over its pieces, so a
 *                    line's amount is an average when an order mixes prices.
 *
 * Times are stored IST-shifted across the app, so a YYYY-MM-DD day is matched as
 * a UTC day, the same way getSellingHistoryFiltered does it.
 */

export type SaleChannel = "SHOP_BILL" | "SCAN" | "ORDER_BILL" | "CUSTOMER_ORDER";
export type ReportLocation = StockLocation | "UNRECORDED";
export type SoldBy = StockLocation | "HALL" | "ONLINE" | "UNRECORDED";

export const SALE_CHANNELS: SaleChannel[] = ["SHOP_BILL", "SCAN", "ORDER_BILL", "CUSTOMER_ORDER"];
export const REPORT_LOCATIONS: ReportLocation[] = [...STOCK_LOCATIONS, "UNRECORDED"];
export const SOLD_BY: SoldBy[] = [...STOCK_LOCATIONS, "HALL", "ONLINE", "UNRECORDED"];

export interface LocationSaleRow {
  soldBy: SoldBy;
  stockFrom: ReportLocation;
  channel: SaleChannel;
  soldAt: Date;
  code: string;
  size: string;
  category: string;
  quantity: number;
  amount: number;
  reference: string;
}

interface RangeArgs {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

const asLocation = (val: any): ReportLocation => (isStockLocation(val) ? val : "UNRECORDED");

const collectRows = async ({ from, to }: RangeArgs): Promise<LocationSaleRow[]> => {
  const range = {
    gte: new Date(`${from}T00:00:00.000Z`),
    lte: new Date(`${to}T23:59:59.999Z`),
  };

  const [shopSales, scanSales, orderSales, customerOrders] = await Promise.all([
    db.offlineSell.findMany({
      where: { sellTime: range },
      select: {
        sellTime: true,
        code: true,
        kurtiSize: true,
        quantity: true,
        selledPrice: true,
        stockLocation: true,
        batch: { select: { shopId: true, invoiceNumber: true, batchNumber: true, sellType: true } },
      },
    }),
    db.sell.findMany({
      where: { sellTime: range },
      select: {
        sellTime: true,
        code: true,
        kurtiSize: true,
        quantity: true,
        selledPrice: true,
        stockLocation: true,
        isOnlineOrder: true,
        isHallSale: true,
        sellerName: true,
      },
    }),
    db.onlineSell.findMany({
      where: { sellTime: range },
      select: {
        sellTime: true,
        code: true,
        kurtiSize: true,
        quantity: true,
        selledPrice: true,
        stockLocation: true,
        batch: { select: { invoiceNumber: true, orderId: true } },
      },
    }),
    db.customerOrder.findMany({
      where: { acceptedAt: range },
      select: {
        orderId: true,
        acceptedAt: true,
        total: true,
        shippingCharge: true,
        stockLocations: true,
        cart: {
          select: {
            CartProduct: {
              select: { adminSideSizes: true, kurti: { select: { code: true } } },
            },
          },
        },
      },
    }),
  ]);

  // Every product's category (for the category breakdown) and selling price
  // (scan sales usually carry no price). Reading every product once is far
  // faster than a huge `code in [...]` filter.
  const priceByCode = new Map<string, number>();
  const categoryByCode = new Map<string, string>();
  const kurtis = await db.kurti.findMany({
    select: { code: true, sellingPrice: true, category: true },
  });
  kurtis.forEach((k) => {
    const code = k.code.toUpperCase();
    priceByCode.set(code, parseInt(k.sellingPrice) || 0);
    categoryByCode.set(code, String(k.category || "").toUpperCase());
  });

  const rows: Omit<LocationSaleRow, "category">[] = [];

  for (const s of shopSales) {
    const qty = s.quantity || 1;
    const from = isStockLocation(s.stockLocation)
      ? s.stockLocation
      : asLocation(locationForShopId(s.batch?.shopId));
    // A hall bill is a hall sale wherever its pieces came from; other bills are
    // their shop's counter sale.
    rows.push({
      soldBy: isHallSellType(s.batch?.sellType)
        ? "HALL"
        : locationForShopId(s.batch?.shopId) || from,
      stockFrom: from,
      channel: "SHOP_BILL",
      soldAt: s.sellTime,
      code: s.code,
      size: s.kurtiSize,
      quantity: qty,
      amount: (s.selledPrice || 0) * qty,
      reference: s.batch?.invoiceNumber ? `Bill #${s.batch.invoiceNumber}` : s.batch?.batchNumber || "",
    });
  }

  for (const s of scanSales) {
    const qty = s.quantity || 1;
    const unit = s.selledPrice || priceByCode.get(s.code.toUpperCase()) || 0;
    const from = asLocation(s.stockLocation);
    rows.push({
      soldBy: s.isOnlineOrder ? "ONLINE" : s.isHallSale ? "HALL" : from,
      stockFrom: from,
      channel: "SCAN",
      soldAt: s.sellTime,
      code: s.code,
      size: s.kurtiSize,
      quantity: qty,
      amount: unit * qty,
      reference: s.sellerName || "",
    });
  }

  for (const s of orderSales) {
    const qty = s.quantity || 1;
    rows.push({
      soldBy: "ONLINE",
      stockFrom: asLocation(s.stockLocation),
      channel: "ORDER_BILL",
      soldAt: s.sellTime,
      code: s.code,
      size: s.kurtiSize,
      quantity: qty,
      amount: (s.selledPrice || 0) * qty,
      reference: s.batch?.orderId
        ? `Order ${s.batch.orderId}`
        : s.batch?.invoiceNumber
          ? `Invoice #${s.batch.invoiceNumber}`
          : "",
    });
  }

  for (const o of customerOrders) {
    const picks = (o.stockLocations || {}) as Record<string, string>;
    const lines: { code: string; size: string; quantity: number }[] = [];
    for (const cp of o.cart?.CartProduct || []) {
      for (const s of (cp.adminSideSizes || []) as any[]) {
        if (!s?.size || !(s.quantity > 0)) continue;
        lines.push({ code: cp.kurti.code, size: String(s.size).toUpperCase(), quantity: s.quantity });
      }
    }
    const pieces = lines.reduce((sum, l) => sum + l.quantity, 0);
    const goods = Math.max(0, (o.total || 0) - (o.shippingCharge || 0));
    for (const l of lines) {
      rows.push({
        soldBy: "ONLINE",
        stockFrom: asLocation(picks[`${l.code}|${l.size}`.toUpperCase()]),
        channel: "CUSTOMER_ORDER",
        soldAt: o.acceptedAt!,
        code: l.code,
        size: l.size,
        quantity: l.quantity,
        amount: pieces ? Math.round((goods * l.quantity) / pieces) : 0,
        reference: `Order ${o.orderId}`,
      });
    }
  }

  // A code no longer in Kurti (rare) falls back to its 3-letter category prefix.
  return rows.map((r) => ({
    ...r,
    category: categoryByCode.get(r.code.toUpperCase()) || r.code.substring(0, 3).toUpperCase(),
  }));
};

type Totals = { pieces: number; amount: number };
const emptyTotals = (): Totals => ({ pieces: 0, amount: 0 });

export const getSalesByLocation = async (args: RangeArgs) => {
  const rows = await collectRows(args);

  const summary = SOLD_BY.map((soldBy) => {
    const byChannel = Object.fromEntries(
      SALE_CHANNELS.map((c) => [c, emptyTotals()])
    ) as Record<SaleChannel, Totals>;
    const stockFrom = Object.fromEntries(
      REPORT_LOCATIONS.map((l) => [l, 0])
    ) as Record<ReportLocation, number>;
    const total = emptyTotals();
    for (const r of rows) {
      if (r.soldBy !== soldBy) continue;
      byChannel[r.channel].pieces += r.quantity;
      byChannel[r.channel].amount += r.amount;
      stockFrom[r.stockFrom] += r.quantity;
      total.pieces += r.quantity;
      total.amount += r.amount;
    }
    return { soldBy, byChannel, stockFrom, ...total };
  });

  return {
    from: args.from,
    to: args.to,
    summary,
    pieces: rows.reduce((sum, r) => sum + r.quantity, 0),
    amount: rows.reduce((sum, r) => sum + r.amount, 0),
  };
};

/** The individual sales behind one cell of the report, newest first. */
export const getSalesByLocationItems = async (
  args: RangeArgs & { soldBy: SoldBy; channel?: SaleChannel }
) => {
  const rows = await collectRows(args);
  return rows
    .filter((r) => r.soldBy === args.soldBy && (!args.channel || r.channel === args.channel))
    .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime());
};
