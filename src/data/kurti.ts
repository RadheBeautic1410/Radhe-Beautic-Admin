import { db } from "@/src/lib/db";
import { error } from "console";

export const getCurrTime = async () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

export const getLastDelTime = async () => {
    try {
        // console.log('debg', cat);
        const party: any = await db.deletetime.findUnique({
            where: {
                owner: 'DK@123',
            }
        });
        return party;
    } catch {
        return null;
    }
}

export const getKurtiCount = async (cat: string) => {
    try {
        console.log('debg', cat);
        const party: any = await db.category.findUnique({
            where: {
                normalizedLowerCase: cat.toLowerCase(),
            }
        });
        return party.countTotal || 0;
    } catch {
        return null;
    }
};

export const getAllKurti = async () => {
    try {
        const allKurti = await db.kurti.findMany({
            where: {
                isDeleted: false,
            }
        });
        console.log(allKurti.length);
        return allKurti;
    } catch (e: any) {
        console.log(e.message)
        return null;
    }
};

export const getAllKurtiByTime = async (currTime: string) => {
    try {
        const allKurti = await db.kurti.findMany({
            where: {
                isDeleted: false,
                lastUpdatedTime: {
                    gt: new Date(currTime),
                }
            }
        });
        return allKurti;
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
        // await db.category.update({
        //     where: {
        //         code: code.toUpperCase().substring(0, 3),
        //     },
        //     data: {
        //         countOfPiece: {
        //             decrement: updatedKurti.countOfPiece,
        //         },
        //         countOfDesign: {
        //             decrement: 1,
        //         }
        //     }
        // })
        const kurti = await db.kurti.findMany({
            where: {
                category: {
                    mode: 'insensitive',
                    endsWith: category,
                    startsWith: category
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
        const currTime = await getCurrTime();
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
                lastUpdatedTime: currTime
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
    let arr: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return arr.includes(size);
}


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
        if (code.toUpperCase().substring(0, 2) === 'CK' && code[2]==="0" && isSize(code.substring(6))) {
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

                // await db.category.update({
                //     where: {
                //         normalizedLowerCase: updateUser.category.toLowerCase(),
                //     },
                //     data: {
                //         countOfPiece: {
                //             increment: -1
                //         },
                //         actualPrice: {
                //             decrement: (parseInt(updateUser.actualPrice || "0")),
                //         }
                //     },
                // });
                try {
                    console.log('search2', search);
                    const currTime = await getCurrTime();
                    console.log(currTime);
                    const updateUser = await db.kurti.update({
                        where: {
                            code: search,
                        },
                        data: {
                            sizes: newArr,
                            lastUpdatedTime: currTime,
                        },
                        include: {
                            prices: true,
                        }
                    })
                    console.log('code2', search.toUpperCase().substring(0, 3));
                    const sell = await db.sell.create({
                        data: {
                            sellTime: currentTime,
                            code: search.toUpperCase(),
                            sellerName: currentUser.name,
                            kurti: [updateUser],
                            kurtiId: updateUser.id,
                            pricesId: updateUser.pricesId,
                            kurtiSize: cmp
                        }
                    });
                    console.log(sell);
                    return { success: 'Sold', kurti: updateUser };
                }
                catch (e) {
                    console.log(e);
                    return { error: 'Something went wrong!!!' };
                }

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
                    countTotal: 0,
                }
            })
        }

        for (let i = 0; i < category.length; i++) {
            const ok: any[] = await db.kurti.findMany({
                where: {
                    category: {
                        mode: 'insensitive',
                        startsWith: category[i].name,
                        endsWith: category[i].name,
                    }
                }
            });
            let maxi = 0;
            for (let j = 0; j < ok.length; j++) {
                let code = ok[j].code;
                let cnt = parseInt(code.substring(3)) || 0;
                maxi = Math.max(maxi, cnt);
            }
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
            let overallCnt = 0, uniqueCnt = 0;
            let arrFun: any = [];
            for (let j = 0; j < kurtis.length; j++) {
                uniqueCnt += 1;
                let sizes = kurtis[j]?.sizes || [];
                let cnt = 0;
                for (let k = 0; k < sizes.length; k++) {
                    if (sizes[k].quantity <= 0) {
                        continue;
                    }
                    cnt += sizes[k].quantity || 0;
                }
                const fun = db.kurti.update({
                    where: {
                        id: kurtis[j].id,
                    },
                    data: {
                        countOfPiece: cnt,
                    }
                });
                arrFun.push(fun);
                overallCnt += cnt;


            }
            await Promise.all(arrFun);
            console.log('countTotal:', maxi);
            await db.category.update({
                where: {
                    id: category[i].id,
                },
                data: {
                    countTotal: maxi,
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

export const addStock = async (code: string) => {
    try {
        console.log(code);
        let search = code.substring(0, 7).toUpperCase();
        let cmp = code.substring(7);
        if (code.toUpperCase().substring(0, 2) === 'CK' && code[2]==="0" && isSize(code.substring(6))) {
            search = code.substring(0, 6).toUpperCase();
            cmp = code.substring(6);
        }
        if (cmp.length === 0) {
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
        for (let i = 0; i < sizes.length; i++) {
            if (sizes[i].size === cmp) {
                sizes[i].quantity += 1;
                flag = 1;
                break;
            }
        }
        if (flag === 0) {
            sizes.push({
                size: cmp,
                quantity: 1
            });
        }
        console.log(sizes);
        const currTime = await getCurrTime();
        const updateUser: any = await db.kurti.update({
            where: {
                code: search,
            },
            data: {
                sizes: sizes,
                countOfPiece: {
                    increment: 1
                },
                lastUpdatedTime: currTime
            },
        });
        let inc = (updateUser.actualPrice);
        // await db.category.update({
        //     where: {
        //         normalizedLowerCase: updateUser.category.toLowerCase(),
        //     },
        //     data: {
        //         countOfPiece: {
        //             increment: 1
        //         },
        //         sellingPrice: parseInt(updateUser.sellingPrice || "0"),
        //         // actualPrice: {
        //         //     increment: inc
        //         // }
        //     },
        // });
        const KurtiNew = await db.kurti.findUnique({
            where: {
                code: search,
            }
        })
        return KurtiNew;
    } catch (e: any) {
        console.log(e.message);
        return { error: "Something went wrong" };
    }
}


export const migrate2 = async () => {
    try {
        // const kurti: any[] = await db.kurti.findMany({ where: { isDeleted: false } });
        const allKurties: any[] = await db.kurti.findMany({});
        for (let i = 0; i < allKurties.length; i++) {
            let cat = allKurties[i].category.toLowerCase();
            let fnd = await db.category.findUnique({
                where: {
                    normalizedLowerCase: cat,
                }
            });
            if (!fnd || fnd === undefined || fnd === null) {
                await db.kurti.delete({
                    where: {
                        id: allKurties[i].id,
                    }
                });
            }
        }
    }
    catch (e: any) {
        console.log(e.message);
        return e;
    }
}