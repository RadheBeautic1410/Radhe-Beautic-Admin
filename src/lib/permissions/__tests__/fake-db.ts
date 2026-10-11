import { UserRole } from "@prisma/client";
import type { RoleRowLike } from "../resolve";

export interface FakeUser {
  id: string;
  role: UserRole;
  roleId: string | null;
}

export interface FakeRole extends RoleRowLike {
  id: string;
  updatedAt: Date;
}

/** A tiny in-memory stand-in for the slice of Prisma the permission layer uses. */
export const makeFakeDb = () => {
  const users = new Map<string, FakeUser>();
  const roles = new Map<string, FakeRole>();
  let tick = 1;

  const touch = (r: FakeRole) => {
    r.updatedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, tick++));
  };

  const findRole = (where: { id?: string; name?: string }) => {
    for (const r of roles.values()) {
      if (where.id !== undefined && r.id === where.id) return r;
      if (where.name !== undefined && r.name === where.name) return r;
    }
    return null;
  };

  const db = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => users.get(where.id) ?? null,
      findMany: async () => Array.from(users.values()),
      count: async ({ where }: { where: { roleId?: string } }) =>
        Array.from(users.values()).filter((u) => u.roleId === where.roleId).length,
    },
    role: {
      findUnique: async ({ where }: { where: { id?: string; name?: string } }) => findRole(where),
      findMany: async ({ where }: { where?: { isSystem?: boolean } } = {}) =>
        Array.from(roles.values()).filter((r) => where?.isSystem === undefined || r.isSystem === where.isSystem),
      create: async ({ data }: { data: Partial<FakeRole> & { name: string } }) => {
        const r: FakeRole = {
          id: `role-${roles.size + 1}`,
          baseRole: UserRole.USER,
          menus: [],
          permissions: [],
          permissionsSetAt: null,
          isSystem: false,
          updatedAt: new Date(0),
          ...data,
        };
        touch(r);
        roles.set(r.id, r);
        return r;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; updatedAt?: Date };
        data: Partial<FakeRole>;
      }) => {
        const r = roles.get(where.id);
        if (!r) return { count: 0 };
        if (where.updatedAt && r.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
        Object.assign(r, data);
        touch(r);
        return { count: 1 };
      },
      delete: async ({ where }: { where: { id: string } }) => {
        roles.delete(where.id);
      },
    },
  };

  return { db, users, roles };
};
