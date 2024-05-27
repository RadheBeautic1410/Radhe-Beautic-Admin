import { db } from "@/src/lib/db";
import { error } from "console";

export const getKurtiCount = async (cat: string) => {
    try {
        console.log('debg', cat);
        const party = await db.kurti.count({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: cat,
                    startsWith: cat
                },
            }
        });
        if (cat === "KTD") {
            return party + 2;
        }
        if (cat === "JR4") {
            return party + 9;
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
                    startsWith: category,
                    endsWith: category,
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

function removeAtIndex(array: any, index: number) {
    return [...array.slice(0, index), ...array.slice(index + 1)];
}

export const deletePicture = async (code: string, idx: number) => {
    try {
        const kurti = await db.kurti.findUnique({
            where: {
                code: code.toUpperCase(),
            }
        });
        let images = kurti?.images || [];
        if (images?.length < idx || images.length <= 1) {
            return kurti;
        }
        let newImages = removeAtIndex(images, idx) || [];
        const updatedKurti = await db.kurti.update({
            where: {
                code: code.toUpperCase(),
            },
            data: {
                images: newImages,
            }
        });
        return updatedKurti;
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
                        normalizedLowerCase: updateUser.category.toLowerCase(),
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
        // const kurti: any[] = await db.kurti.findMany({ where: { isDeleted: false } });
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
            console.log(category[i].name, kurtis.length);
            for (let j = 0; j < kurtis.length; j++) {
                let sizes = kurtis[j]?.sizes || [];
                let cnt = 0;
                for (let k = 0; k < sizes.length; k++) {
                    if (sizes[k].quantity <= 0) {
                        continue;
                    }
                    cnt += sizes[k].quantity || 0;
                }
                await db.kurti.update({
                    where: {
                        id: kurtis[j].id,
                    },
                    data: {
                        countOfPiece: cnt,
                    }
                });
                await db.category.update({
                    where: {
                        id: category[i].id,
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

export const addStock = async (code: string) => {
    try{
        console.log(code);
        let search = code.substring(0, 7).toUpperCase();
        let cmp = code.substring(7);
        if (code.toUpperCase().substring(0, 2) === 'CK' && isDigit(code[2]) && isSize(code.substring(6))) {
            search = code.substring(0, 6).toUpperCase();
            cmp = code.substring(6);
        }
        if(cmp.length === 0) {
            return { error: 'Enter valid code' };
        }
        console.log('search: ', search);
        const kurti = await db.kurti.findUnique({
            where: { code: search.toUpperCase(), isDeleted: false }
        });
        console.log(kurti); 
        if (!kurti) {
            return { error: 'No Kurti found!!!' };
        }
        let sizes: any[] = kurti.sizes || [];
        let flag = 0;
        for(let i=0;i<sizes.length;i++){
            if(sizes[i].size === cmp) {
                sizes[i].quantity += 1;
                flag=1;
                break;
            }
        }
        if(flag === 0) {
            sizes.push({
                size: cmp,
                quantity: 1
            });
        }
        console.log(sizes);
        const updateUser = await db.kurti.update({
            where: {
                code: search,
            },
            data: {
                sizes: sizes,
                countOfPiece: {
                    increment: 1
                }
            },
        });
        await db.category.update({
            where: {
                normalizedLowerCase: updateUser.category.toLowerCase(),
            },
            data: {
                countOfPiece: {
                    increment: 1
                }
            },
        });
        const KurtiNew = await db.kurti.findUnique({
            where: {
                code: search,
            }
        })
        return KurtiNew;
    } catch (e: any){
        console.log(e.message);
        return {error: "Something went wrong"};
    }
}
