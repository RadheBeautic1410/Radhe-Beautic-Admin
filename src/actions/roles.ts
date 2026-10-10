"use server";

import { db } from "@/src/lib/db";
import { currentRole } from "@/src/lib/auth";
import { ALL_MENU_ITEMS, SYSTEM_ROLES, defaultMenusForRole } from "@/src/lib/menus";
import { UserRole } from "@prisma/client";

const VALID_HREFS = new Set(ALL_MENU_ITEMS.map((m) => m.href));

const cleanMenus = (menus: unknown): string[] =>
  Array.from(new Set((Array.isArray(menus) ? menus : []).map(String))).filter((m) =>
    VALID_HREFS.has(m)
  );

const isAdmin = async () => (await currentRole()) === UserRole.ADMIN;

/** Create the system Role row for every fixed role that does not have one yet. */
const ensureSystemRoles = async () => {
  const existing = await db.role.findMany({
    where: { isSystem: true },
    select: { name: true },
  });
  const have = new Set(existing.map((r) => r.name));
  for (const role of SYSTEM_ROLES) {
    if (have.has(role)) continue;
    await db.role.create({
      data: {
        name: role,
        baseRole: role,
        menus: defaultMenusForRole(role),
        isSystem: true,
      },
    });
  }
};

/**
 * Roles for the Roles page and for the role pickers. Seeds the system roles on
 * first use, so the fixed roles show up with the menus they have today.
 */
export const listRoles = async () => {
  const role = await currentRole();
  if (role !== UserRole.ADMIN && role !== UserRole.MOD) return { error: "Unauthorized" };

  await ensureSystemRoles();
  // Counted in code: Prisma's groupBy panics on MongoDB for this shape.
  const [roles, users] = await Promise.all([
    db.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
    db.user.findMany({ select: { role: true, roleId: true } }),
  ]);

  const data = roles.map((r) => {
    // Users on a custom role point at it; users on a system role have no roleId
    // and are matched by their fixed role.
    const users_ = users.filter((u) =>
      r.isSystem ? !u.roleId && u.role === r.name : u.roleId === r.id
    ).length;
    return {
      id: r.id,
      name: r.name,
      baseRole: r.baseRole,
      menus: r.menus,
      isSystem: r.isSystem,
      userCount: users_,
    };
  });
  return { data };
};

export const saveRole = async (input: {
  id?: string;
  name: string;
  baseRole: UserRole;
  menus: string[];
}) => {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const menus = cleanMenus(input.menus);

  if (input.id) {
    const role = await db.role.findUnique({ where: { id: input.id } });
    if (!role) return { error: "Role not found" };
    if (role.name === UserRole.ADMIN && role.isSystem) {
      return { error: "The ADMIN role always has every menu and cannot be changed." };
    }
    // System roles keep their name and fixed role; only the menus change.
    const name = role.isSystem ? role.name : input.name.trim();
    if (!name) return { error: "Role name is required" };
    try {
      await db.role.update({
        where: { id: role.id },
        data: {
          name,
          menus,
          ...(role.isSystem ? {} : { baseRole: input.baseRole }),
        },
      });
    } catch {
      return { error: `A role named "${name}" already exists` };
    }
    return { success: "Role updated!" };
  }

  const name = input.name.trim();
  if (!name) return { error: "Role name is required" };
  const clash = await db.role.findUnique({ where: { name } });
  if (clash) return { error: `A role named "${name}" already exists` };

  await db.role.create({
    data: { name, baseRole: input.baseRole, menus, isSystem: false },
  });
  return { success: "Role created!" };
};

export const deleteRole = async (id: string) => {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const role = await db.role.findUnique({ where: { id } });
  if (!role) return { error: "Role not found" };
  if (role.isSystem) return { error: "Built-in roles cannot be deleted." };

  const inUse = await db.user.count({ where: { roleId: id } });
  if (inUse > 0) {
    return { error: `${inUse} user(s) still have this role. Move them to another role first.` };
  }
  await db.role.delete({ where: { id } });
  return { success: "Role deleted!" };
};
