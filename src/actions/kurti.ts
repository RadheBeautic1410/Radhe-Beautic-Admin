"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getKurtiByCode } from "../data/kurti";
import { size } from "pdfkit/js/page";


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

    await db.kurti.create({
        data
    });
    await db.category.update({
        where: {
            normalizedLowerCase: category.toLowerCase(),
        },
        data: {
            countOfPiece: {
                increment: cnt,
            },
            countOfDesign: {
                increment: 1,
            },
            countTotal: {
                increment: 1,
            },
            actualPrice: {
                increment: (cnt * data.actualPrice),
            }
        }
    })

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Catalog Added!", data: dbpartyFetch }
}

function isDigit(character: any) {
    return !isNaN(parseInt(character)) && isFinite(character);
}

function isSize(size: string) {
    let arr: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
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
    await db.kurti.update({
        where: { code },
        data: {
            sizes: data.sizes,
            countOfPiece: cnt
        }
    });
    cnt -= kurti?.countOfPiece || 0;
    console.log(code);
    await db.category.update({
        where: {
            normalizedLowerCase: kurti?.category.toLowerCase(),
        },
        data: {
            countOfPiece: {
                increment: cnt,
            },
            actualPrice: {
                increment: (cnt * kurti.actualPrice),
            },
            countTotal: {
                increment: 1,
            },
        }
    })

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Stock Updated!", data: dbpartyFetch?.sizes }
}

export const priceChange = async (data: any) => {
    const user = await currentUser();
    const role = await currentRole();

    const { code } = data;


    await db.kurti.update({
        where: { code },
        data: {
            sellingPrice: data.sellingPrice,
            actualPrice: data.actualPrice
        }
    });

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Price Changed!", data: dbpartyFetch?.sizes }
}

export const categoryChange = async (data: any) => {

    const { code, newCode } = data;
    console.log(code, newCode);
    let oldKurti = await db.kurti.findUnique({
        where: {
            code: code,
        }
    });
    if(oldKurti === null) {
        return {error: "Kurti Not found"};
    }
    let kurti = await db.kurti.update({
        where: { code },
        data: {
            // category: data.category,
            // code: newCode
            isDeleted: true,
        }
    });
    oldKurti.category = data.category;
    oldKurti.code = newCode;
    let old: any = oldKurti;
    delete old.id;
    kurti = await db.kurti.create({
        data: old
    })
    console.log('count:', kurti.countOfPiece);
    await db.category.update({
        where: {
            normalizedLowerCase: old?.category.toLowerCase(),
        },
        data: {
            countOfPiece: {
                decrement: kurti.countOfPiece,
            },
            countOfDesign: {
                decrement: 1,
            }
        }
    });

    await db.category.update({
        where: {
            normalizedLowerCase: kurti.category.toLowerCase(),
        },
        data: {
            countOfPiece: {
                increment: kurti.countOfPiece,
            },
            countOfDesign: {
                increment: 1,
            },
            countTotal: {
                increment: 1,
            }
        }
    });

    const dbpartyFetch = await getKurtiByCode(newCode);
    return { success: "Category Changed!", code: dbpartyFetch?.code, category: dbpartyFetch?.category }
}

export const deleteCategory = async (data: any) => {
    const { category } = data;
    // const categories = await db.category.findMany({});
    await db.category.delete({
        where: {
            normalizedLowerCase: category.toLowerCase(),
        }
    });
    await db.kurti.deleteMany({
        where: {
            category: {
                mode: 'insensitive',
                endsWith: category.toLowerCase(),
                startsWith: category.toLowerCase()
            },
        },
    })
    return { success: `Category ${category} Deleted` };
}

export const addNewImages = async (data: any) => {
    const { images, code } = data;
    // const categories = await db.category.findMany({});
    // await db.category.delete({
    //     where: {
    //         normalizedLowerCase: category.toLowerCase(),
    //     }
    // });
    const kurti = await db.kurti.update({
        where: {
            code: code.toUpperCase(),
        },
        data: {
            images: images
        }
    })
    return { success: `New Images added`, kurti: kurti };
}