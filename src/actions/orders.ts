"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";

export const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

export const getOrdersOfUserbyStatus: any = async (status: any, pageNum: number) => {

    const currUser: any = await currentUser();

    if (!currUser) {
        return {error: 'Something went wrong, try again later :('}
    }
    const skip: number = 20*pageNum || 0;
    const ordersOfUser = await db.orders.findMany({
        where: {
            // userId: currUser.id, 
            status: status,
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
        skip: skip,
        take: 20,
    });

    return {
        success: 'Pending orders fetched.',
        pendingOrders: ordersOfUser
    }
}

