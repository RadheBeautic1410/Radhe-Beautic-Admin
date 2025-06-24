"use server";

import { db } from "@/src/lib/db";
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

export const getCurrDate = async (date: Date) => {
  const customDate = new Date(date);
  const ISTTime = new Date(customDate.getTime() + ISTOffset)
    .toISOString()
    .slice(0, 10);

  return {
    start: ISTTime,
    end: ISTTime,
  };
};

export const getCurrMonth = async (date: month) => {
  const customDate = new Date(date.year, date.month, 1);
  const ISTTimeStart = new Date(
    startOfMonth(addDays(customDate, -1)).getTime() + ISTOffset
  )
    .toISOString()
    .slice(0, 10);
  const ISTTimeEnd = new Date(
    endOfMonth(addDays(customDate, -1)).getTime() + ISTOffset
  )
    .toISOString()
    .slice(0, 10);

  return {
    start: ISTTimeStart,
    end: ISTTimeEnd,
  };
};

export const getCurrYear = async ({ year }: { year: number }) => {
  const ISTTimeStart = new Date(
    startOfMonth(addDays(new Date(year, 1, 1), -1)).getTime() + ISTOffset
  )
    .toISOString()
    .slice(0, 10);
  const ISTTimeEnd = new Date(
    startOfMonth(addDays(new Date(year + 1, 1, 1), -1)).getTime() + ISTOffset
  )
    .toISOString()
    .slice(0, 10);

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

export const getFilteredSales = async (date: any, filter: filter) => {
  const ISTTime = await selectBasedOnFilter(date, filter);
  const sellData: any = await db.sell.findMany({
    where: {
      sellTime: {
        gte: new Date(`${ISTTime?.start}T00:00:00.000Z`),
        lt: new Date(`${ISTTime?.end}T23:59:59.999Z`),
      },
      code: {
        not: {
          startsWith: "TES",
        },
      },
    },
    select: {
      id: true,
      code: true,
      prices: {
        select: {
          sellingPrice1: true,
          actualPrice1: true,
        },
      },
    },
  });

  let totalSales = 0,
    totalProfit = 0;

  let count = 0;
  for (let i = 0; i < sellData.length; i++) {
    // if(sellData[i].code.includes('TES')){
    //     continue;
    // }
    const sellingPrice = Number(sellData[i].prices?.sellingPrice1);
    const actualPrice = Number(sellData[i].prices?.actualPrice1);
    console.log(sellingPrice, actualPrice, count, totalProfit);
    if (!sellingPrice || !actualPrice) {
      console.log(sellData[i].code);
      let sell: any = await db.sell.findUnique({
        where: {
          id: sellData[i].id,
        },
      });
      let sellPrice = parseInt(sell.kurti[0].sellingPrice || "0");
      let actualP = parseInt(sell.kurti[0].actualPrice || "0");
      let sellPriceId = await db.prices.create({
        data: {
          sellingPrice1: sellPrice,
          sellingPrice2: sellPrice,
          sellingPrice3: sellPrice,
          actualPrice1: actualP,
          actualPrice2: actualP,
          actualPrice3: actualP,
        },
      });
      await db.sell.update({
        where: {
          id: sellData[i].id,
        },
        data: {
          pricesId: sellPriceId.id,
        },
      });
      await db.kurti.update({
        where: {
          id: sellData[i].code,
        },
        data: {
          pricesId: sellPriceId.id,
        },
      });
      count++;
      totalSales += sellPrice;
      totalProfit += sellPrice - actualP;
      continue;
    }
    count++;
    totalSales += sellingPrice;
    totalProfit += sellingPrice - actualPrice;
  }

  return {
    totalSales,
    totalProfit,
    count,
    startDate: ISTTime?.start, // Add this
    endDate: ISTTime?.end, // Add this
  };
};

export const getMonthlyTopTenKurties = async (date: month) => {
  const ISTTime = await getCurrMonth(date);
  console.log(ISTTime);

  const sellData: any = await db.sell.groupBy({
    by: ["code"],
    _count: {
      code: true,
    },
    where: {
      sellTime: {
        gte: new Date(`${ISTTime?.start}T00:00:00.000Z`),
        lt: new Date(`${ISTTime?.end}T23:59:59.999Z`),
      },
      code: {
        not: {
          startsWith: "TES",
        },
      },
    },
    orderBy: {
      _count: {
        code: "desc",
      },
    },
    take: 10,
  });

  return sellData;
};
export const getAvailableKurtiSizes = async () => {
  const sellData: any = await db.kurti.findMany({
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

  const sizeDataByKurtiCode: Record<string, { size: string; pieces: number }[]> = {};

  for (const kurti of sellData) {
    const sizeMap: Record<string, number> = {};

    for (const s of kurti.sizes) {
      if (!sizeMap[s.size]) sizeMap[s.size] = 0;
      sizeMap[s.size] += s.quantity;
    }

    sizeDataByKurtiCode[kurti.code] = Object.entries(sizeMap)
      .filter(([_, pieces]) => pieces > 0) // ✅ Only include valid positive sizes
      .map(([size, pieces]) => ({
        size,
        pieces,
      }));
  }

  // Optional debug log
  // Object.entries(sizeDataByKurtiCode).forEach(([code, sizes]) => {
  //   console.log(`Kurti Code: ${code}`);
  //   sizes.forEach(({ size, pieces }) => {
  //     console.log(`  Size: ${size} => Available Pieces: ${pieces}`);
  //   });
  // });

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
