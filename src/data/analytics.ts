"use server";

import { db } from "@/src/lib/db";
import { collectRows } from "@/src/data/sales-by-location";
import { STOCK_LOCATIONS, StockLocation, getLocationQty, getTotalQty } from "@/src/lib/godown";
import {
  addDays,
  endOfMonth,
  endOfYear,
  lastDayOfMonth,
  startOfMonth,
  startOfYear,
} from "date-fns";
// import { datetimeRegex } from "zod";

type filter = "DATE" | "MONTH" | "YEAR";
type month = {
  year: number;
  month: number;
};
const ISTOffset = 5.5 * 60 * 60 * 1000;

export const getCurrDate = async(date: Date) => {
    const customDate = new Date(date);
    const ISTTime = new Date(customDate.getTime() + ISTOffset).toISOString().slice(0, 10);

  return {
    start: ISTTime,
    end: ISTTime,
  };
};

export const getCurrMonth = async(date: month) => {
    const customDate = new Date(date.year, date.month, 1);
    const ISTTimeStart = new Date(startOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(endOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);

  return {
    start: ISTTimeStart,
    end: ISTTimeEnd,
  };
};

export const getCurrYear = async({year} : {year: number}) => {
    const ISTTimeStart = new Date(startOfMonth(addDays(new Date(year, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(startOfMonth(addDays(new Date(year+1, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);

  return {
    start: ISTTimeStart,
    end: ISTTimeEnd,
  };
};

const selectBasedOnFilter = (date: any, filter: filter) => {
  switch (filter) {
    case "DATE":
      return getCurrDate(date);
    case "MONTH":
      return getCurrMonth(date);
    case "YEAR":
      return getCurrYear(date);
    default:
      console.log("Invalid filter");
  }
};

/**
 * Sales for a day / month / year, from every channel that sells stock: scans on
 * /sell, shop bills, bills made from /orders and accepted customer orders. Test
 * codes (TES...) are left out. Profit uses the product's current actual price.
 */
const getSaleRowsFor = async (range: { start: string; end: string }) => {
  const rows = await collectRows({ from: range.start, to: range.end });
  return rows.filter((r) => !r.code.toUpperCase().startsWith("TES"));
};

export const getFilteredSales = async (date: any, filter: filter) => {
  const ISTTime = await selectBasedOnFilter(date, filter);
  if (!ISTTime) throw new Error("Invalid filter");
  const rows = await getSaleRowsFor(ISTTime);

  let totalSales = 0,
    totalProfit = 0,
    count = 0;
  const bySoldBy: Record<string, { pieces: number; amount: number }> = {};
  const byCode: Record<string, number> = {};

  for (const r of rows) {
    totalSales += r.amount - r.discount;
    totalProfit += r.amount - r.discount - r.cost;
    count += r.quantity;
    const group = (bySoldBy[r.soldBy] ||= { pieces: 0, amount: 0 });
    group.pieces += r.quantity;
    group.amount += r.amount - r.discount;
    byCode[r.code] = (byCode[r.code] || 0) + r.quantity;
  }

  const salesList = Object.entries(byCode)
    .map(([code, pieces]) => ({ code, count: pieces }))
    .sort((x, y) => y.count - x.count);

  return {
    totalSales,
    totalProfit,
    count,
    bySoldBy,
    salesList,
    startDate: ISTTime.start,
    endDate: ISTTime.end,
  };
};

export const getMonthlyTopTenKurties = async (date: month) => {
  const ISTTime = await getCurrMonth(date);
  const rows = await getSaleRowsFor(ISTTime);

  const byCode: Record<string, number> = {};
  for (const r of rows) byCode[r.code] = (byCode[r.code] || 0) + r.quantity;

  return Object.entries(byCode)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([code, pieces]) => ({ code, _count: { code: pieces } }));
};

/** Pieces sold per party (supplier) in a "YYYY-MM" month. */
export const getPartyWiseCount = async (monthParam: string) => {
  const [year, month] = monthParam.split("-").map(Number);
  const rows = await getSaleRowsFor(await getCurrMonth({ year, month }));

  const result: Record<string, number> = {};
  for (const r of rows) result[r.party] = (result[r.party] || 0) + r.quantity;
  return result;
};

type SizeStock = {
  size: string;
  pieces: number;
  locations: Record<StockLocation, number>;
};

export const getAvailableKurtiSizes = async () => {
  const kurtis = await db.kurti.findMany({
    where: {
      code: {
        not: {
          startsWith: "TES",
        },
      },
      isDeleted: false,
    },
    select: {
      code: true,
      sizes: true,
    },
  });

  const sizeDataByKurtiCode: Record<string, SizeStock[]> = {};

  for (const kurti of kurtis) {
    const sizeMap: Record<string, SizeStock> = {};

    for (const s of kurti.sizes as any[]) {
      const entry = (sizeMap[s.size] ||= {
        size: s.size,
        pieces: 0,
        locations: { FLOOR_1: 0, FLOOR_2: 0, SHOP_316: 0, GODOWN: 0 },
      });
      entry.pieces += getTotalQty(s);
      for (const loc of STOCK_LOCATIONS) entry.locations[loc] += getLocationQty(s, loc);
    }

    sizeDataByKurtiCode[kurti.code] = Object.values(sizeMap).filter((e) => e.pieces > 0);
  }

  return {
    sizeDataByKurtiCode,
  };
};

// export const getAvailableKurtiSizes = async () => {
//   const sellData: any = await db.kurti.findMany({
//     where: {
//       code: {
//         not: {
//           startsWith: "TES",
//         },
//       },
//       isDeleted: false,
//     },
//     select: {
//       code: true,
//       sizes: true,
//     },
//   });

//   const result: {
//     [code: string]: {
//       size: string;
//       pieces: number;
//     }[];
//   } = {};

//   for (const kurti of sellData) {
//     for (const s of kurti.sizes) {
//       if (!result[kurti.code]) result[kurti.code] = [];
//       result[kurti.code].push({
//         size: s.size,
//         pieces: s.quantity,
//       });
//     }
//   }

//   // ✅ Console.log kurti code-wise and size-wise available pieces
//   // Object.entries(result).forEach(([code, sizes]) => {
//   //   console.log(`Kurti Code: ${code}`);
//   //   sizes.forEach((entry) => {
//   //     console.log(`  Size: ${entry.size}, Available Pieces: ${entry.pieces}`);
//   //   });
//   // });

//   return { data: result };
// };
