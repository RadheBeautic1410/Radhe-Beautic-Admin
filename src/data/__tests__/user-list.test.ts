import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
vi.mock("@/src/lib/db", () => ({ db: { user: { findMany } } }));

const checkPermission = vi.fn();
vi.mock("@/src/lib/permissions/server", () => ({ checkPermission }));

const { getAllUsersWithRole } = await import("../user");
const { GET: getUsers } = await import("@/src/app/api/users/route");

beforeEach(() => {
  findMany.mockReset().mockResolvedValue([{ id: "u1" }]);
  checkPermission.mockReset();
});

describe("getAllUsersWithRole", () => {
  it("does not select the stored password by default", async () => {
    await getAllUsersWithRole({ role: ["CUSTOMER" as any] });
    const args = findMany.mock.calls[0][0];
    expect(args.select.password).toBe(false);
    expect(args.select).toMatchObject({ id: true, name: true, phoneNumber: true, role: true, balance: true });
    expect(args.where.role).toEqual({ in: ["CUSTOMER"] });
  });

  it("selects the password only when asked to", async () => {
    await getAllUsersWithRole(undefined, { includePassword: true });
    expect(findMany.mock.calls[0][0].select.password).toBe(true);
  });
});

describe("GET /api/users", () => {
  it("includes passwords for holders of staff.resetPassword", async () => {
    checkPermission.mockResolvedValue({ ok: true });
    const res = await getUsers();
    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith(["staff.resetPassword"]);
    expect(findMany.mock.calls[0][0].select.password).toBe(true);
  });

  it("leaves passwords out for staff.view without staff.resetPassword", async () => {
    checkPermission.mockImplementation(async (keys: string[]) =>
      keys.includes("staff.resetPassword") ? { ok: false, status: 403 } : { ok: true }
    );
    const res = await getUsers();
    expect(res.status).toBe(200);
    expect(findMany.mock.calls[0][0].select.password).toBe(false);
  });

  it("still refuses callers without staff.view", async () => {
    checkPermission.mockResolvedValue({ ok: false, status: 403 });
    const res = await getUsers();
    expect(res.status).toBe(403);
    expect(findMany).not.toHaveBeenCalled();
  });
});
