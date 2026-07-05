"use server";

import { db } from "@/src/lib/db";
import { getUserById } from "@/src/data/user";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { getCurrTime } from "./kurti";
import crypto from "crypto";

interface moderatorUpdateProps {
  role: UserRole | undefined;
  isVerified: boolean;
  id: string;
  groupName?: string; // 👈 allow groupName
  creditLimit?: number;
}

export const moderatorUpdate = async (data: moderatorUpdateProps) => {
  const user = await currentUser();
  const currTime = await getCurrTime();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { role, isVerified, id, groupName, creditLimit } = data;

  const dbUser = await getUserById(id);

  if (!dbUser) {
    return { error: "Unauthorized" };
  }

  const oldCreditLimit = Number(dbUser.creditLimit ?? 0);

  const updatedUser = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: id },
      data: {
        role: role,
        isVerified: isVerified,
        groupName: groupName,
        creditLimit: typeof creditLimit === "number" ? creditLimit : undefined,
        verifiedBy: user.id,
        verifiedAt: new Date(),
        emailVerified: new Date(),
      } as any,
    });

    const newCreditLimit = Number(u.creditLimit ?? 0);
    if (
      u.role === UserRole.RESELLER &&
      newCreditLimit > oldCreditLimit
    ) {
      await tx.walletHistory.create({
        data: {
          userId: id,
          amount: newCreditLimit - oldCreditLimit,
          type: "DEBIT",
          paymentMethod: "admin-credit-line",
          paymentType: "Credit limit set (admin)",
        },
      });
    }

    return u;
  });

  if (role == UserRole.RESELLER) {
    await db.resellersCustomer.create({
      data: {
        resellerId: updatedUser.id,
        name: updatedUser.name || "Default User",
        createdAt: currTime,
        updatedAt: currTime,
      },
    });
  }

  return { success: "Settings Updated!", updatedUser };
};

export const adminResetPassword = async (userId: string, newPassword: string) => {
  const user = await currentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return { error: "Unauthorized" };
  }

  const dbUser = await getUserById(userId);
  if (!dbUser) {
    return { error: "User not found" };
  }

  const hashedPassword = crypto.createHash("sha256").update(newPassword).digest("hex");

  await db.user.update({
    where: { id: userId },
    data: {
      password: hashedPassword,
    },
  });

  return { success: "Password updated successfully!" };
};
