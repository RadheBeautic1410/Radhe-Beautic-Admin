"use server";

import { db } from "@/src/lib/db";
import { getUserById } from "@/src/data/user";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { getCurrTime } from "./kurti";

interface moderatorUpdateProps {
  role: UserRole | undefined;
  isVerified: boolean;
  id: string;
  groupName?: string; // 👈 allow groupName
}

export const moderatorUpdate = async (data: moderatorUpdateProps) => {
  const user = await currentUser();
  const currTime = await getCurrTime();
  if (!user) {
    return { error: "Unauthorized" };
  }

  const { role, isVerified, id, groupName } = data;

  const dbUser = await getUserById(id);

  if (!dbUser) {
    return { error: "Unauthorized" };
  }

  const updatedUser = await db.user.update({
    where: { id: id },
    data: {
      role: role,
      isVerified: isVerified,
      groupName: groupName,
      verifiedBy: user.id,
      verifiedAt: new Date(),
      emailVerified: new Date(),
    },
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
