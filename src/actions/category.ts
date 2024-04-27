"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getPartybyId, getPartybyName } from "../data/party";
import { getCategoryByID, getCategorybyName } from "../data/category";

interface partyAddtionProps {
    name: string
}

export const categoryAddition = async (
    data: partyAddtionProps
) => {
    const user = await currentUser();
    const role = await currentRole();

    const { name } = data;

    const lowercaseName = name.toLowerCase();

    const dbCategory = await getCategorybyName(lowercaseName);

    if (dbCategory) {
        return { error: "Category Already Exist" }
    }

    await db.category.create({
        data: {
            normalizedLowerCase: lowercaseName,
            name,
        },
    });


    const dbCategoryFetch = await getCategorybyName(lowercaseName);
    return { success: "category Added!", data: dbCategoryFetch }
}


export const categoryDelete = async (
    id: string
) => {
    const user = await currentUser();

    const role = await currentRole();

    const dbparty = await getCategoryByID(id);


    if (!dbparty) {
        return { error: "party does not exist" }
    }

    const deletedCategory = await db.category.delete({
        where: { id: id },
    });

    return { success: "Deletion Success!", deletedCategory }
}