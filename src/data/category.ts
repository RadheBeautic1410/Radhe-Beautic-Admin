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


export const getAllCategoryWithCount = async () => {
    try {
        const category = await db.category.findMany({
            where: {
                isDeleted: false
            }
        });
        let arr = [];
        for(let i = 0; i < category.length; i++) {
            arr.push({
                name: category[i].name, 
                type: category[i].type,
                image: category[i].image,
                id: category[i].id,
                bigPrice: category[i].bigPrice,
                // count: category[i].countOfDesign, 
                // countOfPiece: category[i].countOfPiece, 
                // sellingPrice: category[i].sellingPrice,
                // actualPrice: category[i].actualPrice,
            });
        }
        return {counts: arr};
    } catch (error) {
        console.error('Error fetching category', error);
        return null;
    }
};
