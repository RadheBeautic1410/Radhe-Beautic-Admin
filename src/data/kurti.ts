import { db } from "@/src/lib/db";

export const getKurtiCount = async () => {
    try {
        const party = await db.kurti.count();

        return party;
    } catch {
        return null;
    }
};

export const getKurtiByCode = async (code: string) => {
    try {
        const kurti = await db.kurti.findUnique({
            where: { code }
        });
        return kurti;
    } catch {
        return null;
    }
}

export const getKurtiByCategory = async (category: string) => {
    try {
        const kurti = await db.kurti.findMany({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: category
                }
            }
        });
        return kurti;
    } catch {
        return null;
    }
}



