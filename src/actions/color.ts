"use server";

import { db } from "@/src/lib/db";

export const colorAddition = async (data: { name: string }) => {
  const { name } = data;
  if (!name || name.trim() === "") {
    return { error: "Color name is required" };
  }

  const normalized = name.trim().toLowerCase().replace(/\s+/g, "");

  try {
    const existing = await db.color.findUnique({
      where: { normalizedLowerCase: normalized },
    });

    if (existing) {
      return { error: "Color already exists!" };
    }

    const newColor = await db.color.create({
      data: {
        name: name.trim(),
        normalizedLowerCase: normalized,
      },
    });

    return { success: "Color Added!", data: newColor };
  } catch (error: any) {
    console.error("Color addition error:", error);
    return { error: "Something went wrong!" };
  }
};
