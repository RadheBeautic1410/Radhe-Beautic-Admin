"use server"

import { db } from "@/src/lib/db";
import { revalidatePath } from "next/cache";
import { permissionError } from "@/src/lib/permissions/server";

// Which home page the banner slides belong to. Reseller slides live in their
// own collection so the customer storefront query never sees them.
export type SliderPanel = "customer" | "reseller";

export async function getHomepageSliders(panel: SliderPanel = "customer") {
  const denied = await permissionError("homepageSliders.view");
  if (denied) return [];
  try {
    const args = { orderBy: { createdAt: "asc" as const } };
    return panel === "reseller"
      ? await db.resellerSlider.findMany(args)
      : await db.homepageSlider.findMany(args);
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
}, panel: SliderPanel = "customer") {
  const denied = await permissionError("homepageSliders.create");
  if (denied) return { success: false as const, error: denied.error };
  try {
    const slider = panel === "reseller"
      ? await db.resellerSlider.create({ data })
      : await db.homepageSlider.create({ data });
    revalidatePath("/");
    return { success: true, slider };
  } catch (error) {
    console.error("Failed to add slider:", error);
    return { success: false, error: "Failed to add slider image" };
  }
}

export async function deleteHomepageSlider(id: string, panel: SliderPanel = "customer") {
  const denied = await permissionError("homepageSliders.delete");
  if (denied) return { success: false as const, error: denied.error };
  try {
    if (panel === "reseller") {
      await db.resellerSlider.delete({ where: { id } });
    } else {
      await db.homepageSlider.delete({ where: { id } });
    }
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete slider:", error);
    return { success: false, error: "Failed to delete slider image" };
  }
}

export async function getKurtiTypeImages() {
  const denied = await permissionError("kurtiTypes.view");
  if (denied) return [];
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
  const denied = await permissionError("kurtiTypes.edit");
  if (denied) return { success: false as const, error: denied.error };
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
  const denied = await permissionError("kurtiTypes.delete");
  if (denied) return { success: false as const, error: denied.error };
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
