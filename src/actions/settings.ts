"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/src/lib/db";
import { SettingSchema } from "@/src/schemas";
import { getUserById } from "@/src/data/user";
import { currentUser } from "@/src/lib/auth";
import { removeImage } from "../lib/upload";

export const settings = async (values: z.infer<typeof SettingSchema>) => {
  const user = await currentUser();

  if (!user || !user.id) {
    return { error: "Unauthorized" };
  }

  const dbUser = await getUserById(user.id);

  if (!dbUser) {
    return { error: "Unauthorized" };
  }

  if (values.password && values.newPassword && dbUser.password) {
    const passwordsMatch = values.password === dbUser.password;

    if (!passwordsMatch) {
      return { error: "Incorrect password!" };
    }

    const hashedPassword = values.newPassword;
    values.password = hashedPassword;
    values.newPassword = undefined;
  }

  await db.user.update({
    where: { id: dbUser.id },
    data: {
      ...values,
    },
  });

  return { success: "Settings Updated!" };
};
export const getNewReleseList = async () => {
  const newReleseDataList = await db.newReleseSetting.findMany();
  return { success: true, newReleseDataList: newReleseDataList };
};

export async function updateNewRelese(
  id: string,
  data: {
    title: string;
    startPrice: number;
    endPrice: number;
    imageUrl?: string;
    imagePath?: string;
  }
) {
  try {
    const existing = await db.newReleseSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, message: "Kurti not found" };
    }

    // if new imagePath is provided & it's different → delete old image
    if (data.imagePath && data.imagePath !== existing.imagePath) {
      if (existing.imagePath) {
        await removeImage(existing.imagePath);
      }
    }

    const updated = await db.newReleseSetting.update({
      where: { id },
      data: {
        title: data.title,
        startPrice: data.startPrice,
        endPrice: data.endPrice,
        imageUrl: data.imageUrl ?? existing.imageUrl,
        imagePath: data.imagePath ?? existing.imagePath,
      },
    });

    return { success: true, updated };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
