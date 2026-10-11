import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@prisma/client";
import { makeFakeDb } from "@/src/lib/permissions/__tests__/fake-db";

const fake = makeFakeDb();
let sessionUserId: string | null = null;

vi.mock("@/src/lib/db", () => ({ db: fake.db }));
vi.mock("@/src/auth", () => ({
  auth: async () => (sessionUserId ? { user: { id: sessionUserId, role: "ADMIN" } } : null),
}));
// `currentUser` / `currentRole` read the (possibly stale) session payload; the
// migrated actions must not depend on them.
vi.mock("@/src/lib/auth", () => ({
  currentUser: async () => (sessionUserId ? { id: sessionUserId, role: "ADMIN" } : undefined),
  currentRole: async () => (sessionUserId ? "ADMIN" : undefined),
}));

const roles = await import("../roles");
const reels = await import("../reels");
const offers = await import("../offer");
const shipping = await import("../shipping-rate");
const expenses = await import("../expense");

const customRole = (id: string, permissions: string[], over: Record<string, unknown> = {}) => {
  fake.roles.set(id, {
    id,
    name: id,
    baseRole: UserRole.USER,
    menus: [],
    permissions,
    permissionsSetAt: new Date(),
    isSystem: false,
    updatedAt: new Date(),
    ...over,
  } as never);
};

const signInAs = (id: string, role: UserRole, roleId: string | null = null) => {
  fake.users.set(id, { id, role, roleId });
  sessionUserId = id;
};

beforeEach(() => {
  fake.users.clear();
  fake.roles.clear();
  sessionUserId = null;
});

describe("saveRole", () => {
  it("lets ADMIN create a role with independent permissions", async () => {
    signInAs("a", UserRole.ADMIN);
    const res = await roles.saveRole({
      name: "Accountant",
      baseRole: UserRole.USER,
      permissions: ["expenses.view", "expenses.create"],
    });
    expect(res).toEqual({ success: "Role created!" });
    const saved = [...fake.roles.values()].find((r) => r.name === "Accountant")!;
    expect(saved.permissions).toEqual(["expenses.view", "expenses.create"]);
    expect(saved.permissionsSetAt).toBeTruthy();
    // legacy menus are kept in step with the view permissions
    expect(saved.menus).toEqual(["/expenses"]);
  });

  it("rejects unknown permission keys instead of dropping them", async () => {
    signInAs("a", UserRole.ADMIN);
    const res = await roles.saveRole({
      name: "Bad",
      baseRole: UserRole.USER,
      permissions: ["expenses.view", "expenses.explode"],
    });
    expect(res).toMatchObject({ error: expect.stringContaining("expenses.explode") });
    expect(fake.roles.size).toBe(0);
  });

  it("refuses ADMIN / MOD as a custom role's base role", async () => {
    signInAs("a", UserRole.ADMIN);
    const res = await roles.saveRole({ name: "Sneaky", baseRole: UserRole.ADMIN, permissions: [] });
    expect(res).toEqual({ error: "Invalid base role" });
  });

  it("refuses a user without roles.create / roles.edit", async () => {
    customRole("viewer", ["roles.view"]);
    signInAs("u", UserRole.USER, "viewer");
    expect(await roles.saveRole({ name: "X", baseRole: UserRole.USER, permissions: [] })).toEqual({
      error: "Unauthorized",
    });
    customRole("target", ["offers.view"]);
    expect(
      await roles.saveRole({ id: "target", name: "target", baseRole: UserRole.USER, permissions: [] })
    ).toEqual({ error: "Unauthorized" });
  });

  it("blocks privilege escalation: you cannot grant what you do not hold", async () => {
    customRole("editor", ["roles.view", "roles.create", "roles.edit", "offers.view"]);
    signInAs("u", UserRole.USER, "editor");
    const res = await roles.saveRole({
      name: "Boosted",
      baseRole: UserRole.USER,
      permissions: ["offers.view", "expenses.delete"],
    });
    expect(res).toMatchObject({ error: expect.stringContaining("cannot grant") });
  });

  it("blocks editing your own role upward and editing a more powerful role", async () => {
    customRole("editor", ["roles.view", "roles.edit", "offers.view"]);
    customRole("power", ["offers.view", "expenses.delete", "roles.edit"]);
    signInAs("u", UserRole.USER, "editor");

    const self = await roles.saveRole({
      id: "editor",
      name: "editor",
      baseRole: UserRole.USER,
      permissions: ["roles.view", "roles.edit", "offers.view", "reels.delete"],
    });
    expect(self).toMatchObject({ error: expect.stringContaining("cannot grant") });

    const stronger = await roles.saveRole({
      id: "power",
      name: "power",
      baseRole: UserRole.USER,
      permissions: ["offers.view"],
    });
    expect(stronger).toMatchObject({ error: expect.stringContaining("cannot edit a role") });
  });

  it("a non-admin editor cannot change the base role", async () => {
    customRole("editor", ["roles.view", "roles.create", "roles.edit", "offers.view"]);
    customRole("target", ["offers.view"], { baseRole: UserRole.SELLER });
    signInAs("u", UserRole.USER, "editor");

    await roles.saveRole({
      id: "target",
      name: "target",
      baseRole: UserRole.UPLOADER, // attempted upgrade
      permissions: ["offers.view"],
    });
    expect(fake.roles.get("target")!.baseRole).toBe(UserRole.SELLER);

    await roles.saveRole({ name: "NewOne", baseRole: UserRole.UPLOADER, permissions: ["offers.view"] });
    const created = [...fake.roles.values()].find((r) => r.name === "NewOne")!;
    expect(created.baseRole).toBe(UserRole.USER);
  });

  it("lets ADMIN be trimmed but never so far that nobody can open Roles", async () => {
    signInAs("a", UserRole.ADMIN);
    fake.roles.set("admin-row", {
      id: "admin-row",
      name: "ADMIN",
      baseRole: UserRole.ADMIN,
      menus: [],
      permissions: [],
      permissionsSetAt: null,
      isSystem: true,
      updatedAt: new Date(),
    } as never);
    // trimming ADMIN down to nothing would lock everyone out of /roles
    const locked = await roles.saveRole({
      id: "admin-row",
      name: "ADMIN",
      permissions: ["expenses.view"],
    });
    expect(locked).toMatchObject({ error: expect.stringContaining("must stay open") });
    expect(fake.roles.get("admin-row")!.permissionsSetAt).toBeNull();

    // keeping roles.view + roles.edit is allowed
    const ok = await roles.saveRole({
      id: "admin-row",
      name: "ADMIN",
      permissions: ["expenses.view", "roles.view", "roles.edit"],
    });
    expect(ok).toEqual({ success: "Role updated!" });
    expect(fake.roles.get("admin-row")!.permissions).toEqual(["expenses.view", "roles.view", "roles.edit"]);
  });

  it("detects concurrent edits via expectedUpdatedAt", async () => {
    signInAs("a", UserRole.ADMIN);
    customRole("r", ["offers.view"], { updatedAt: new Date("2026-01-01T00:00:00.000Z") });
    const stale = "2025-12-31T00:00:00.000Z";
    const res = await roles.saveRole({
      id: "r",
      name: "r",
      baseRole: UserRole.USER,
      permissions: ["offers.view", "offers.edit"],
      expectedUpdatedAt: stale,
    });
    expect(res).toMatchObject({ error: expect.stringContaining("changed by someone else") });
    expect(fake.roles.get("r")!.permissions).toEqual(["offers.view"]);

    const ok = await roles.saveRole({
      id: "r",
      name: "r",
      baseRole: UserRole.USER,
      permissions: ["offers.view", "offers.edit"],
      expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(ok).toEqual({ success: "Role updated!" });
  });
});

describe("deleteRole / listRoles", () => {
  it("needs roles.delete and refuses roles still in use", async () => {
    customRole("viewer", ["roles.view"]);
    signInAs("u", UserRole.USER, "viewer");
    expect(await roles.deleteRole("viewer")).toEqual({ error: "Unauthorized" });

    signInAs("a", UserRole.ADMIN);
    fake.users.set("u", { id: "u", role: UserRole.USER, roleId: "viewer" });
    expect(await roles.deleteRole("viewer")).toMatchObject({ error: expect.stringContaining("still have") });
  });

  it("lists effective permissions, flagging roles not yet saved", async () => {
    signInAs("a", UserRole.ADMIN);
    customRole("saved", ["offers.view"]);
    customRole("old", [], { permissionsSetAt: null, menus: ["/sell"], baseRole: UserRole.SELLER });
    const res = await roles.listRoles();
    expect("data" in res).toBe(true);
    const data = (res as { data: { name: string; legacy: boolean; permissions: string[] }[] }).data;
    const old = data.find((r) => r.name === "old")!;
    expect(old.legacy).toBe(true);
    expect(old.permissions).toContain("sell.create");
    const saved = data.find((r) => r.name === "saved")!;
    expect(saved.legacy).toBe(false);
    expect(saved.permissions).toEqual(["offers.view"]);
    // system roles were seeded without touching their permissions
    expect(data.find((r) => r.name === "ADMIN")!.permissions.length).toBeGreaterThan(50);
  });
});

describe("convertLegacyRoles (migration of existing roles)", () => {
  it("stores today's access as permissions without changing anyone's access", async () => {
    const { loadAccess } = await import("@/src/lib/permissions/server");
    signInAs("a", UserRole.ADMIN);
    customRole("old-seller", [], {
      permissionsSetAt: null,
      menus: ["/sell", "/expenses", "/catalogue"],
      baseRole: UserRole.SELLER,
    });
    fake.users.set("worker", { id: "worker", role: UserRole.USER, roleId: "old-seller" });

    const before = await loadAccess("worker", fake.db as never);
    const res = await roles.convertLegacyRoles();
    expect(res).toMatchObject({ converted: expect.any(Number) });
    const row = fake.roles.get("old-seller")!;
    expect(row.permissionsSetAt).toBeTruthy();
    const after = await loadAccess("worker", fake.db as never);

    expect([...after!.permissions].sort()).toEqual([...before!.permissions].sort());
    expect(after!.permissions.has("expenses.delete")).toBe(false);
    // existing users stay on their role
    expect(fake.users.get("worker")!.roleId).toBe("old-seller");
    // already-saved roles are left alone on a second run
    const stamp = row.permissionsSetAt;
    await roles.convertLegacyRoles();
    expect(fake.roles.get("old-seller")!.permissionsSetAt).toBe(stamp);
  });

  it("is ADMIN only", async () => {
    customRole("editor", ["roles.view", "roles.edit"]);
    signInAs("u", UserRole.USER, "editor");
    expect(await roles.convertLegacyRoles()).toEqual({
      error: "Only an ADMIN can convert roles in bulk.",
    });
  });
});

describe("pilot modules reject direct server-action calls without permission", () => {
  // Even though the session payload says ADMIN (stale), the database decides.
  it("expenses: view-only user cannot create, edit or delete", async () => {
    customRole("viewer", ["expenses.view"]);
    signInAs("u", UserRole.USER, "viewer");
    expect(await expenses.createExpense({} as never)).toEqual({ error: "Unauthorized" });
    expect(await expenses.updateExpense("x", {})).toEqual({ error: "Unauthorized" });
    expect(await expenses.deleteExpense("x")).toEqual({ error: "Unauthorized" });
    expect(await expenses.createExpenseReason({ name: "n" })).toEqual({ error: "Unauthorized" });
    expect(await expenses.deleteExpenseSubReason("x")).toEqual({ error: "Unauthorized" });
  });

  it("offers: only the matching action permission passes the guard", async () => {
    customRole("creator", ["offers.view", "offers.create"]);
    signInAs("u", UserRole.USER, "creator");
    expect(await offers.updateOffer("x", {} as never)).toEqual({ error: "Unauthorized" });
    expect(await offers.deleteOffer("x")).toEqual({ error: "Unauthorized" });
    // create passes the guard and fails later on validation, not authorization
    expect(
      await offers.createOffer({ name: "", qty: 1, categories: ["c"] })
    ).toEqual({ error: "Offer name can't be empty" });
  });

  it("shipping rates: guarded per action", async () => {
    customRole("viewer", ["shippingRates.view"]);
    signInAs("u", UserRole.USER, "viewer");
    expect(await shipping.createShippingRate({ pincode: "364001", rate: 1, type: "exact" })).toEqual({
      error: "Unauthorized",
    });
    expect(await shipping.updateShippingRate("x", { rate: 2 })).toEqual({ error: "Unauthorized" });
    expect(await shipping.deleteShippingRate("x")).toEqual({ error: "Unauthorized" });
  });

  it("reels: guarded per action and signed-out is refused", async () => {
    customRole("viewer", ["reels.view"]);
    signInAs("u", UserRole.USER, "viewer");
    expect(await reels.createReel({ title: "t", youtubeUrl: "x" })).toMatchObject({
      success: false,
      error: "Unauthorized",
    });
    expect(await reels.deleteReel("x")).toMatchObject({ success: false, error: "Unauthorized" });
    expect(await reels.moveReel("x", "up")).toMatchObject({ success: false, error: "Unauthorized" });

    sessionUserId = null;
    await expect(reels.getReelsAdmin()).rejects.toMatchObject({ status: 401 });
  });

  it("a custom role with expenses.view only gets the guard for view", async () => {
    customRole("viewer", ["expenses.view"]);
    signInAs("u", UserRole.USER, "viewer");
    // getAllExpenses passes the guard; it then needs a real DB, so only the
    // authorization outcome is asserted: it must not be "Unauthorized".
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = (await expenses.getAllExpenses()) as { error?: string };
    expect(res.error).not.toBe("Unauthorized");
  });
});
