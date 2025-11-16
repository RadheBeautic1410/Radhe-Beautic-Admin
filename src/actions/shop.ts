"use server";
import { db } from "@/src/lib/db";

type PaymentTypeSummary = {
  shopName: string;
  paymentType: string;
  totalKurtis: number;
  totalAmount: number;
};
export const getShopDetails = async (shopId: string) => {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
  });
  return shop;
};

export const getUserShop = async (userId: string) => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        shop: true,
      },
    });
    return user?.shop || null;
  } catch (error) {
    console.error("Error getting user shop:", error);
    throw new Error("Failed to get user shop");
  }
};

export const getShopList = async () => {
  try {
    const shopList = await db.shop.findMany();
    return shopList;
  } catch (error) {
    console.log("🚀 ~ getShopList ~ error:", error);
    console.error(error);
    throw new Error("Failed to get shop list");
  }
};

export const getHallSaleShops = async () => {
  try {
    const hallSaleShops = await db.shop.findMany({
      where: {
        isHallSell: true,
      },
    });
    return hallSaleShops;
  } catch (error) {
    console.log("🚀 ~ getHallSaleShops ~ error:", error);
    console.error(error);
    throw new Error("Failed to get hall sale shops");
  }
};

export async function getDailyPaymentWiseKurtiSummary(
  startDate: Date,
  endDate: Date,
  shopId?: string
): Promise<PaymentTypeSummary[]> {
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const batches = await db.offlineSellBatch.findMany({
    where: {
      saleTime: {
        gte: startOfDay,
        lte: endOfDay,
      },
      ...(shopId && { shopId }),
    },
    include: {
      sales: {
        select: {
          quantity: true,
        },
      },
      shop: true,
    },
  });

  const map = new Map<string, PaymentTypeSummary>();

  for (const batch of batches) {
    const pt = batch.paymentType || "UNKNOWN";
    const shopName = batch.shop?.shopName ?? "Unknown Shop";

    // grouping key = shop + paymentType
    const key = `${shopName}-${pt}`;

    const batchKurtis = batch.sales.reduce((sum, s) => {
      return sum + (s.quantity ?? 1);
    }, 0);

    const existing = map.get(key) ?? {
      paymentType: pt,
      shopName,
      totalKurtis: 0,
      totalAmount: 0,
    };

    existing.totalKurtis += batchKurtis;
    existing.totalAmount += batch.totalAmount;

    map.set(key, existing);
  }

  return Array.from(map.values());
}
