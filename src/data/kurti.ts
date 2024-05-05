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
                code: code.toUpperCase().substring(0, 3),
            },
            data: {
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

// export const sellKurti = async (code: string) => {
//     try {
//         interface Size {
//             size: string;
//             quantity: number;
//         }

//         let search = code.substring(0, 7).toUpperCase();
//         let cmp = code.substring(7);
//         if (code.toUpperCase().substring(0, 2) === 'CK' && isDigit(code[2]) && isSize(code.substring(6))) {
//             search = code.substring(0, 6).toUpperCase();
//             cmp = code.substring(6);
//         }
//         console.log('search: ',search);
//         const kurti = await db.kurti.findUnique({
//             where: { code: search.toUpperCase(), isDeleted: false }
//         });
//         if (!kurti) {
//             return { error: 'No Kurti found!!!' };
//         }
//         if (kurti?.sizes !== undefined) {
//             let arr: any[] = kurti?.sizes;
//             let newArr: any[] = [];
//             let flag = 0;
//             for (let i = 0; i < arr?.length; i++) {
//                 let obj = arr[i];
//                 if (!obj) {
//                     break;
//                 }
//                 if (obj.size === cmp) {
//                     if (obj.quantity == 0) {
//                         return { error: 'Stock is equal to 0, add stock first' };
//                     }
//                     else {
//                         flag = 1;
//                         obj.quantity -= 1;
//                         if (obj.quantity > 0) {
//                             newArr.push(obj);
//                         }
//                     }
//                 }
//                 else {
//                     newArr.push(arr[i]);
//                 }
//             }
//             if (flag === 1) {
//                 console.log('search2', search);
//                 const updateUser = await db.kurti.update({
//                     where: {
//                         code: search,
//                     },
//                     data: {
//                         sizes: newArr,
//                         countOfPiece: {
//                             increment: -1
//                         }
//                     },
//                 })
//                 console.log('code4', search.toUpperCase().substring(0, 3));
//                 await db.category.update({
//                     where: {
//                         code: search.toUpperCase().substring(0, 3),
//                     },
//                     data: {
//                         countOfPiece: {
//                             increment: -1
//                         }
//                     },
//                 })
//                 return { success: 'Sold', kurti: updateUser };
//             }

//         }

//         return { error: 'Not in stock, update the stock!!!' };
//     } catch {
//         return null;
//     }
// }
// export const migrate = async () => { 
//     return null;
// }

export const sellKurti2 = async (data: any) => {
    try {
        interface Size {
            size: string;
            quantity: number;
        }
        let { code, currentUser, currentTime } = data;
        code = code.toUpperCase();
        let search = code.substring(0, 7).toUpperCase();
        let cmp = code.substring(7);
        if (code.toUpperCase().substring(0, 2) === 'CK' && isDigit(code[2]) && isSize(code.substring(6))) {
            search = code.substring(0, 6).toUpperCase();
            cmp = code.substring(6);
        }
        console.log('search: ', search);
        const kurti = await db.kurti.findUnique({
            where: { code: search.toUpperCase(), isDeleted: false }
        });
        console.log(kurti);
        if (!kurti) {
            return { error: 'No Kurti found!!!' };
        }
        if (kurti?.sizes !== undefined) {
            let arr: any[] = kurti?.sizes;
            let newArr: any[] = [];
            let flag = 0;
            for (let i = 0; i < arr?.length; i++) {
                let obj = arr[i];
                console.log(obj);
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
            console.log(flag, newArr);
            if (flag === 1) {
                console.log('search2', search);
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
                console.log('code2', search.toUpperCase().substring(0, 3));
                await db.category.update({
                    where: {
                        code: search.toUpperCase().substring(0, 3),
                    },
                    data: {
                        countOfPiece: {
                            increment: -1
                        }
                    },
                });
                try {
                    const sell = await db.sell.create({
                        data: {
                            sellTime: currentTime,
                            code: search.toUpperCase(),
                            sellerName: currentUser.name,
                            kurti: [updateUser],
                            kurtiSize: cmp
                        }
                    });
                    console.log(sell);
                }
                catch (e) {
                    console.log(e);
                }

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
        const kurti: any[] = await db.kurti.findMany({ where: { isDeleted: false } });
        const category: any[] = await db.category.findMany({});
        for (let i = 0; i < category.length; i++) {
            await db.category.update({
                where: {
                    id: category[i].id,
                },
                data: {
                    countOfPiece: 0,
                    countOfDesign: 0,
                }
            })
        }
        console.log(kurti.length);
        for (let i = 0; i < kurti.length; i++) {
            let cnt = 0;
            let lower = kurti[i].category.toLowerCase();
            let flag = 0;
            for (let j = 0; j < category.length; j++) {
                if (lower === category[j].normalizedLowerCase) {
                    flag = 1;
                }
            }
            if (flag === 0) {
                await db.kurti.update({
                    where: {
                        id: kurti[i].id,
                    },
                    data: {
                        isDeleted: true,
                    }
                });
                continue;
            }
            let sizes = kurti[i]?.sizes || [];
            for (let j = 0; j < sizes.length; j++) {
                cnt += sizes[j].quantity || 0;
            }
            await db.kurti.update({
                where: {
                    id: kurti[i].id,
                },
                data: {
                    countOfPiece: cnt,
                }
            });
            // console.log(kurti[i].category.toLowerCase());
            await db.category.update({
                where: {
                    normalizedLowerCase: kurti[i].category.toLowerCase() || "",
                },
                data: {
                    countOfPiece: {
                        increment: cnt,
                    },
                    countOfDesign: {
                        increment: 1,
                    }
                }
            });
        }

        return category;
    } catch (e: any) {
        console.log(e);
        return e.message;
    }
}

export const getSellHistory = async () => {
    // const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date();

    // Calculate the offset for IST (UTC+5:30)
    const ISTOffset = 5.5 * 60 * 60 * 1000;

    // Convert the local time to IST
    const ISTTime = new Date(currentTime.getTime() + ISTOffset).toISOString().slice(0, 10);
    const sellData = await db.sell.findMany({
        where: {
            sellTime: {
                gte: new Date(`${ISTTime}T00:00:00.000Z`),
                lt: new Date(`${ISTTime}T23:59:59.999Z`),
            },
        },
    });

    return sellData;
}

