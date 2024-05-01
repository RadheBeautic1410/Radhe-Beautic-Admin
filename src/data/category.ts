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
        const category = await db.category.findMany({});
        let arr = [];
        for(let i = 0; i < category.length; i++) {
            const data = await db.kurti.count({where: {category: category[i].name, isDeleted: false}});
            const data2 = await db.kurti.aggregate({
                where: {
                    isDeleted: false,
                    category: category[i].name
                },
                _sum: {
                    countOfPiece: true,
                }
            });
            arr.push({name: category[i].name, count: data, countOfPiece: data2._sum.countOfPiece || 0});
        }
        return {category, counts: arr};
    } catch (error) {
        console.error('Error fetching category', error);
        return null;
    }
};