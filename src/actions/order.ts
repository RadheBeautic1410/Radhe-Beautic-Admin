"use server";

import { db } from "@/src/lib/db";

import { currentRole, currentUser } from "@/src/lib/auth";

import { UserRole } from "@prisma/client";
import { notifyResellerShipped } from "@/src/lib/reseller-order-notifications";
import { error } from "console";

type SizeQuantity = { [size: string]: number };

const getSizeObjectFromArray = (array: any[]) => {
  let obj: any = {};
  for (let i = 0; i < (array.length || 0); i++) {
    obj[array[i].size] = array[i].quantity;
  }
  return obj;
};

/**
 * Releases the sizes a cart product had reserved on its kurti.
 * Runs on the caller's transaction client so the release commits — or rolls back —
 * together with whatever order change triggered it.
 * Returns false when the kurti/cart product no longer exists.
 */
const releaseCartProductReservation = async (
  transaction: any,
  code: string,
  cartProductId: string
) => {
  const kurti = await transaction.kurti.findUnique({
    where: { code: code },
    select: { id: true, reservedSizes: true },
  });
  const cartProduct = await transaction.cartProduct.findUnique({
    where: { id: cartProductId },
    select: { id: true, sizes: true, isRejected: true },
  });
  if (!kurti || !cartProduct) {
    return false;
  }
  // Already released by an earlier attempt; releasing again would double-decrement.
  if (cartProduct.isRejected) {
    return true;
  }

  let reserved: SizeQuantity = getSizeObjectFromArray(
    (kurti.reservedSizes as any[]) || []
  );
  let selected: SizeQuantity = getSizeObjectFromArray(
    (cartProduct.sizes as any[]) || []
  );
  for (const key in selected) {
    reserved[key] = (reserved[key] || 0) - selected[key];
  }
  let finalArray: any = [];
  for (const [key, value] of Object.entries(reserved)) {
    if (value > 0) {
      finalArray.push({
        size: key,
        quantity: value,
      });
    }
  }

  const okDate = await getCurrTime();
  await transaction.kurti.update({
    where: { code: code },
    data: {
      reservedSizes: finalArray,
      lastUpdatedTime: okDate,
    },
  });
  await transaction.cartProduct.update({
    where: { id: cartProductId },
    data: {
      isRejected: true,
    },
  });
  return true;
};

export const removeCartProduct = async (
  code: string,
  cartProductId: string
) => {
  try {
    const released = await db.$transaction((transaction) =>
      releaseCartProductReservation(transaction, code, cartProductId)
    );
    if (!released) {
      return {
        error: `Something went wrong, try again later.`,
      };
    }
    return {
      success: `${code} removed from cart.`,
    };
  } catch {
    return {
      error: `Something went wrong, try again later.`,
    };
  }
};

const getCurrTime = async () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};
export const getAddressesOfUser = async () => {
  const curUser = await currentUser();

  if (!curUser) {
    return { error: "Something went wrong!" };
  }

  const addresses = await db.address.findMany({
    where: { userId: curUser.id },
  });

  return {
    success: "Fetched Adresses",
    addresses: addresses,
  };
};

export const addAddressesOfUser = async (data: any) => {
  const { address, zipCode } = data;
  const curUser = await currentUser();

  if (!curUser) {
    return { error: "Something went wrong!" };
  }

  const addresses = await db.address.create({
    data: {
      user: {
        connect: { id: curUser.id },
      },
      address,
      zipCode,
    },
  });

  return {
    success: "Adress added",
    addresses: addresses,
  };
};

async function generateOrderId() {
  const now = await getCurrTime();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");

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
      } else {
        counter = await transaction.orderCounter.update({
          where: { date: datePart },
          data: { sequence: { increment: 1 } },
        });
      }

      if (counter.sequence > 9999) {
        throw new Error("Daily order limit exceeded");
      }

      const sequencePart = counter.sequence.toString().padStart(4, "0");
      return `${datePart}-${sequencePart}`;
    });
  } catch (error) {
    console.error("Error generating order ID:", error);
  }

  if (!orderId) {
    return {
      error: "Failed to generate order ID",
    };
  }
  return {
    success: "OrderId generated",
    orderId: orderId,
  };
}

// export const placeTheOrder = async (
//   cartId: string,
//   addressId: string,
//   total: number
// ) => {
//   const curUser = await currentUser();

//   if (!curUser) {
//     return { error: "Something went wrong!" };
//   }
//   console.log(addressId, cartId, curUser.id);
//   const orderIdRes: any = await generateOrderId();
//   if (orderIdRes.error) {
//     return orderIdRes;
//   }
//   const orderId = orderIdRes.orderId || "";
//   // const
//   if (!orderId) {
//     return { error: "Try again after some time!" };
//   }
//   console.log(orderId);
//   let order: any = null;
//   let retries = 0;
//   const maxRetries = 3;
//   while (!order && retries < maxRetries) {
//     try {
//       order = await db.$transaction(async (transaction) => {
//         // Fetch the current counter and update it in one operation
//         const okDate = await getCurrTime();
//         const newOrder = await transaction.orders.create({
//           data: {
//             orderId: orderId,
//             user: {
//               connect: {
//                 id: curUser.id,
//               },
//             },
//             shippingAddress: {
//               connect: {
//                 id: addressId,
//               },
//             },
//             cart: {
//               connect: {
//                 id: cartId,
//               },
//             },
//             total: total,
//             trackingIdImages: [],
//             customerId,
//             createdAt: okDate,
//             updatedAt: okDate,
//           },
//         });

//         const newCart = await transaction.cart.update({
//           where: {
//             id: cartId,
//           },
//           data: {
//             isOrdered: "ORDERED",
//           },
//         });

//         return newOrder;
//       });
//     } catch (error: any) {
//       console.error("Error generating order:", error.message);
//       retries++;
//       if (retries >= maxRetries) {
//         return null;
//       }
//       // Wait for a short time before retrying
//       await new Promise((resolve) =>
//         setTimeout(resolve, 100 * Math.pow(2, retries))
//       );
//     }
//   }

//   if (!order) {
//     return { error: "Failed to place an order." };
//   }

//   return {
//     success: "Order Placed Successfully",
//     order: order,
//   };
// };

export const deleteOrder = async (orderId: string) => {
  const curUser = await currentUser();

  if (!curUser) {
    return { error: "Something went wrong!" };
  }

  try {
    return await db.$transaction(
      async (transaction) => {
        const order = await transaction.orders.findUnique({
          where: {
            id: orderId,
          },
          select: {
            status: true,
            cartId: true,
            cart: {
              select: {
                CartProduct: {
                  select: {
                    id: true,
                    isRejected: true,
                    kurti: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!order) {
          return { error: "Order not found." };
        }
        if (order.status !== "PENDING" && order.status !== "PROCESSING") {
          return { error: `Order is already ${order.status.toLowerCase()}.` };
        }

        const products = order.cart?.CartProduct || [];
        for (const product of products) {
          const released = await releaseCartProductReservation(
            transaction,
            product.kurti.code,
            product.id
          );
          // Abort the whole rejection so stock is never released halfway.
          if (!released) {
            throw new Error(
              `Could not release reserved stock for ${product.kurti.code}`
            );
          }
        }

        await transaction.walletRequest.updateMany({
          where: {
            linkedOrderId: orderId,
            status: "PENDING",
          },
          data: {
            status: "REJECTED",
            approvedBy: curUser.id,
            approvedAt: new Date(),
          },
        });
        await transaction.orders.update({
          where: {
            id: orderId,
          },
          data: {
            status: "REJECTED",
          },
        });

        return {
          success: "Order Rejected",
        };
      },
      { maxWait: 10000, timeout: 30000 }
    );
  } catch (e: any) {
    console.log("deleteOrder error:", e.message);
    return { error: "Please try again later" };
  }
};

export const readyOrder = async (orderId: any) => {
  const newOrder = await db.orders.update({
    where: {
      id: orderId,
      status: "PENDING",
    },
    data: {
      status: "PROCESSING",
    },
  });
  if (!newOrder || newOrder.status !== "PROCESSING") {
    return { error: "Something went wrong, refersh the page." };
  }

  return { success: `Order ${newOrder.orderId} marked ready.` };
};

export const packedOrder = async (orderId: any) => {
  const newOrder = await db.orders.update({
    where: {
      id: orderId,
      status: "PROCESSING",
    },
    data: {
      status: "TRACKINGPENDING",
    },
  });
  if (!newOrder || newOrder.status !== "TRACKINGPENDING") {
    return { error: "Something went wrong, refersh the page." };
  }

  return { success: `Order ${newOrder.orderId} marked ready.` };
};

export const shippedOrder = async (
  orderId: any,
  trackingId: any,
  shipCharge: number,
  selectedCourier: any = ""
) => {
  const newOrder = await db.orders.update({
    where: {
      orderId: orderId,
      status: "TRACKINGPENDING",
    },
    data: {
      status: "SHIPPED",
      trackingId: trackingId,
      shippingCharge: shipCharge,
      courier: selectedCourier,
    },
  });
  if (!newOrder || newOrder.status !== "SHIPPED") {
    return { error: "Something went wrong, refersh the page." };
  }

  // Tell the reseller their parcel is on the way. Claimed once, so editing the
  // tracking details later won't send a second shipping message.
  await notifyResellerShipped(newOrder.id);

  return { success: `Order ${newOrder.orderId} marked shipped.` };
};
