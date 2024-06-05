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
            let sum = 0;
            console.log(category[i].name);
            for (let j = 0; j < kurtis.length; j++) {
                try{
                    sum += (parseInt(kurtis[j].actualPrice || "0"))*(kurtis[j].countOfPiece||0);
                }
                catch(e:any){
                    console.log(j, e.message);
                }
            }
            console.log(category[i].name, sum);
            await db.category.update({
                where: {
                    id: category[i].id,
                },
                data: {
                    sellingPrice: parseInt(kurtis[0].sellingPrice || "0"),
                    actualPrice: sum,
                }
            })
        }
        
    } catch (e: any) {
        console.log(e);
        return e.message;
    }
} 