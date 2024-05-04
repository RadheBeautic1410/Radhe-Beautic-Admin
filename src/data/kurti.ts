import { db } from "@/src/lib/db";
import { error } from "console";

export const getKurtiCount = async (cat: string) => {
    try {
        console.log('debg', cat);
        const party = await db.kurti.count({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: cat
                },
            }
        });
        if (cat === "KTD") {
            return party + 2;
        }
        return party;
    } catch {
        return null;
    }
};

export const getCode = async (cat: string) => {
    try {
        console.log('debg', cat);
        const party = await db.category.findUnique({
            where: {
                normalizedLowerCase: cat.toLowerCase(),
            }
        });
        return party?.code;
    } catch (e: any) {
        return e.message;
        return null;
    }
};

export const getKurtiCountWithoutDeleted = async (cat: string) => {
    try {
        const party = await db.kurti.count({ where: { category: cat, isDeleted: false } });

        // if (cat === "KTD") {
        //     return party + 2;
        // }
        return party;
    } catch {
        return null;
    }
};

export const getKurtiCountForCode = async (cat: string) => {
    try {
        const party = await db.kurti.count({ where: { category: cat } });
        return party;
    } catch {
        return null;
    }
};

export const getKurtiByCode = async (code: string) => {
    try {
        const kurti = await db.kurti.findUnique({
            where: { code: code.toUpperCase(), isDeleted: false },
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
                },
                isDeleted: false
            }
        });
        return kurti;
    } catch {
        return null;
    }
}

export const getKurtiByCategoryWithPages = async (category: string, page: number) => {
    try {
        let skip = 20 * (page - 1);
        const kurti = await db.kurti.findMany({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: category
                },
                isDeleted: false
            },
            skip: 20 * (page - 1),
            take: 20
        });
        return kurti;
    } catch {
        return null;
    }
}

export const deleteKurti = async (code: string, category: string) => {
    try {
        const updatedKurti = await db.kurti.update({
            where: {
                code: code.toUpperCase()
            },
            data: {
                isDeleted: true
            }
        });
        await db.category.update({
            where: {
                code: code.toUpperCase().substring(0,3),
            },
            data:{
                countOfPiece: {
                    decrement: updatedKurti.countOfPiece,
                },
                countOfDesign: {
                    decrement: 1,
                }
            }
        })
        const kurti = await db.kurti.findMany({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: category
                },
                isDeleted: false
            }
        });
        return kurti;
    } catch {
        return null;
    }
}

function isDigit(character: any) {
    return !isNaN(parseInt(character)) && isFinite(character);
}

function isSize(size: string) {
    let arr: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return arr.includes(size);
}

export const sellKurti = async (code: string) => {
    try {
        interface Size {
            size: string;
            quantity: number;
        }

        let search = code.substring(0, 7).toUpperCase();
        let cmp = code.substring(7);
        if (code.toUpperCase().substring(0, 2) === 'CK' && isDigit(code[2]) && isSize(code.substring(6))) {
            search = code.substring(0, 6).toUpperCase();
            cmp = code.substring(6);
        }
        const kurti = await db.kurti.findUnique({
            where: { code: search.toUpperCase(), isDeleted: false }
        });
        if (!kurti) {
            return { error: 'No Kurti found!!!' };
        }
        if (kurti?.sizes !== undefined) {
            let arr: any[] = kurti?.sizes;
            let newArr: any[] = [];
            let flag = 0;
            for (let i = 0; i < arr?.length; i++) {
                let obj = arr[i];
                if (!obj) {
                    break;
                }
                if (obj.size === cmp) {
                    if (obj.quantity == 0) {
                        return { error: 'Stock is equal to 0, add stock first' };
                    }
                    else {
                        flag = 1;
                        obj.quantity -= 1;
                        if (obj.quantity > 0) {
                            newArr.push(obj);
                        }
                    }
                }
                else {
                    newArr.push(arr[i]);
                }
            }
            if (flag === 1) {
                const updateUser = await db.kurti.update({
                    where: {
                        code: search,
                    },
                    data: {
                        sizes: newArr,
                        countOfPiece: {
                            increment: -1
                        }
                    },
                })
                console.log('code', search.toUpperCase().substring(0, 3));
                await db.category.update({
                    where: {
                        code: search.toUpperCase().substring(0, 3),
                    },
                    data: {
                        countOfPiece: {
                            increment: -1
                        }
                    },
                })
                return { success: 'Sold', kurti: updateUser };
            }

        }

        return { error: 'Not in stock, update the stock!!!' };
    } catch {
        return null;
    }
}

export const migrate = async () => {
    try {
        let category = await db.category.findMany({});
        let arr = [];
        for (let i = 0; i < category.length; i++) {
            const data = await db.kurti.count({ where: { category: category[i].name, isDeleted: false } });
            const data2 = await db.kurti.aggregate({
                where: {
                    isDeleted: false,
                    category: category[i].name
                },
                _sum: {
                    countOfPiece: true,
                }
            });
            await db.category.update({
                where: {
                    normalizedLowerCase: category[i].name.toLowerCase(),
                },
                data: {
                    countOfDesign: data,
                    countOfPiece: data2._sum.countOfPiece || 0
                }
            })
            // arr.push({ name: category[i].name, count: data, countOfPiece: data2._sum.countOfPiece || 0 });
        }
        category = await db.category.findMany({});
        return category;
    } catch (e: any) {
        return e.message;
    }
}




