import { db } from "@/src/lib/db";
import { error } from "console";

export const getKurtiCount = async (cat: string) => {
    try {
        const party = await db.kurti.count({ where: { category: cat } });

        if (cat === "KTD") {
            return party + 2;
        }
        return party;
    } catch {
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
            where: { code, isDeleted: false },
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
        await db.kurti.update({
            where: {
                code: code.toLowerCase()
            },
            data: {
                isDeleted: true
            }
        });
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

export const sellKurti = async (code: string) => {
    try {
        interface Size {
            size: string;
            quantity: number;
        }
        
        let search = code.substring(0, 7).toLowerCase();
        let cmp = code.substring(7);
        if (code.toLowerCase().substring(0, 2) === 'ck' && isDigit(code[2])) {
            search = code.substring(0, 6).toLowerCase();
            cmp = code.substring(6);
        }
        const kurti = await db.kurti.findUnique({
            where: { code: search, isDeleted: false }
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
        const kurti = await db.kurti.updateMany({
            where: {

            },
            data: {
                isDeleted: false
            }
        });

        return kurti;
    } catch {
        return null;
    }
}




