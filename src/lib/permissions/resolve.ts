import { UserRole } from "@prisma/client";
import { ALL_MENU_ITEMS, defaultMenusForRole } from "@/src/lib/menus";
import {
  ALL_PERMISSIONS,
  LATER_ADDED,
  findModuleForPath,
  legacyPermissions,
  legacyRolesFor,
  permissionKey,
  sanitizePermissions,
  viewPermissionForMenu,
  type PermissionKey,
} from "./registry";

/** The Role row fields the resolver needs (a subset of the Prisma model). */
export interface RoleRowLike {
  name: string;
  baseRole: UserRole;
  menus: string[];
  permissions: string[];
  /** Set once permissions were saved explicitly. Null = still on the legacy menu model. */
  permissionsSetAt: Date | string | null;
  isSystem: boolean;
}

export interface UserRoleInput {
  /** The user's fixed role (User.role). */
  role: UserRole;
  /** The Role row they are on: their custom role, else the system row for `role`. */
  roleRow: RoleRowLike | null;
  hasCustomRole: boolean;
}

export interface ResolvedAccess {
  /** The fixed role this user acts as for identity / data-scoping logic. */
  baseRole: UserRole;
  roleName: string;
  isAdmin: boolean;
  permissions: PermissionKey[];
  /** Changes whenever the permission set changes; clients use it to detect updates. */
  version: string;
  /** Still derived from the legacy menu model (permissions never saved on the role). */
  fromLegacy: boolean;
}

/** Small stable string hash (FNV-1a) of the sorted permission list. */
export const permissionsVersion = (permissions: readonly string[]): string => {
  const text = [...permissions].sort().join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `${permissions.length}-${h.toString(16)}`;
};

/**
 * Turns a user + their role row into the permissions they have right now.
 * Pure: the caller loads the rows fresh from the database.
 *
 * - A plain ADMIN (no custom role) always has everything.
 * - A role whose permissions were saved uses exactly those (unknown keys dropped).
 * - Otherwise the old menus + base-role rules are mapped across, so a role that
 *   was never re-saved keeps precisely the access it had before.
 */
export const resolveAccess = ({ role, roleRow, hasCustomRole }: UserRoleInput): ResolvedAccess => {
  const baseRole = roleRow?.baseRole ?? role;
  const roleName = roleRow?.name ?? role;

  // A plain ADMIN has everything, unless its Role row was deliberately trimmed
  // on the Roles page (saved permissions, or menus that no longer list every
  // page). New permissions then reach admins automatically only while untrimmed.
  const isPlainAdmin = role === UserRole.ADMIN && !hasCustomRole;
  if (isPlainAdmin) {
    const trimmedBySave = !!roleRow?.permissionsSetAt;
    const trimmedByMenus =
      !trimmedBySave &&
      !!roleRow &&
      roleRow.menus.length > 0 &&
      !ALL_MENU_ITEMS.every((m) => roleRow.menus.includes(m.href));
    if (!trimmedBySave && !trimmedByMenus) {
      return {
        baseRole: UserRole.ADMIN,
        roleName,
        isAdmin: true,
        permissions: [...ALL_PERMISSIONS],
        version: permissionsVersion(ALL_PERMISSIONS),
        fromLegacy: false,
      };
    }
  }

  let permissions: PermissionKey[];
  let fromLegacy = false;
  if (roleRow?.permissionsSetAt) {
    permissions = sanitizePermissions(roleRow.permissions);
    // Actions added after this role was last saved were never its choice: give
    // them their legacy default until the role is saved again.
    const savedAt = new Date(roleRow.permissionsSetAt).getTime();
    for (const { key, since } of LATER_ADDED) {
      if (savedAt < since && !permissions.includes(key) && legacyRolesFor(key).includes(baseRole)) {
        permissions.push(key);
      }
    }
  } else {
    fromLegacy = true;
    const menus = roleRow ? roleRow.menus : defaultMenusForRole(baseRole);
    permissions = legacyPermissions(baseRole, menus);
  }

  // A trimmed ADMIN that still holds everything keeps the full-admin bypass.
  const holdsEverything = ALL_PERMISSIONS.every((k) => permissions.includes(k));
  return {
    baseRole,
    roleName,
    isAdmin: isPlainAdmin && holdsEverything,
    permissions,
    version: permissionsVersion(permissions),
    fromLegacy,
  };
};

export type PermissionSource = ReadonlySet<string> | readonly string[] | null | undefined;

const has = (source: PermissionSource, key: string): boolean => {
  if (!source) return false;
  return Array.isArray(source)
    ? (source as readonly string[]).includes(key)
    : (source as ReadonlySet<string>).has(key);
};

/** `can(permissions, "expenses.delete")` */
export const can = (source: PermissionSource, key: PermissionKey): boolean => has(source, key);

/** True when the user holds at least one of the keys. */
export const canAny = (source: PermissionSource, keys: readonly PermissionKey[]): boolean =>
  keys.some((k) => has(source, k));

/** True when the user holds every key. */
export const canAll = (source: PermissionSource, keys: readonly PermissionKey[]): boolean =>
  keys.every((k) => has(source, k));

/**
 * Sidebar item visibility / page access for a menu href. Paths that are not a
 * module page (home, detail routes under an unknown prefix, auth) are open.
 */
export const canOpenPath = (pathname: string, source: PermissionSource): boolean => {
  const m = findModuleForPath(pathname);
  if (!m) return true;
  return has(source, permissionKey(m.key, "view"));
};

/** Can `actor` hand out all of `wanted`? A user can never grant what they lack. */
export const canGrantAll = (
  actor: { isAdmin: boolean; permissions: PermissionSource },
  wanted: readonly PermissionKey[]
): boolean => actor.isAdmin || wanted.every((k) => has(actor.permissions, k));

/**
 * Where to land a user with no particular page in mind: the catalogue when they
 * can open it (most roles can), otherwise the first page they can open.
 */
export const firstAllowedPath = (source: PermissionSource): string | null => {
  const catalogue = ALL_MENU_ITEMS.find((m) => m.href === "/catalogue");
  const can_ = (href: string) => {
    const key = viewPermissionForMenu(href);
    return !!key && has(source, key);
  };
  if (catalogue && can_(catalogue.href)) return catalogue.href;
  return ALL_MENU_ITEMS.find((m) => can_(m.href))?.href ?? null;
};
