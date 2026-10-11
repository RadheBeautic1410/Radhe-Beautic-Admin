import { cache as reactCache } from "react";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import {
  can as hasPermission,
  canAny as hasAnyPermission,
  resolveAccess,
  type RoleRowLike,
} from "./resolve";
import type { PermissionKey } from "./registry";

/**
 * Server-side authorization. The DATABASE is the source of truth: permissions
 * are re-read from the user's current role on every protected request, never
 * taken from the JWT / session payload. Only the session's user id is trusted
 * (that is authentication). A role edit, a permission change or moving a user to
 * another role therefore applies to their very next request, with no re-login.
 *
 * There is deliberately no cross-request cache: the only memoization is
 * `cache()`, which lasts for a single request, so a change can never be served
 * stale to a later request.
 */

export interface Access {
  userId: string;
  /** The user's fixed role (User.role). */
  role: UserRole;
  /** The fixed role they act as for identity / data-scoping logic. */
  baseRole: UserRole;
  roleId: string | null;
  roleName: string;
  isAdmin: boolean;
  permissions: ReadonlySet<PermissionKey>;
  version: string;
}

// React.cache memoizes for one request. Outside a React server render (route
// handlers in some runtimes, unit tests) it may be unavailable: then every call
// simply re-reads, which is always correct.
const perRequest: <T extends () => Promise<unknown>>(fn: T) => T =
  typeof reactCache === "function" ? (reactCache as never) : (fn) => fn;

/** The slice of the database the loader needs (lets tests inject a fake). */
export interface AccessDb {
  user: {
    findUnique(args: {
      where: { id: string };
      select: { id: true; role: true; roleId: true };
    }): Promise<{ id: string; role: UserRole; roleId: string | null } | null>;
  };
  role: {
    findUnique(args: {
      where: { id: string } | { name: string };
    }): Promise<RoleRowLike | null>;
  };
}

/** Loads a user's current access straight from the database. */
export const loadAccess = async (
  userId: string,
  client: AccessDb = db as unknown as AccessDb
): Promise<Access | null> => {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, roleId: true },
  });
  if (!user) return null;

  // A failed role lookup (e.g. before the Role collection exists) falls back to
  // the legacy defaults for the fixed role instead of locking everyone out.
  const roleRow = await (user.roleId
    ? client.role.findUnique({ where: { id: user.roleId } })
    : client.role.findUnique({ where: { name: user.role } })
  ).catch(() => null);

  const resolved = resolveAccess({
    role: user.role,
    roleRow,
    hasCustomRole: !!user.roleId && !!roleRow,
  });

  return {
    userId: user.id,
    role: user.role,
    baseRole: resolved.baseRole,
    roleId: user.roleId,
    roleName: resolved.roleName,
    isAdmin: resolved.isAdmin,
    permissions: new Set(resolved.permissions),
    version: resolved.version,
  };
};

/** Current user's access, or null when signed out. Memoized per request only. */
export const getAccess = perRequest(async (): Promise<Access | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return loadAccess(id);
});

// ───────── guards ─────────

export type PermissionResult =
  | { ok: true; access: Access }
  | { ok: false; status: 401 | 403; error: string };

const UNAUTHENTICATED: PermissionResult = { ok: false, status: 401, error: "Unauthorized" };
const FORBIDDEN: PermissionResult = { ok: false, status: 403, error: "Unauthorized" };

/**
 * Checks the current user holds a permission (or, with an array, ANY of them).
 * Never throws; use the result's `ok`.
 */
export const checkPermission = async (
  keys: PermissionKey | readonly PermissionKey[]
): Promise<PermissionResult> => {
  const access = await getAccess();
  if (!access) return UNAUTHENTICATED;
  const list = Array.isArray(keys) ? (keys as readonly PermissionKey[]) : [keys as PermissionKey];
  const allowed = access.isAdmin || hasAnyPermission(access.permissions, list);
  return allowed ? { ok: true, access } : FORBIDDEN;
};

/** Error thrown by `requirePermission`; carries the HTTP status. */
export class PermissionError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message = "Unauthorized") {
    super(message);
    this.name = "PermissionError";
    this.status = status;
  }
}

/** Returns the access, or throws PermissionError. For actions that already throw (e.g. reels). */
export const requirePermission = async (
  keys: PermissionKey | readonly PermissionKey[]
): Promise<Access> => {
  const res = await checkPermission(keys);
  if (!res.ok) throw new PermissionError(res.status, res.error);
  return res.access;
};

/** For actions that return `{ error }` instead of throwing: null = allowed. */
export const permissionError = async (
  keys: PermissionKey | readonly PermissionKey[]
): Promise<{ error: string } | null> => {
  const res = await checkPermission(keys);
  return res.ok ? null : { error: res.error };
};

/** For route handlers: a ready 401/403 response, or the access when allowed. */
export const apiPermission = async (
  keys: PermissionKey | readonly PermissionKey[]
): Promise<{ access: Access; response?: undefined } | { access?: undefined; response: NextResponse }> => {
  const res = await checkPermission(keys);
  if (res.ok) return { access: res.access };
  return { response: NextResponse.json({ error: res.error }, { status: res.status }) };
};

/** Synchronous check against an already-loaded Access. */
export const accessCan = (access: Access | null | undefined, key: PermissionKey): boolean =>
  !!access && (access.isAdmin || hasPermission(access.permissions, key));
