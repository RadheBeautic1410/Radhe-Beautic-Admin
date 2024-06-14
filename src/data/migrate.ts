import { db } from "@/src/lib/db";
import { getCurrTime } from "./kurti";

export const migrate3 = async () => {
    try {
        const category: any[] = await db.category.findMany({});
        for (let i = 0; i < category.length; i++) {
            const kurtis: any[] = await db.kurti.findMany({
                where: {
                    isDeleted: false,
                    category: {
                        mode: 'insensitive',
                        startsWith: category[i].name,
                        endsWith: category[i].name,
                    }
                }
            });
            let sum = 0;
            // console.log(category[i].name);
            for (let j = 0; j < kurtis.length; j++) {
                try {
                    sum += (parseInt(kurtis[j].actualPrice || "0")) * (kurtis[j].countOfPiece || 0);
                }
                catch (e: any) {
                    console.log(j, e.message);
                }
            }
            console.log(category[i].name, sum);
            let sellPrice = 0;
            if (kurtis.length !== 0) {
                sellPrice = parseInt(kurtis[0].sellingPrice || "0");
            }
            await db.category.update({
                where: {
                    id: category[i].id,
                },
                data: {
                    sellingPrice: sellPrice,
                    actualPrice: sum,
                }
            })
        }

    } catch (e: any) {
        console.log(e);
        return e.message;
    }
}

export const migrate4 = async () => {
    try {
        const category: any[] = await db.category.findMany({});
        for (let i = 0; i < category.length; i++) {
            const currentTime = new Date();

            // Calculate the offset for IST (UTC+5:30)
            const ISTOffset = 5.5 * 60 * 60 * 1000;

            // Convert the local time to IST
            const ISTTime = new Date(currentTime.getTime() + ISTOffset);
            await db.kurti.updateMany({
                where: {
                    category: {
                        mode: 'insensitive',
                        startsWith: category[i].name,
                        endsWith: category[i].name,
                    }
                },
                data: {
                    lastUpdatedTime: ISTTime,
                }
            });
        }

    } catch (e: any) {
        console.log(e);
        return e.message;
    }
}

// Migrating single selling prices to multi prices model
export const migrate5 = async () => {
    try {
        const kurtis: any[] = await db.kurti.findMany({});
        const arrFun: any[] = []
        for (let i = 0; i < kurtis.length; i++) {
            let obj = {
                sellingPrice1: parseInt(kurtis[i].sellingPrice || "0"),
                sellingPrice2: parseInt(kurtis[i].sellingPrice || "0"),
                sellingPrice3: parseInt(kurtis[i].sellingPrice || "0"),
                actualPrice1: parseInt(kurtis[i].actualPrice || "0"),
                actualPrice2: parseInt(kurtis[i].actualPrice || "0"),
                actualPrice3: parseInt(kurtis[i].actualPrice || "0"),
            }
            let price = await db.prices.create({
                data: obj
            });
            // console.log(price);
            // break;
            let currTime = await getCurrTime();
            let fun = await db.kurti.update({
                where: {
                    id: kurtis[i].id,
                },
                data: {
                    pricesId: price.id,
                    lastUpdatedTime: currTime
                }
            });
            arrFun.push(fun);
        }
        // await Promise.all(arrFun);
    } catch (e: any) {
        console.log(e);
        return e.message;
    }
} 