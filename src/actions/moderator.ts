"use server";

import { db } from "@/src/lib/db";
import { getUserById } from "@/src/data/user";
import { UserRole } from "@prisma/client";
import { checkPermission } from "@/src/lib/permissions/server";
import { canGrantAll, resolveAccess } from "@/src/lib/permissions/resolve";
import { getCurrTime } from "./kurti";
import crypto from "crypto";

interface moderatorUpdateProps {
  role: UserRole | undefined;
  isVerified: boolean;
  id: string;
  groupName?: string; // 👈 allow groupName
  creditLimit?: number;
  /** Role table id chosen in the editor; system roles are applied through `role`. */
  customRoleId?: string | null;
  /** Monthly salary; only an ADMIN can set it. */
  salary?: number | null;
}

/** The permissions a user would have on a given fixed role / custom role row. */
const permissionsOnRole = async (role: UserRole, roleId: string | null | undefined) => {
  const row = roleId
    ? await db.role.findUnique({ where: { id: roleId } })
    : await db.role.findUnique({ where: { name: role } }).catch(() => null);
  return resolveAccess({ role, roleRow: row, hasCustomRole: !!roleId && !!row }).permissions;
};

export const moderatorUpdate = async (data: moderatorUpdateProps) => {
  const guard = await checkPermission("staff.edit");
  if (!guard.ok) return { error: guard.error };
  const actor = guard.access;
  const user = { id: actor.userId };
  const currTime = await getCurrTime();

  const { role, isVerified, id, groupName, creditLimit, customRoleId, salary } = data;

  const dbUser = await getUserById(id);

  if (!dbUser) {
    return { error: "User not found" };
  }

  // Nobody edits an account that is more powerful than their own.
  if (!actor.isAdmin) {
    const targetNow = await permissionsOnRole(dbUser.role, dbUser.roleId);
    if (!canGrantAll(actor, targetNow)) {
      return { error: "You cannot edit a user who has more access than you." };
    }
  }

  const changesRole =
    (role !== undefined && role !== dbUser.role) ||
    (customRoleId !== undefined && customRoleId !== (dbUser.roleId ?? null));
  if (changesRole) {
    // Changing who someone is needs its own permission, and can never hand out
    // more access than the person making the change holds.
    if (!actor.isAdmin && !actor.permissions.has("staff.assignRole")) {
      return { error: "Unauthorized" };
    }
    if (id === actor.userId) {
      return { error: "You cannot change your own role." };
    }
    const nextRole = role ?? dbUser.role;
    const nextRoleId = customRoleId === undefined ? dbUser.roleId : customRoleId;
    if (nextRoleId) {
      const row = await db.role.findUnique({ where: { id: nextRoleId } });
      if (!row) return { error: "Role not found" };
    }
    if (!actor.isAdmin) {
      if (nextRole === UserRole.ADMIN || nextRole === UserRole.MOD) {
        return { error: "Only an ADMIN can assign this role." };
      }
      const next = await permissionsOnRole(nextRole, nextRoleId);
      if (!canGrantAll(actor, next)) {
        return { error: "You cannot give a user more access than you have." };
      }
    }
  }

  const mayEditSalary = actor.isAdmin || actor.permissions.has("staff.viewSalary");

  const oldCreditLimit = Number(dbUser.creditLimit ?? 0);

  const updatedUser = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: id },
      data: {
        role: role,
        // null clears a previous custom role (back to the fixed role)
        roleId: customRoleId === undefined ? undefined : customRoleId,
        isVerified: isVerified,
        groupName: groupName,
        creditLimit: typeof creditLimit === "number" ? creditLimit : undefined,
        salary: mayEditSalary && salary !== undefined ? salary : undefined,
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
  const guard = await checkPermission("staff.resetPassword");
  if (!guard.ok) return { error: guard.error };

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
