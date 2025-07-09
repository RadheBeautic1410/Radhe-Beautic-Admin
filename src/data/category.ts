import { db } from "@/src/lib/db";

export const getCategoryByID = async (id: string) => {
    try {
        const category = await db.category.findUnique({
            where: { id }
        });

        return category;
    } catch {
        return null;
    }
};

export const getCategorybyName = async (name: string) => {

    try {
        const category = await db.category.findUnique({
            where: { normalizedLowerCase: name }
        });

        return category;
    } catch {
        return null;
    }
};

export const getAllCategory = async () => {
    try {
        const category = await db.category.findMany({});
        return category;
    } catch (error) {
        console.error('Error fetching category', error);
        return null;
    }
};


// export const getAllCategoryWithCount = async () => {
//     try {
//         const category = await db.category.findMany({
//             where: {
//                 isDeleted: false
//             }
//         });
//         let arr = [];
//         for(let i = 0; i < category.length; i++) {
//             arr.push({
//                 name: category[i].name, 
//                 type: category[i].type,
//                 image: category[i].image,
//                 // count: category[i].countOfDesign, 
//                 // countOfPiece: category[i].countOfPiece, 
//                 // sellingPrice: category[i].sellingPrice,
//                 // actualPrice: category[i].actualPrice,
//             });
//         }
//         return {counts: arr};
//     } catch (error) {
//         console.error('Error fetching category', error);
//         return null;
//     }
// };

export const getAllCategoryWithCount = async () => {
    try {
        const categories = await db.category.findMany({
            where: {
                isDeleted: false
            }
        });

        const result = [];

        for (const cat of categories) {
            const categoryName = cat.name;

            // Find all non-deleted kurtis for this category
            const kurtis = await db.kurti.findMany({
                where: {
                    isDeleted: false,
                    category: categoryName
                },
                select: {
                    sellingPrice: true,
                    actualPrice: true,
                    countOfPiece: true
                }
            });

            // If no kurti found, skip
            if (kurtis.length === 0) {
                result.push({
                    name: cat.name,
                    type: cat.type,
                    image: cat.image,
                    sellingPrice: 0,
                    actualPrice: 0,
                    countOfPiece: 0
                });
                continue;
            }

            // Use the price from the first kurti
            const { sellingPrice, actualPrice } = kurtis[0];

            // Sum up countOfPiece
            const totalPieces = kurtis.reduce(
                (sum, k) => sum + (k.countOfPiece || 0),
                0
            );

            result.push({
                name: cat.name,
                type: cat.type,
                image: cat.image,
                sellingPrice: parseInt(sellingPrice || '0'),
                actualPrice: parseInt(actualPrice || '0'),
                countOfPiece: totalPieces
            });
        }

        return { counts: result };
    } catch (error) {
        console.error('Error fetching category with stats:', error);
        return null;
    }
};
