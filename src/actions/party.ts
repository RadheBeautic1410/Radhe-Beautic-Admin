"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { getPartybyId, getPartybyName } from "../data/party";

interface partyAddtionProps {
    name: string
}

export const partyAddition = async (
    data: partyAddtionProps
) => {
    const user = await currentUser();
    const role = await currentRole();

    const { name } = data;

    const lowercaseName = name.toLowerCase();

    const dbparty = await getPartybyName(lowercaseName);

    if (dbparty) {
        return { error: "party Already Exist" }
    }

    await db.party.create({
        data: {
            normalizedLowerCase: lowercaseName,
            name,
        },
    });


    const dbpartyFetch = await getPartybyName(lowercaseName);
    return { success: "party Added!", data: dbpartyFetch }
}


export const partyDelete = async (
    id: string
) => {
    const user = await currentUser();

    const role = await currentRole();

    const dbparty = await getPartybyId(id);


    if (!dbparty) {
        return { error: "party does not exist" }
    }

    const deletedparty = await db.party.delete({
        where: { id: id },
    });

    return { success: "Deletion Success!", deletedparty }
}