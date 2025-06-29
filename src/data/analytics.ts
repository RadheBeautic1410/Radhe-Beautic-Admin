"use server";

import { db } from "@/src/lib/db";
import { addDays, endOfMonth, endOfYear, lastDayOfMonth, startOfMonth, startOfYear } from "date-fns";
// import { datetimeRegex } from "zod";

type filter = "DATE" | "MONTH" | "YEAR";
type month = {
    year: number,
    month: number,
}
const ISTOffset = 5.5 * 60 * 60 * 1000;

export const getCurrDate = async(date: Date) => {
    const customDate = new Date(date);
    const ISTTime = new Date(customDate.getTime() + ISTOffset).toISOString().slice(0, 10);

    return {
        start: ISTTime,
        end: ISTTime,
    };
}

export const getCurrMonth = async(date: month) => {
    const customDate = new Date(date.year, date.month, 1);
    const ISTTimeStart = new Date(startOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(endOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);

    return {
        start: ISTTimeStart,
        end: ISTTimeEnd,
    };
}

export const getCurrYear = async({year} : {year: number}) => {
    const ISTTimeStart = new Date(startOfMonth(addDays(new Date(year, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(startOfMonth(addDays(new Date(year+1, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);

    return {
        start: ISTTimeStart,
        end: ISTTimeEnd,
    };
}

const selectBasedOnFilter = (date: any, filter: filter) => {
    switch (filter) {
        case "DATE":
            return getCurrDate(date);
        case "MONTH":
            return getCurrMonth(date);
        case "YEAR":
            return getCurrYear(date);
        default:
            console.log('Invalid filter');
    }
}

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
                    startsWith: 'TES',
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
                }
            },
        }
    });
    
    let totalSales = 0, totalProfit = 0;

    let count = 0;
    for(let i = 0; i < sellData.length; i++) {
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
                }
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
                }
            });
            await db.sell.update({
                where: {
                    id: sellData[i].id,
                },
                data: {
                    pricesId: sellPriceId.id,
                }
            });
            await db.kurti.update({
                where: {
                    id: sellData[i].code,
                },
                data: {
                    pricesId: sellPriceId.id,
                }
            });
            count++;
            totalSales += sellPrice;
            totalProfit += (sellPrice - actualP);
            continue;
        }
        count++;
        totalSales += sellingPrice;
        totalProfit += (sellingPrice - actualPrice);
    }
    
    return { totalSales, totalProfit, count};
};

export const getMonthlyTopTenKurties = async (date: month) => {
    const ISTTime = await getCurrMonth(date);
    console.log(ISTTime);
    
    const sellData: any = await db.sell.groupBy({
        by: ['code'],
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
                    startsWith: 'TES',
                },
            },
        },
        orderBy: {
            _count: {
                code: 'desc',
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
                    startsWith: 'TES',
                },
            },
            isDeleted: false,
        },
        select: {
            sizes: true,
            reservedSizes: true,
        }
    });

    const availablePieceSizes: any = {};
    const reservedSizes: any = {};
    let arr: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    for(let i=0;i<arr.length;i++){
        availablePieceSizes[arr[i]] = 0;
        reservedSizes[arr[i]] = 0;
    }
    for(let i = 0; i < sellData.length; i++) {
        for(let j=0;j<sellData[i].sizes.length;j++){
            availablePieceSizes[sellData[i].sizes[j].size] += sellData[i].sizes[j].quantity;
        }
        for(let j=0;j<sellData[i].reservedSizes.length;j++){
            availablePieceSizes[sellData[i].reservedSizes[j].size] += sellData[i].reservedSizes[j].quantity;
        }
    }

    console.log(availablePieceSizes, reservedSizes);
    
    return {availablePieceSizes, reservedSizes};
};