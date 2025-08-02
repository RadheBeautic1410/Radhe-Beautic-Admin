"use server"
import { db } from "@/src/lib/db";

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
        shop: true
      }
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
    console.log("🚀 ~ getShopList ~ error:", error)
    console.error(error);
    throw new Error("Failed to get shop list");
  }
};
