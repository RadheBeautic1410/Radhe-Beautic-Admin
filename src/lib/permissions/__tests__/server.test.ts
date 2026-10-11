import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { makeFakeDb } from "./fake-db";

const fake = makeFakeDb();
let sessionUserId: string | null = null;

vi.mock("@/src/lib/db", () => ({ db: fake.db }));
vi.mock("@/src/auth", () => ({
  auth: async () => (sessionUserId ? { user: { id: sessionUserId } } : null),
}));

// Imported after the mocks are registered.
const server = await import("../server");

const seedCustomRole = (permissions: string[], over: Record<string, unknown> = {}) => {
  fake.roles.set("r1", {
    id: "r1",
    name: "Store Manager",
    baseRole: UserRole.SELLER,
    menus: [],
    permissions,
    permissionsSetAt: new Date(),
    isSystem: false,
    updatedAt: new Date(),
    ...over,
  } as never);
};

beforeEach(() => {
  fake.users.clear();
  fake.roles.clear();
  sessionUserId = null;
});

describe("checkPermission", () => {
  it("401s when signed out", async () => {
    const res = await server.checkPermission("expenses.view");
    expect(res).toMatchObject({ ok: false, status: 401, error: "Unauthorized" });
  });

  it("401s for a session whose user no longer exists", async () => {
    sessionUserId = "ghost";
    const res = await server.checkPermission("expenses.view");
    expect(res).toMatchObject({ ok: false, status: 401 });
  });

  it("lets ADMIN through everything and 403s a role without the permission", async () => {
    fake.users.set("admin", { id: "admin", role: UserRole.ADMIN, roleId: null });
    fake.users.set("seller", { id: "seller", role: UserRole.SELLER, roleId: null });

    sessionUserId = "admin";
    expect((await server.checkPermission("expenses.delete")).ok).toBe(true);

    sessionUserId = "seller";
    const res = await server.checkPermission("expenses.delete");
    expect(res).toMatchObject({ ok: false, status: 403 });
  });

  it("accepts any of several permissions", async () => {
    fake.users.set("u", { id: "u", role: UserRole.USER, roleId: "r1" });
    seedCustomRole(["staff.view"]);
    sessionUserId = "u";
    expect((await server.checkPermission(["roles.view", "staff.view"])).ok).toBe(true);
    expect((await server.checkPermission(["roles.view", "roles.edit"])).ok).toBe(false);
  });

  it("requirePermission throws a PermissionError; permissionError returns { error }", async () => {
    sessionUserId = null;
    await expect(server.requirePermission("reels.view")).rejects.toMatchObject({
      name: "PermissionError",
      status: 401,
    });
    expect(await server.permissionError("reels.view")).toEqual({ error: "Unauthorized" });
  });

  it("apiPermission returns a ready 401/403 JSON response", async () => {
    fake.users.set("seller", { id: "seller", role: UserRole.SELLER, roleId: null });
    sessionUserId = "seller";
    const denied = await server.apiPermission("expenses.view");
    expect(denied.response?.status).toBe(403);
    expect(await denied.response?.json()).toEqual({ error: "Unauthorized" });

    sessionUserId = null;
    const anon = await server.apiPermission("expenses.view");
    expect(anon.response?.status).toBe(401);
  });
});

describe("live permission changes (no re-login, no stale cache)", () => {
  // The session user id is the only thing that stays the same between requests.
  beforeEach(() => {
    fake.users.set("u", { id: "u", role: UserRole.USER, roleId: "r1" });
    sessionUserId = "u";
  });

  it("a revoked permission is refused on the very next request", async () => {
    seedCustomRole(["offers.view", "offers.delete"]);
    expect((await server.checkPermission("offers.delete")).ok).toBe(true);

    fake.roles.get("r1")!.permissions = ["offers.view"]; // admin edits the role
    expect((await server.checkPermission("offers.delete")).ok).toBe(false);
    expect((await server.checkPermission("offers.view")).ok).toBe(true);
  });

  it("a granted permission works on the very next request", async () => {
    seedCustomRole(["offers.view"]);
    expect((await server.checkPermission("offers.create")).ok).toBe(false);

    fake.roles.get("r1")!.permissions = ["offers.view", "offers.create"];
    expect((await server.checkPermission("offers.create")).ok).toBe(true);
  });

  it("moving the user to another role applies immediately", async () => {
    seedCustomRole(["offers.view"]);
    fake.roles.set("r2", {
      id: "r2",
      name: "Accountant",
      baseRole: UserRole.USER,
      menus: [],
      permissions: ["expenses.view", "expenses.create"],
      permissionsSetAt: new Date(),
      isSystem: false,
      updatedAt: new Date(),
    } as never);

    expect((await server.checkPermission("expenses.create")).ok).toBe(false);
    fake.users.get("u")!.roleId = "r2";
    expect((await server.checkPermission("expenses.create")).ok).toBe(true);
    expect((await server.checkPermission("offers.view")).ok).toBe(false);
  });

  it("deleting the user locks the session out at once", async () => {
    seedCustomRole(["offers.view"]);
    expect((await server.checkPermission("offers.view")).ok).toBe(true);
    fake.users.delete("u");
    expect(await server.checkPermission("offers.view")).toMatchObject({ ok: false, status: 401 });
  });

  it("loadAccess exposes a version that changes with the permissions", async () => {
    seedCustomRole(["offers.view"]);
    const before = await server.loadAccess("u", fake.db as never);
    fake.roles.get("r1")!.permissions = ["offers.view", "offers.edit"];
    const after = await server.loadAccess("u", fake.db as never);
    expect(after!.version).not.toBe(before!.version);
    expect(after!.permissions.has("offers.edit")).toBe(true);
  });

  it("concurrent requests during a change each see a consistent role (old or new)", async () => {
    seedCustomRole(["offers.view"]);
    const results = await Promise.all([
      server.checkPermission("offers.view"),
      (async () => {
        fake.roles.get("r1")!.permissions = ["offers.view", "offers.edit"];
        return server.checkPermission("offers.edit");
      })(),
      server.checkPermission("offers.view"),
    ]);
    expect(results[0].ok && results[2].ok).toBe(true);
    // the permission that was just granted is visible to the request issued after the change
    expect(results[1].ok).toBe(true);
  });
});

describe("base role stays available for scoping", () => {
  it("custom role keeps its base role while authorization uses permissions", async () => {
    fake.users.set("u", { id: "u", role: UserRole.USER, roleId: "r1" });
    seedCustomRole(["sell.view"], { baseRole: UserRole.SHOP_SELLER });
    sessionUserId = "u";
    const access = await server.getAccess();
    expect(access?.baseRole).toBe(UserRole.SHOP_SELLER);
    expect(access?.role).toBe(UserRole.USER);
    expect(server.accessCan(access, "sell.view")).toBe(true);
    // being SHOP_SELLER-based grants nothing by itself
    expect(server.accessCan(access, "sellRetailer.view")).toBe(false);
  });
});
