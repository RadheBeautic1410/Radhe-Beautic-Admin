import { db } from "@/src/lib/db";

export const migrate3 = async () => {
    try {
        const category: any[] = await db.category.findMany({});
        for (let i = 0; i < category.length; i++) {
            const kurtis: any[] = await db.kurti.findMany({
                where: {
                    isDeleted: false,
                    category: {
                        mode: 'insensitive',
                        startsWith: category[i].name,
                        endsWith: category[i].name,
                    }
                }
            });
            await db.category.update({
                where: {
                    id: category[i].id,
                },
                data: {
                    sellingPrice: parseInt(kurtis[0].sellingPrice || "0"),
                }
            })
        }
        
    } catch (e: any) {
        console.log(e);
        return e.message;
    }
} 