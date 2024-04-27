"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getKurtiByCode } from "../data/kurti";


export const kurtiAddition = async (
    data: any
) => {
    const user = await currentUser();
    const role = await currentRole();

    const { code } = data;


    await db.kurti.create({
        data
    });

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Catalog Added!", data: dbpartyFetch }
}

export const stockAddition = async (data: any)=>{
    const user = await currentUser();
    const role = await currentRole();

    const { code } = data;


    await db.kurti.update({
        where: {code},
        data: {
            sizes: data.sizes
        }
    });

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Stock Updated!", data: dbpartyFetch?.sizes }
}

export const priceChange = async (data: any)=>{
    const user = await currentUser();
    const role = await currentRole();

    const { code } = data;


    await db.kurti.update({
        where: {code},
        data: {
            sellingPrice: data.sellingPrice, 
            actualPrice: data.actualPrice
        }
    });

    const dbpartyFetch = await getKurtiByCode(code);
    return { success: "Price Changed!", data: dbpartyFetch?.sizes }
}