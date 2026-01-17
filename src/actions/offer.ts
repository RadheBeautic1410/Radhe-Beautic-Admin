"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";

interface OfferAdditionProps {
  name: string;
  qty: number;
  totalAmount?: number;
  categories: string[]; // Array of category IDs
  image?: string;
  description?: string;
}

export const createOffer = async (data: OfferAdditionProps) => {
  const user = await currentUser();
  const role = await currentRole();

  if (!user || role !== UserRole.ADMIN) {
    return { error: "Unauthorized" };
  }

  const { name, qty, totalAmount, categories, image, description } = data;

  if (name.length === 0) {
    return { error: "Offer name can't be empty" };
  }

  if (qty <= 0) {
    return { error: "Quantity must be greater than 0" };
  }

  if (!categories || categories.length === 0) {
    return { error: "At least one category must be selected" };
  }

  try {
    const offer = await db.offer.create({
      data: {
        name,
        qty,
        totalAmount: totalAmount ?? null,
        categories,
        image: image || "",
        description: description || null,
      },
    });

    return { success: "Offer created successfully!", data: offer };
  } catch (error: any) {
    console.error("Error creating offer:", error);
    return { error: error.message || "Failed to create offer" };
  }
};

export const getAllOffers = async () => {
  const user = await currentUser();
  const role = await currentRole();

  if (!user || role !== UserRole.ADMIN) {
    return { error: "Unauthorized" };
  }

  try {
    const offers = await db.offer.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: offers };
  } catch (error: any) {
    console.error("Error fetching offers:", error);
    return { error: error.message || "Failed to fetch offers" };
  }
};

export const updateOffer = async (offerId: string, data: OfferAdditionProps) => {
  const user = await currentUser();
  const role = await currentRole();

  if (!user || role !== UserRole.ADMIN) {
    return { error: "Unauthorized" };
  }

  const { name, qty, totalAmount, categories, image, description } = data;

  if (name.length === 0) {
    return { error: "Offer name can't be empty" };
  }

  if (qty <= 0) {
    return { error: "Quantity must be greater than 0" };
  }

  if (!categories || categories.length === 0) {
    return { error: "At least one category must be selected" };
  }

  try {
    const offer = await db.offer.update({
      where: {
        id: offerId,
      },
      data: {
        name,
        qty,
        totalAmount: totalAmount ?? null,
        categories,
        image: image || "",
        description: description || null,
      },
    });

    return { success: "Offer updated successfully!", data: offer };
  } catch (error: any) {
    console.error("Error updating offer:", error);
    return { error: error.message || "Failed to update offer" };
  }
};

export const deleteOffer = async (offerId: string) => {
  const user = await currentUser();
  const role = await currentRole();

  if (!user || role !== UserRole.ADMIN) {
    return { error: "Unauthorized" };
  }

  try {
    await db.offer.delete({
      where: {
        id: offerId,
      },
    });

    return { success: "Offer deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting offer:", error);
    return { error: error.message || "Failed to delete offer" };
  }
};

