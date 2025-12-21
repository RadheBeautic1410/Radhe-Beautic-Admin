"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { currentRole } from "@/src/lib/auth";

export interface OtherProductData {
  categoryName: string;
  productType: string;
  images: { url: string }[];
}

export const createOtherProduct = async (data: OtherProductData) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || (role !== "ADMIN" && role !== "UPLOADER")) {
      return { error: "Unauthorized" };
    }

    if (!data.categoryName || !data.productType) {
      return { error: "Category name and product type are required" };
    }

    if (!data.images || data.images.length === 0) {
      return { error: "At least one image is required" };
    }

    const newProduct = await db.otherProduct.create({
      data: {
        categoryName: data.categoryName,
        productType: data.productType,
        images: data.images,
      },
    });

    return { success: "Product created successfully!", data: newProduct };
  } catch (error: any) {
    console.error("Error creating other product:", error);
    return { error: error.message || "Failed to create product" };
  }
};

export const updateOtherProduct = async (
  id: string,
  data: OtherProductData
) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || (role !== "ADMIN" && role !== "UPLOADER")) {
      return { error: "Unauthorized" };
    }

    if (!data.categoryName || !data.productType) {
      return { error: "Category name and product type are required" };
    }

    if (!data.images || data.images.length === 0) {
      return { error: "At least one image is required" };
    }

    const updatedProduct = await db.otherProduct.update({
      where: { id },
      data: {
        categoryName: data.categoryName,
        productType: data.productType,
        images: data.images,
      },
    });

    return { success: "Product updated successfully!", data: updatedProduct };
  } catch (error: any) {
    console.error("Error updating other product:", error);
    return { error: error.message || "Failed to update product" };
  }
};

export const deleteOtherProduct = async (id: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || (role !== "ADMIN" && role !== "UPLOADER")) {
      return { error: "Unauthorized" };
    }

    // Soft delete
    const deletedProduct = await db.otherProduct.update({
      where: { id },
      data: { isDeleted: true },
    });

    return { success: "Product deleted successfully!", data: deletedProduct };
  } catch (error: any) {
    console.error("Error deleting other product:", error);
    return { error: error.message || "Failed to delete product" };
  }
};

export const getOtherProductById = async (id: string) => {
  try {
    const product = await db.otherProduct.findUnique({
      where: { id, isDeleted: false },
    });

    if (!product) {
      return { error: "Product not found" };
    }

    return { data: product };
  } catch (error: any) {
    console.error("Error fetching other product:", error);
    return { error: error.message || "Failed to fetch product" };
  }
};

