"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getKurtiByCode } from "../data/kurti";
import { size } from "pdfkit/js/page";
import { v4 as uuidv4 } from 'uuid';
import { error } from "console";

export const getCurrTime = async() => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

export const kurtiAddition = async (
    data: any
) => {
    const user = await currentUser();
    const role = await currentRole();

    const { code, countOfPiece, category, sizes } = data;
    let cnt = 0;
    for (let i = 0; i < sizes.length; i++) {
        cnt += sizes[i].quantity;
    }
    const currTime = await getCurrTime();
    let dataWithTime = data;
    dataWithTime['countOfPiece'] = cnt;
    dataWithTime['lastUpdatedTime'] = currTime;
    dataWithTime['reservedSizes'] = []
    console.log(dataWithTime);
    let obj = {
        sellingPrice1: parseInt(data.sellingPrice || "0"),
        sellingPrice2: parseInt(data.sellingPrice || "0"),
        sellingPrice3: parseInt(data.sellingPrice || "0"),
        actualPrice1: parseInt(data.actualPrice || "0"),
        actualPrice2: parseInt(data.actualPrice || "0"),
        actualPrice3: parseInt(data.actualPrice || "0"),
    }
    const price = await db.prices.create({
        data: obj
    });
    dataWithTime['pricesId'] = price.id
    await db.kurti.create({
        data: dataWithTime
    });
    await db.category.update({
        where: {
            normalizedLowerCase: category.toLowerCase(),
        },
        data: {
            countTotal: {
                increment: 1,
            },
        }
    })

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Catalog Added!", data: dbpartyFetch }
}

function isDigit(character: any) {
    return !isNaN(parseInt(character)) && isFinite(character);
}

function isSize(size: string) {
    let arr: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return arr.includes(size);
}

export const stockAddition = async (data: any) => {
    // const user = await currentUser();
    // const role = await currentRole();
    console.log(data);
    const { code, sizes } = data;
    let cnt = 0;
    for (let i = 0; i < sizes.length; i++) {
        cnt += sizes[i].quantity;
    }
    console.log(code);
    let kurti: any = await db.kurti.findUnique({
        where: {
            code: code,
        }
    });

    const currTime = await getCurrTime();
    await db.kurti.update({
        where: { code },
        data: {
            sizes: data.sizes,
            // countOfPiece: cnt,
            lastUpdatedTime: currTime
        }
    });
    // cnt -= kurti?.countOfPiece || 0;
    // console.log(code);
    // await db.category.update({
    //     where: {
    //         normalizedLowerCase: kurti?.category.toLowerCase(),
    //     },
    //     data: {
    //         countOfPiece: {
    //             increment: cnt,
    //         },
    //         actualPrice: {
    //             increment: (cnt * kurti.actualPrice),
    //         },
    //         countTotal: {
    //             increment: 1,
    //         },
    //     }
    // })

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Stock Updated!", data: dbpartyFetch?.sizes }
}

export const priceChange = async (data: any) => {
    const user = await currentUser();
    const role = await currentRole();

    const { code } = data;

    const currTime = await getCurrTime();
    const updatedKurti = await db.kurti.update({
        where: { code },
        data: {
            sellingPrice: data.sellingPrice,
            actualPrice: data.actualPrice,
            lastUpdatedTime: currTime,
        }
    });
    let obj = {
        sellingPrice1: parseInt(data.sellingPrice || "0"),
        sellingPrice2: parseInt(data.sellingPrice || "0"),
        sellingPrice3: parseInt(data.sellingPrice || "0"),
        actualPrice1: parseInt(data.actualPrice || "0"),
        actualPrice2: parseInt(data.actualPrice || "0"),
        actualPrice3: parseInt(data.actualPrice || "0"),
    }
    await db.prices.update({
        where: {
            id: updatedKurti.pricesId || undefined
        },
        data: obj
    })
    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Price Changed!", data: dbpartyFetch?.sizes }
}

export const categoryChange = async (data: any) => {

    const { code, newCode, category } = data;
    const currTime = await getCurrTime();
    console.log(code, newCode);
    const ret = await db.$transaction(async (transaction) => {
        const oldKurti = await transaction.kurti.findUnique({
            where: { code, isDeleted: false }
        });
        if (!oldKurti) {
            return { error: "Kurti Not found" };
        }

        const updatedKurti = await transaction.kurti.update({
            where: { code },
            data: {
                isDeleted: true,
                lastUpdatedTime: currTime,
            }
        });

        const newKurtiData = oldKurti;
        oldKurti.category = data.category;
        oldKurti.code = newCode;
        let old: any = oldKurti;
        delete old.id;
        old['lastUpdatedTime'] = currTime
        const newKurti = await transaction.kurti.create({
            data: old,
        });
        await transaction.category.update({
            where: {
                normalizedLowerCase: category.toLowerCase(),
            },
            data: {
                countTotal: {
                    increment: 1,
                }
            }
        });

        const dbpartyFetch = await transaction.kurti.findUnique({
            where: { code: newCode },
        });

        return {
            success: "Category Changed!",
            code: dbpartyFetch?.code,
            category: dbpartyFetch?.category,
        };
    })

    return ret;
    
}

export const deleteCategory = async (data: any) => {
    const { category } = data;

    const currTime = await getCurrTime();

    try {
        // Start a transaction
        await db.$transaction(async (transaction) => {
            const deletedCategoryName = `${category}-deleted-${Date.now()}`;

            // Soft delete the category by setting the deleted flag and modifying the name
            await transaction.category.update({
                where: {
                    normalizedLowerCase: category.toLowerCase(),
                },
                data: {
                    name: deletedCategoryName,
                },
            });

            await transaction.kurti.updateMany({
                where: {
                    category: {
                        mode: 'insensitive',
                        equals: category.toLowerCase(),
                    },
                },
                data: {
                    isDeleted: true,
                },
            });
            await transaction.deletetime.update({
                where: {
                    owner: 'DK@123',
                },
                data: {
                    time: currTime,
                },
            });
        });

        return { success: `Category ${category} Deleted` };
    } catch (error) {
        console.error('Transaction failed: ', error);
        throw new Error(`Failed to delete category ${category}`);
    }
}


export const addNewImages = async (data: any) => {
    const { images, code } = data;

    const currTime = await getCurrTime();
    const kurti = await db.kurti.update({
        where: {
            code: code.toUpperCase(),
        },
        data: {
            images: images,
            lastUpdatedTime: currTime,
        }
    })
    return { success: `New Images added`, kurti: kurti };
}