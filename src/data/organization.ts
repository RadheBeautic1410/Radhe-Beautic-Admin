import { db } from "@/src/lib/db";

export const getAllParty = async () => {
    try {
        const party = await db.party.findMany({});
        return party;
    } catch (error) {
        console.error('Error fetching party', error);
        return null;
    }
};
