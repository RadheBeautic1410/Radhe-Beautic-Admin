import { db } from "@/src/lib/db";

export const getPartybyId = async (id: string) => {
    try {
        const party = await db.party.findUnique({
            where: { id }
        });

        return party;
    } catch {
        return null;
    }
};

export const getPartybyName = async (name: string) => {

    try {
        const party = await db.party.findUnique({
            where: { normalizedLowerCase: name }
        });

        return party;
    } catch {
        return null;
    }
};

export const getAllParty = async () => {
    try {
        const party = await db.party.findMany({});
        return party;
    } catch (error) {
        console.error('Error fetching party', error);
        return null;
    }
};
