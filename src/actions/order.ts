"use server";

import { db } from "@/src/lib/db";

import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { error } from "console";

type SizeQuantity = { [size: string]: number };

const getSizeObjectFromArray = (array: any[]) => {
    let obj: any = {};
    for (let i = 0; i < (array.length || 0); i++) {
        obj[array[i].size] = array[i].quantity;
    }
    return obj;
}

const getKurtiByCode = async (code: string) => {
    const kurti: any = await db.kurti.findUnique({
        where: {
            code: code,
        },
        select: {
            id: true,
            sizes: true,
            reservedSizes: true,
        },
    });
    return kurti;
}

const getCartProductbyId = async (id: string) => {
    const cartProduct: any = await db.cartProduct.findUnique({
        where: {
            id: id,
        },
        select: {
            id: true,
            adminSideSizes: true,
            sizes: true,
        }
    })
    return cartProduct;
}

export const removeCartProduct = async (code: string, cartProductId: string) => {
    const kurti: any = await getKurtiByCode(code);
    const cartProduct: any = await getCartProductbyId(cartProductId);
    let size2: SizeQuantity = getSizeObjectFromArray(kurti.reservedSizes || []);
    let oldSelected: SizeQuantity = getSizeObjectFromArray(cartProduct.sizes || []);
    for (const key in oldSelected) {
        size2[key] = size2[key] - oldSelected[key];
    }
    let finalArray: any = [];
    for (const [key, value] of Object.entries(size2)) {
        if (value > 0) {
            finalArray.push({
                size: key,
                quantity: value,
            })
        }
    }
    const ret = await db.$transaction(async (transaction) => {
        try {
            const newKurti = await transaction.kurti.update({
                where: {
                    code: code
                },
                data: {
                    reservedSizes: finalArray,
                    lastUpdatedTime: getCurrTime(),
                }
            });
            const dlt = await transaction.cartProduct.update({
                where: {
                    id: cartProductId,
                },
                data: {
                    isRejected: true
                }
            });
            return {
                success: `${code} removed from cart.`
            }
        }catch {
            return {
                error: `Something went wrong, try again later.`
            }
        }
    })
    
    return ret;
    
}

const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}
export const getAddressesOfUser = async () => {

    const curUser = await currentUser();

    if (!curUser) {
        return { error: 'Something went wrong!' };
    }

    const addresses = await db.address.findMany({
        where: { userId: curUser.id },
    });

    return {
        success: 'Fetched Adresses',
        addresses: addresses
    };
}

export const addAddressesOfUser = async (data: any) => {

    const { address, zipCode } = data;
    const curUser = await currentUser();

    if (!curUser) {
        return { error: 'Something went wrong!' };
    }

    const addresses = await db.address.create({
        data: {
            user: {
                connect: { id: curUser.id }
            },
            address,
            zipCode
        }
    });

    return {
        success: 'Adress added',
        addresses: addresses
    };
}

async function generateOrderId() {
    const now = getCurrTime();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

    let orderId: string | null = null;
    let retries = 0;
    const maxRetries = 5;
    try {
        orderId = await db.$transaction(async (transaction) => {
            // Fetch the current counter and update it in one operation
            let counter = await transaction.orderCounter.findUnique({
                where: { date: datePart },
            });

            if (!counter) {
                counter = await transaction.orderCounter.create({
                    data: { date: datePart, sequence: 1 },
                });
            }
            else {
                counter = await transaction.orderCounter.update({
                    where: { date: datePart },
                    data: { sequence: { increment: 1 } },
                });
            }

            if (counter.sequence > 9999) {
                throw new Error('Daily order limit exceeded');
            }

            const sequencePart = counter.sequence.toString().padStart(4, '0');
            return `${datePart}-${sequencePart}`;
        });
    } catch (error) {
        console.error('Error generating order ID:', error);
    }


    if (!orderId) {
        return {
            error: 'Failed to generate order ID'
        }
    }
    return {
        success: 'OrderId generated',
        orderId: orderId,
    }
}

export const placeTheOrder = async (
    cartId: string,
    addressId: string,
    total: number
) => {
    const curUser = await currentUser();

    if (!curUser) {
        return { error: 'Something went wrong!' };
    }
    console.log(addressId, cartId, curUser.id);
    const orderIdRes: any = await generateOrderId();
    if (orderIdRes.error) {
        return orderIdRes;
    }
    const orderId = orderIdRes.orderId || '';
    // const 
    if (!orderId) {
        return { error: 'Try again after some time!' };
    }
    console.log(orderId);
    let order: any = null;
    let retries = 0;
    const maxRetries = 3;
    while (!order && retries < maxRetries) {
        try {
            order = await db.$transaction(async (transaction) => {
                // Fetch the current counter and update it in one operation
                const newOrder = await transaction.orders.create({
                    data: {
                        orderId: orderId,
                        user: {
                            connect: {
                                id: curUser.id
                            }
                        },
                        shippingAddress: {
                            connect: {
                                id: addressId,
                            }
                        },
                        cart: {
                            connect: {
                                id: cartId,
                            }
                        },
                        total: total,
                        trackingIdImages: [],
                        createdAt: getCurrTime(),
                        updatedAt: getCurrTime()
                    }
                });

                const newCart = await transaction.cart.update({
                    where: {
                        id: cartId,
                    },
                    data: {
                        isOrdered: 'ORDERED'
                    }
                });

                return newOrder;
            });
        } catch (error: any) {
            console.error('Error generating order:', error.message);
            retries++;
            if (retries >= maxRetries) {
                return null;
            }
            // Wait for a short time before retrying
            await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, retries)));
        }
    }

    if (!order) {
        return { error: 'Failed to place an order.' }
    }

    return {
        success: 'Order Placed Successfully',
        order: order
    }
}

export const deleteOrder = async (orderId: string) => {
    const curUser = await currentUser();

    if (!curUser) {
        return { error: 'Something went wrong!' };
    }
    console.log('orderId',orderId);
    let isDone: any = '';
    try {
        isDone = await db.$transaction(async (transaction) => {
            console.log(orderId);
            const cartProducts = await transaction.orders.findUnique({
                where: {
                    id: orderId,
                    // userId: curUser.id,
                    status: 'PENDING',
                },
                select: {
                    cartId: true,
                    cart: {
                        select: {
                            CartProduct: {
                                select: {
                                    id: true,
                                    kurti: {
                                        select: {
                                            code: true
                                        }
                                    },
                                }
                            }
                        }
                    },
                }
            });
            const cartId: any = cartProducts?.cartId;
            const products: any = cartProducts?.cart.CartProduct;
            if(cartId && products?.length && products.length > 0) {
                let cnt = 0;
                for (let i = 0; i < products.length; i++) {
                    console.log(products[i].kurti.code, products[i].id);
                    const deletedProduct = await removeCartProduct(products[i].kurti.code, products[i].id);
                    if (deletedProduct.success) {
                        cnt++;
                    }
                }
                if (cnt === products.length) {
                    await transaction.orders.update({
                        where: {
                            id: orderId,
                            // userId: curUser.id
                        },
                        data: {
                            status: 'CANCELLED'
                        }
                    });
                    return 'true';
                }
                return null;
            }
            return isDone;
        });
    }
    catch (e: any) {
        console.log('error:', e.message);
    }
    if(!isDone) {
        return {error: 'Please try again later'};
    }
    return {
        success: 'Order Rejected'
    }
}

export const readyOrder = async (orderId: any) => {
    const newOrder = await db.orders.update({
        where: {
            id: orderId,
            status: 'PENDING'
        },
        data: {
            status: 'PROCESSING'
        }
    })
    if(!newOrder || newOrder.status !== 'PROCESSING') {
        return {error: 'Something went wrong, refersh the page.'};
    }

    return {success: `Order ${newOrder.orderId} marked ready.`}
}

export const packedOrder = async (orderId: any) => {
    const newOrder = await db.orders.update({
        where: {
            id: orderId,
            status: 'PROCESSING'
        },
        data: {
            status: 'TRACKINGPENDING'
        }
    })
    if(!newOrder || newOrder.status !== 'TRACKINGPENDING') {
        return {error: 'Something went wrong, refersh the page.'};
    }

    return {success: `Order ${newOrder.orderId} marked ready.`}
}

export const shippedOrder = async (orderId: any, trackingId: any, shipCharge: number) => {
    console.log('orderId:', orderId);
    const newOrder = await db.orders.update({
        where: {
            orderId: orderId,
            status: 'TRACKINGPENDING'
        },
        data: {
            status: 'SHIPPED',
            trackingId: trackingId,
            shippingCharge: shipCharge,
        }
    })
    if(!newOrder || newOrder.status !== 'SHIPPED') {
        return {error: 'Something went wrong, refersh the page.'};
    }

    return {success: `Order ${newOrder.orderId} marked shipped.`}
}