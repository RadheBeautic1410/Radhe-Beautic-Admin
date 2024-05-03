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

    const { code, countOfPiece, category, party } = data;


    await db.kurti.create({
        data
    });


    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Catalog Added!", data: dbpartyFetch }
}

export const stockAddition = async (data: any) => {
    const user = await currentUser();
    const role = await currentRole();

    const { code, sizes } = data;
    let cnt = 0;
    for (let i = 0; i < sizes.length; i++) {
        cnt += sizes[i].quantity;
    }

    await db.kurti.update({
        where: { code },
        data: {
            sizes: data.sizes,
            countOfPiece: cnt
        }
    });

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
    const user = await currentUser();
    const role = await currentRole();

    const { code, newCode } = data;
    console.log(code, newCode);

    await db.kurti.update({
        where: { code },
        data: {
            category: data.category,
            code: newCode
        }
    });

    const dbpartyFetch = await getKurtiByCode(newCode);
    return { success: "Category Changed!", code: dbpartyFetch?.code, category: dbpartyFetch?.category }
}