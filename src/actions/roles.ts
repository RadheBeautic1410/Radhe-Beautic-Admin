"use server";

import { db } from "@/src/lib/db";
import { UserRole } from "@prisma/client";
import { ALL_MENU_ITEMS, SYSTEM_ROLES, defaultMenusForRole } from "@/src/lib/menus";
import { MODULES, sanitizePermissions } from "@/src/lib/permissions/registry";
import { canGrantAll, resolveAccess, type RoleRowLike } from "@/src/lib/permissions/resolve";
import { checkPermission, permissionError } from "@/src/lib/permissions/server";

/** Fixed roles a custom role may act as. ADMIN and MOD are never selectable. */
const BASE_ROLES = SYSTEM_ROLES.filter((r) => r !== UserRole.ADMIN && r !== UserRole.MOD);

/** The sidebar hrefs implied by a permission set (kept in `Role.menus` while it still exists). */
const menusFor = (permissions: readonly string[]): string[] => {
  const have = new Set(permissions);
  const known = new Set(ALL_MENU_ITEMS.map((m) => m.href));
  return MODULES.filter((m) => m.menu && known.has(m.menu) && have.has(`${m.key}.view`)).map(
    (m) => m.menu as string
  );
};

/** Create the system Role row for every fixed role that does not have one yet. */
const ensureSystemRoles = async () => {
  const existing = await db.role.findMany({
    where: { isSystem: true },
    select: { name: true },
  });
  const have = new Set(existing.map((r) => r.name));
  for (const role of SYSTEM_ROLES) {
    if (have.has(role)) continue;
    // permissionsSetAt stays null: until an admin saves the role, its access is
    // still derived from menus + base role, exactly as before.
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

const effectivePermissions = (row: RoleRowLike) =>
  resolveAccess({
    role: row.isSystem ? (row.name as UserRole) : row.baseRole,
    roleRow: row,
    hasCustomRole: !row.isSystem,
  });

/**
 * Roles for the Roles page and for the role pickers. Seeds the system roles on
 * first use, so the fixed roles show up with the access they have today.
 */
export const listRoles = async () => {
  const denied = await permissionError(["roles.view", "staff.view", "staff.assignRole"]);
  if (denied) return denied;

  await ensureSystemRoles();
  // Counted in code: Prisma's groupBy panics on MongoDB for this shape.
  const [roles, users] = await Promise.all([
    db.role.findMany({ orderBy: [{ isSystem: "desc" }, { name: "asc" }] }),
    db.user.findMany({ select: { role: true, roleId: true } }),
  ]);

  const data = roles.map((r) => {
    // Users on a custom role point at it; users on a system role have no roleId
    // and are matched by their fixed role.
    const count = users.filter((u) =>
      r.isSystem ? !u.roleId && u.role === r.name : u.roleId === r.id
    ).length;
    const effective = effectivePermissions(r);
    return {
      id: r.id,
      name: r.name,
      baseRole: r.baseRole,
      menus: r.menus,
      permissions: effective.permissions,
      /** True while the role is still on the old menu model (never saved from the matrix). */
      legacy: effective.fromLegacy,
      isSystem: r.isSystem,
      userCount: count,
      updatedAt: r.updatedAt.toISOString(),
    };
  });
  return { data };
};

const LOCKOUT_ERROR =
  'Roles & Permissions must stay open for at least one role that has users. Keep "Roles & Permissions" (view and edit) ticked here, or give it to a role that already has a user.';

/**
 * The Roles page must stay reachable: after a change at least one role that has
 * a user on it must still be able to view and edit roles, otherwise trimming the
 * ADMIN role (or any role) could lock everybody out of this page.
 */
const rolesPageStaysReachable = async (changed: {
  id: string;
  baseRole: UserRole;
  permissions: string[];
}) => {
  const [roles, users] = await Promise.all([
    db.role.findMany(),
    db.user.findMany({ select: { role: true, roleId: true } }),
  ]);
  // A plain ADMIN with no Role row yet is a full admin (the row is created lazily).
  const hasAdminRow = roles.some((r) => r.isSystem && r.name === UserRole.ADMIN);
  if (!hasAdminRow && users.some((u) => u.role === UserRole.ADMIN && !u.roleId)) return true;
  return roles.some((r) => {
    const next =
      r.id === changed.id
        ? { ...r, baseRole: changed.baseRole, permissions: changed.permissions, permissionsSetAt: new Date() }
        : r;
    const perms = effectivePermissions(next).permissions;
    if (!perms.includes("roles.view") || !perms.includes("roles.edit")) return false;
    return users.some((u) => (r.isSystem ? !u.roleId && u.role === r.name : u.roleId === r.id));
  });
};

export const saveRole = async (input: {
  id?: string;
  name: string;
  /** Optional: kept as stored when omitted (the Roles page no longer sends it). */
  baseRole?: UserRole;
  permissions: string[];
  /** `updatedAt` the editor loaded; a mismatch means someone else saved first. */
  expectedUpdatedAt?: string;
}) => {
  const res = await checkPermission(input.id ? "roles.edit" : "roles.create");
  if (!res.ok) return { error: res.error };
  const actor = res.access;

  // Every submitted key must exist in the registry; unknown keys are an error,
  // not something to silently drop.
  if (!Array.isArray(input.permissions)) return { error: "Permissions are required" };
  const permissions = sanitizePermissions(input.permissions);
  if (permissions.length !== new Set(input.permissions).size) {
    const unknown = input.permissions.filter((p) => !permissions.includes(p));
    return { error: `Unknown permission: ${unknown.slice(0, 3).join(", ")}` };
  }

  // Nobody can hand out more than they hold.
  if (!canGrantAll(actor, permissions)) {
    return { error: "You cannot grant permissions you do not have yourself." };
  }

  const existing = input.id ? await db.role.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) return { error: "Role not found" };

  if (existing) {
    // A role more powerful than the editor cannot be edited by them.
    const current = effectivePermissions(existing);
    if (!canGrantAll(actor, current.permissions)) {
      return { error: "You cannot edit a role that has permissions you do not have." };
    }
  }

  // The fixed role drives legacy in-page checks that are not migrated yet, so
  // only an ADMIN may choose it; everyone else keeps the existing one (or USER).
  let baseRole: UserRole;
  if (existing?.isSystem) {
    baseRole = existing.baseRole;
  } else if (actor.isAdmin) {
    if (input.baseRole === undefined) {
      baseRole = existing?.baseRole ?? UserRole.USER;
    } else {
      if (!(BASE_ROLES as UserRole[]).includes(input.baseRole)) return { error: "Invalid base role" };
      baseRole = input.baseRole;
    }
  } else {
    baseRole = existing?.baseRole ?? UserRole.USER;
  }

  const menus = menusFor(permissions);

  if (existing && !(await rolesPageStaysReachable({ id: existing.id, baseRole, permissions }))) {
    return { error: LOCKOUT_ERROR };
  }

  if (existing) {
    // System roles keep their name; only permissions change.
    const name = existing.isSystem ? existing.name : input.name.trim();
    if (!name) return { error: "Role name is required" };
    try {
      const where: { id: string; updatedAt?: Date } = { id: existing.id };
      if (input.expectedUpdatedAt) where.updatedAt = new Date(input.expectedUpdatedAt);
      const { count } = await db.role.updateMany({
        where,
        data: {
          name,
          baseRole,
          menus,
          permissions,
          permissionsSetAt: new Date(),
        },
      });
      if (count === 0) {
        return { error: "This role was changed by someone else. Reload and try again." };
      }
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
    data: {
      name,
      baseRole,
      menus,
      permissions,
      permissionsSetAt: new Date(),
      isSystem: false,
    },
  });
  return { success: "Role created!" };
};

export const deleteRole = async (id: string) => {
  const denied = await permissionError("roles.delete");
  if (denied) return denied;

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

/**
 * Stores the access every not-yet-saved role has TODAY as explicit permissions.
 * Nothing is granted or removed: each role's effective permissions are identical
 * before and after (that is what the legacy mapping guarantees); only the
 * storage moves from "derived from menus + base role" to the permissions list.
 * ADMIN only; idempotent; roles already saved are left untouched.
 */
export const convertLegacyRoles = async () => {
  const res = await checkPermission("roles.edit");
  if (!res.ok) return { error: res.error };
  if (!res.access.isAdmin) return { error: "Only an ADMIN can convert roles in bulk." };

  await ensureSystemRoles();
  const rows = await db.role.findMany({});
  let converted = 0;
  for (const row of rows) {
    if (row.permissionsSetAt) continue;
    // The ADMIN system role is always "everything" regardless of what is stored.
    if (row.isSystem && row.name === UserRole.ADMIN) continue;
    const effective = effectivePermissions(row);
    await db.role.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data: { permissions: effective.permissions, permissionsSetAt: new Date() },
    });
    converted++;
  }
  return { success: `Converted ${converted} role(s). Nobody's access changed.`, converted };
};
