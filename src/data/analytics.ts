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

export const getCurrDate = (date: Date) => {
    const customDate = new Date(date);
    const ISTTime = new Date(customDate.getTime() + ISTOffset).toISOString().slice(0, 10);

    return {
        start: ISTTime,
        end: ISTTime,
    };
}

export const getCurrMonth = (date: month) => {
    const customDate = new Date(date.year, date.month ,1);
    const ISTTimeStart = new Date(startOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(endOfMonth(addDays(customDate, -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    console.log('ISTTimeStartM', ISTTimeStart);
    console.log('ISTTimeEndM', ISTTimeEnd);

    return {
        start: ISTTimeStart,
        end: ISTTimeEnd,
    };
}

export const getCurrYear = ({year} : {year: number}) => {
    const ISTTimeStart = new Date(startOfMonth(addDays(new Date(year, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    const ISTTimeEnd = new Date(startOfMonth(addDays(new Date(year+1, 1 ,1), -1)).getTime() + ISTOffset).toISOString().slice(0, 10);
    
    console.log('ISTTimeStartY', ISTTimeStart);
    console.log('ISTTimeEndY', ISTTimeEnd);

    return {
        start: ISTTimeStart,
        end: ISTTimeEnd,
    };
}

const selectBasedOnFilter = (date: any, filter: filter) => {
    switch(filter) {
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
    const ISTTime = selectBasedOnFilter(date, filter);

    const sellData: any = await db.sell.findMany({
        where: {
            sellTime: {
                gte: new Date(`${ISTTime?.start}T00:00:00.000Z`),
                lt: new Date(`${ISTTime?.end}T23:59:59.999Z`),
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

    // console.log(sellData);
    
    let totalSales = 0, totalProfit = 0;

    if(date?.year) {
        console.log(sellData.length, 'yearly');
        
    }
    let count = 0;
    for(let i = 0; i < sellData.length; i++) {
        if(sellData[i].code.includes('TES')){
            console.log(sellData[i].code);
            continue;
        }
        const sellingPrice = Number(sellData[i].prices?.sellingPrice1);
        const actualPrice = Number(sellData[i].prices?.actualPrice1);
        
        if(!sellingPrice || !actualPrice) {
            console.log(sellingPrice, actualPrice, sellData[i].id);
            const obj = {
                sellingPrice1: parseInt(sellData[i].kurti[0]?.sellingPrice || "0"),
                sellingPrice2: parseInt(sellData[i].kurti[0]?.sellingPrice || "0"),
                sellingPrice3: parseInt(sellData[i].kurti[0]?.sellingPrice || "0"),
                actualPrice1: parseInt(sellData[i].kurti[0]?.actualPrice || "0"),
                actualPrice2: parseInt(sellData[i].kurti[0]?.actualPrice || "0"),
                actualPrice3: parseInt(sellData[i].kurti[0]?.actualPrice || "0"),
            }
            const prices = await db.prices.create({
                data: obj
            });
            await db.sell.update({
                where: {
                    id: sellData[i].id,
                },
                data: {
                    pricesId: prices.id
                }
            })
            continue;
        }
        count++;
        totalSales += sellingPrice;
        totalProfit += (sellingPrice - actualPrice);
    }
    
    return { totalSales, totalProfit, count};
}