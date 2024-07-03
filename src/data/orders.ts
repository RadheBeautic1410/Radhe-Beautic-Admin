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
        return {error: 'Something went wrong, try again later :('}
    }
    let pages = 0;
    try {
        pages = await db.orders.count({
            where: {
                // userId: currUser.id, 
                status: status,
                createdAt: {
                    gte: dateRange.from? dateRange.from : addDays(new Date(), -20),
                    lte: dateRange.to? dateRange.to: new Date(),
                }
            },
        });
        console.log('count:',pages);
    }
    catch (e: any) {
        console.log(e.message);
    }
    
    
    const ordersOfUser = await db.orders.findMany({
        where: {
            // userId: currUser.id, 
            status: status,
            createdAt: {
                gte: dateRange.from? dateRange.from : addDays(new Date(), -20),
                lte: dateRange.to? dateRange.to: await getCurrTime(),
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
        skip: pageSize*(pageNum),
        take: pageSize,
    });

    return {
        success: 'Pending orders fetched.',
        pendingOrders: ordersOfUser,
        pages: Math.ceil(pages/pageSize)
    }
}

export const getOrderForPacking = async (orderId: string) => {
    const order = await db.orders.findUnique({
        where: {
            orderId: orderId,
        },
        select: {
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