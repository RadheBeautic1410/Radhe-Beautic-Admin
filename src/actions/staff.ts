"use server";

import { db } from "@/src/lib/db";
import { UserRole } from "@prisma/client";
import { checkPermission } from "@/src/lib/permissions/server";

/**
 * Set a staff member's password. Sign-in compares the stored password as plain
 * text (see auth.config.ts), so it is stored the same way here - the staff tab
 * shows it to the admin.
 */
export const staffChangePassword = async (userId: string, newPassword: string) => {
  const guard = await checkPermission("staff.resetPassword");
  if (!guard.ok) return { error: guard.error };

  const password = (newPassword || "").trim();
  if (password.length < 6) return { error: "Password must be at least 6 characters" };

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return { error: "User not found" };

  await db.user.update({ where: { id: userId }, data: { password } });
  return { success: "Password updated!", password };
};

export const staffDelete = async (userId: string) => {
  const guard = await checkPermission("staff.delete");
  if (!guard.ok) return { error: guard.error };
  if (guard.access.userId === userId) return { error: "You cannot delete your own account." };

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
