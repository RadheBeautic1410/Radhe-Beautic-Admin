"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";

const requireAdmin = async () => {
  const user = await currentUser();
  return user?.role === UserRole.ADMIN ? user : null;
};

/**
 * Set a staff member's password. Sign-in compares the stored password as plain
 * text (see auth.config.ts), so it is stored the same way here - the staff tab
 * shows it to the admin.
 */
export const staffChangePassword = async (userId: string, newPassword: string) => {
  if (!(await requireAdmin())) return { error: "Unauthorized" };

  const password = (newPassword || "").trim();
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "User not found" };

  await db.user.update({ where: { id: userId }, data: { password } });
  return { success: "Password updated!", password };
};

export const staffDelete = async (userId: string) => {
  const admin = await requireAdmin();
  if (!admin) return { error: "Unauthorized" };
  if (admin.id === userId) return { error: "You cannot delete your own account." };

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.role === UserRole.ADMIN) return { error: "An ADMIN account cannot be deleted here." };

  try {
    await db.user.delete({ where: { id: userId } });
  } catch (e) {
    console.error("staffDelete failed", e);
    return {
      error:
        "This member has bills or other records linked to them, so they cannot be deleted. Remove their access by changing their role or un-verifying them instead.",
    };
  }
  return { success: `${target.name || "Member"} deleted` };
};
