"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

export const getCountFromStatus: any = async (status: any) => {
    const count = await db.orders.count({
        where: {
            // userId: currUser.id, 
            status: status,
            // createdAt: {
            //     gte: dateRange.from? dateRange.from : addDays(new Date(), -20),
            //     lte: dateRange.to? dateRange.to: new Date(),
            // }
        },
    });
    return count;
}

export const getOrdersOfUserbyStatus: any = async (status: any, pageNum: number, pageSize: number, dateRange: DateRange) => {

    const currUser: any = await currentUser();
    console.log(currUser);
    if (!currUser) {
        return { error: 'Something went wrong, try again later :(' }
    }
    let pages = 0;
    try {
        pages = await db.orders.count({
            where: {
                // userId: currUser.id, 
                status: status,
                createdAt: {
                    gte: dateRange.from ? dateRange.from : addDays(new Date(), -20),
                    lte: dateRange.to ? dateRange.to : new Date(),
                }
            },
        });
        console.log('count:', pages);
    }
    catch (e: any) {
        console.log(e.message);
    }

    const currTIme = await getCurrTime();
    const ordersOfUser = await db.orders.findMany({
        where: {
            // userId: currUser.id, 
            status: status,
            createdAt: {
                gte: dateRange.from ? dateRange.from : addDays(new Date(), -20),
                lte: dateRange.to ? dateRange.to : currTIme,
            }
        },
        include: {
            cart: {
                include: {
                    CartProduct: {
                        include: {
                            kurti: {
                                include: {
                                    prices: true
                                }
                            }
                        }
                    }
                }
            },
            shippingAddress: true,
            user: true
        },
        orderBy: [
            {
                createdAt: 'desc'
            }
        ],
        skip: pageSize * (pageNum),
        take: pageSize,
    });

    return {
        success: 'Pending orders fetched.',
        pendingOrders: ordersOfUser,
        pages: Math.ceil(pages / pageSize)
    }
}

export const getOrderForPacking = async (orderId: string) => {
    const order = await db.orders.findUnique({
        where: {
            orderId: orderId,
        },
        select: {
            cartId: true,
            id: true,
            cart: {
                select: {
                    CartProduct: {
                        include: {
                            kurti: {
                                select: {
                                    code: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    return order;
}

export const getOrderByOrderId = async (orderId: string, status: any) => {
    const order = await db.orders.findUnique({
        where: {
            orderId: orderId,
            status: status
        },
        include: {
            cart: {
                include: {
                    CartProduct: {
                        include: {
                            kurti: {
                                include: {
                                    prices: true
                                }
                            }
                        }
                    }
                }
            },
            shippingAddress: true,
            user: true
        },
    });
    return order;
}

function isSize(size: string) {
    let arr: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return arr.includes(size);
}

function updateSizeQuantity(sizes: any[], size: string, change: number): any[] {
    const existingSize = sizes.find(s => s.size === size);
    if (existingSize) {
        existingSize.quantity += change;
        if (existingSize.quantity === 0) {
            return sizes.filter(s => s.size !== size);
        }
        else if (existingSize.quantity < 0) {
            throw new Error(`Size-${size} is not available`);
        }
    } else if (change > 0) {
        sizes.push({ size, quantity: change });
    }
    return sizes;
}

export const sellOrder = async (code: string, cartId: any, currentUser: any, currentTime: any) => {
    code = code.toUpperCase();
    let search = code.substring(0, 7).toUpperCase();
    let size = code.substring(7);
    if (code.toUpperCase().substring(0, 2) === 'CK' && code[2] === "0" && isSize(code.substring(6))) {
        search = code.substring(0, 6).toUpperCase();
        size = code.substring(6);
    }
    console.log('search: ', search);
    try {
        // Start a transaction
        const result = await db.$transaction(async (tx) => {
            // Find the Kurti

            const kurti = await tx.kurti.findUnique({
                where: { code: search.toUpperCase() },
                select: { id: true, sizes: true, reservedSizes: true }
            });
            console.log(kurti);
            if (!kurti) throw new Error('Kurti not found');
            const sizeInSizes: any = kurti.sizes.find((s: any) => s.size === size);
            if (!sizeInSizes || sizeInSizes.quantity <= 0) {
                throw new Error('Size is not available');
            }

            // Check if size is available in reservedSizes array
            const sizeInReservedSizes: any = kurti.reservedSizes.find((s: any) => s.size === size);
            if (!sizeInReservedSizes || sizeInReservedSizes.quantity <= 0) {
                throw new Error('System problem: Reserved size not available. Please contact the owner.');
            }

            const cartProduct = await tx.cartProduct.findFirst({
                where: { AND: { cartId, kurtiId: kurti.id } }
            });
            if (!cartProduct) throw new Error('Cart not found');

            // Update Kurti sizes and reservedSizes
            const updatedSizes = updateSizeQuantity(kurti.sizes, size, -1);
            const updatedReservedSizes = updateSizeQuantity(kurti.reservedSizes, size, -1);

            console.log('updatedSize1:', updatedSizes, updatedReservedSizes);
            // Update Kurti
            await tx.kurti.update({
                where: { id: kurti.id },
                data: { sizes: updatedSizes, reservedSizes: updatedReservedSizes, lastUpdatedTime: currentTime }
            });

            // If CartProduct exists, update scannedSizes
            const updatedScannedSizes = updateSizeQuantity(cartProduct.scannedSizes, size, 1);
            console.log('updatedSize:', updatedScannedSizes);
            const updatedCart = await tx.cartProduct.update({
                where: { id: cartProduct.id },
                data: { scannedSizes: updatedScannedSizes }
            });
            console.log(updatedCart);
            const sell = await tx.sell.create({
                data: {
                    sellTime: currentTime,
                    code: search.toUpperCase(),
                    sellerName: currentUser.name,
                    kurti: [kurti],
                    kurtiSize: size
                }
            });
            console.log(sell);
            return { success: true };
        });

        return result;
    } catch (error: any) {
        console.error('Error in scanAndUpdateSize:', error.message);
        return { success: false, error: error.message };
    }
}

export const getAddresses = async () => {
    const addresses = db.orders.findMany({
        where: {
            status: 'PENDING',
        },
        select: {
            orderId: true,
            shippingAddress: {
                select: {
                    address: true,
                }
            }
        }
    });

    return addresses;
}