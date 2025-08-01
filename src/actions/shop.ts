"use server"
import { db } from "@/src/lib/db";

export const getShopDetails = async (shopId: string) => {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
  });
  return shop;
};

export const getShopList = async () => {
  try {
    const shopList = await db.shop.findMany();
    console.log("🚀 ~ getShopList ~ shopList:", shopList)
    return shopList;
  } catch (error) {
    console.log("🚀 ~ getShopList ~ error:", error)
    console.error(error);
    throw new Error("Failed to get shop list");
  }
};
