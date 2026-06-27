"use server"

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";

export async function getHomepageSliders() {
  try {
    return await db.homepageSlider.findMany({
      orderBy: { createdAt: "asc" }
    });
  } catch (error) {
    console.error("Failed to get sliders:", error);
    return [];
  }
}

export async function addHomepageSlider(data: {
  imageUrl: string;
  mobileUrl?: string;
  imagePath: string;
  mobilePath?: string;
  title?: string;
  subtitle?: string;
}) {
  try {
    const slider = await db.homepageSlider.create({
      data
    });
    revalidatePath("/");
    return { success: true, slider };
  } catch (error) {
    console.error("Failed to add slider:", error);
    return { success: false, error: "Failed to add slider image" };
  }
}

export async function deleteHomepageSlider(id: string) {
  try {
    await db.homepageSlider.delete({
      where: { id }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete slider:", error);
    return { success: false, error: "Failed to delete slider image" };
  }
}

export async function getKurtiTypeImages() {
  try {
    return await db.kurtiTypeImage.findMany();
  } catch (error) {
    console.error("Failed to get kurti type images:", error);
    return [];
  }
}

export async function saveKurtiTypeImage(data: {
  key: string;
  imageUrl: string;
  imagePath: string;
}) {
  try {
    const kurtiTypeImage = await db.kurtiTypeImage.upsert({
      where: { key: data.key },
      update: {
        imageUrl: data.imageUrl,
        imagePath: data.imagePath,
      },
      create: {
        key: data.key,
        imageUrl: data.imageUrl,
        imagePath: data.imagePath,
      }
    });
    revalidatePath("/");
    return { success: true, kurtiTypeImage };
  } catch (error) {
    console.error("Failed to save kurti type image:", error);
    return { success: false, error: "Failed to save kurti type image" };
  }
}

export async function deleteKurtiTypeImage(key: string) {
  try {
    await db.kurtiTypeImage.delete({
      where: { key }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete kurti type image:", error);
    return { success: false, error: "Failed to delete kurti type image" };
  }
}
