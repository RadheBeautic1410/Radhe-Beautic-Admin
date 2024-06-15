import { db } from "@/src/lib/db";
import { getCurrTime } from "./kurti";

export const migrate3 = async () => {
    try {
        const currTime = await getCurrTime();
        await db.kurti.updateMany({
            data: {
                lastUpdatedTime: currTime
            }
        });
        return {success: "updated all kurti"}

    } catch (e: any) {
        console.log(e);
        return e.message;
    }
}

export const migrate6 = async () => {
    try {
        await db.deletetime.deleteMany({
            where: {
                owner: 'DK@123',
            }
        });
        const currTime = await getCurrTime();
        await db.deletetime.create({
            data: {
                owner: 'DK@123',
                time: currTime,
            }
        });
        return {success: "updated all kurti"}

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
        return {success: 'ok'}
    } catch (e: any) {
        console.log(e);
        return e.message;
    }
} 