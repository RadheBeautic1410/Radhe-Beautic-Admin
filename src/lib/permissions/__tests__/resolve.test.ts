import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { defaultMenusForRole } from "@/src/lib/menus";
import {
  can,
  canAll,
  canAny,
  canGrantAll,
  canOpenPath,
  permissionsVersion,
  resolveAccess,
  type RoleRowLike,
} from "../resolve";
import { ALL_PERMISSIONS } from "../registry";

const row = (over: Partial<RoleRowLike> = {}): RoleRowLike => ({
  name: "Store Manager",
  baseRole: UserRole.SELLER,
  menus: [],
  permissions: [],
  permissionsSetAt: null,
  isSystem: false,
  ...over,
});

describe("resolveAccess", () => {
  it("gives a plain ADMIN everything", () => {
    const a = resolveAccess({ role: UserRole.ADMIN, roleRow: null, hasCustomRole: false });
    expect(a.isAdmin).toBe(true);
    expect(a.permissions).toEqual([...ALL_PERMISSIONS]);
  });

  it("an untrimmed ADMIN row (never saved) keeps everything", () => {
    const a = resolveAccess({
      role: UserRole.ADMIN,
      roleRow: row({ name: "ADMIN", baseRole: UserRole.ADMIN, isSystem: true, menus: [] }),
      hasCustomRole: false,
    });
    expect(a.isAdmin).toBe(true);
    expect(a.permissions).toHaveLength(ALL_PERMISSIONS.length);
  });

  it("a saved (trimmed) ADMIN role is respected and loses the full-admin bypass", () => {
    const a = resolveAccess({
      role: UserRole.ADMIN,
      roleRow: row({
        name: "ADMIN",
        baseRole: UserRole.ADMIN,
        isSystem: true,
        permissions: ["expenses.view", "roles.view", "roles.edit"],
        permissionsSetAt: new Date(),
      }),
      hasCustomRole: false,
    });
    expect(a.isAdmin).toBe(false);
    expect([...a.permissions].sort()).toEqual(["expenses.view", "roles.edit", "roles.view"]);
  });

  it("an ADMIN role saved with every permission stays a full admin", () => {
    const a = resolveAccess({
      role: UserRole.ADMIN,
      roleRow: row({
        name: "ADMIN",
        baseRole: UserRole.ADMIN,
        isSystem: true,
        permissions: [...ALL_PERMISSIONS],
        permissionsSetAt: new Date(),
      }),
      hasCustomRole: false,
    });
    expect(a.isAdmin).toBe(true);
  });

  it("uses saved permissions independently of the base role", () => {
    const a = resolveAccess({
      role: UserRole.USER,
      hasCustomRole: true,
      roleRow: row({
        baseRole: UserRole.SELLER,
        permissions: ["expenses.view", "expenses.create"],
        permissionsSetAt: new Date(),
        // legacy menus must not matter once permissions are saved
        menus: ["/upload", "/sell"],
      }),
    });
    expect(a.fromLegacy).toBe(false);
    expect([...a.permissions].sort()).toEqual(["expenses.create", "expenses.view"]);
    expect(a.baseRole).toBe(UserRole.SELLER);
  });

  it("an explicitly saved empty set means no access (not a fall back to legacy)", () => {
    const a = resolveAccess({
      role: UserRole.USER,
      hasCustomRole: true,
      roleRow: row({ menus: ["/sell"], permissions: [], permissionsSetAt: new Date() }),
    });
    expect(a.permissions).toEqual([]);
  });

  it("drops unknown keys from stored permissions", () => {
    const a = resolveAccess({
      role: UserRole.USER,
      hasCustomRole: true,
      roleRow: row({ permissions: ["offers.view", "ghost.fly"], permissionsSetAt: new Date() }),
    });
    expect(a.permissions).toEqual(["offers.view"]);
  });

  it("falls back to the legacy mapping until permissions are saved", () => {
    const a = resolveAccess({
      role: UserRole.USER,
      hasCustomRole: true,
      roleRow: row({ baseRole: UserRole.SELLER, menus: ["/sell", "/expenses"] }),
    });
    expect(a.fromLegacy).toBe(true);
    expect(can(a.permissions, "sell.create")).toBe(true);
    expect(can(a.permissions, "expenses.view")).toBe(true);
    expect(can(a.permissions, "expenses.delete")).toBe(false);
  });

  it("uses the built-in defaults when a fixed role has no Role row yet", () => {
    const a = resolveAccess({ role: UserRole.SHOP_SELLER, roleRow: null, hasCustomRole: false });
    expect(a.fromLegacy).toBe(true);
    expect(can(a.permissions, "sellRetailer.view")).toBe(true);
    expect(can(a.permissions, "upload.view")).toBe(false);
    expect(a.baseRole).toBe(UserRole.SHOP_SELLER);
    expect(defaultMenusForRole(UserRole.SHOP_SELLER)).toContain("/sellRetailer");
  });

  it("shop-floor logins are limited to their shop unless granted 'any stock location'", () => {
    const shop = resolveAccess({ role: UserRole.SHOP_SELLER, roleRow: null, hasCustomRole: false });
    expect(can(shop.permissions, "stockLocation.anyLocation")).toBe(false);
    expect(can(shop.permissions, "catalogue.viewResellerPrice")).toBe(false);
    const seller = resolveAccess({ role: UserRole.SELLER, roleRow: null, hasCustomRole: false });
    expect(can(seller.permissions, "stockLocation.anyLocation")).toBe(true);
    expect(can(seller.permissions, "catalogue.viewResellerPrice")).toBe(true);
  });

  it("a role saved before an action existed keeps that action's legacy default", () => {
    const saved = (at: string, perms: string[]) =>
      resolveAccess({
        role: UserRole.UPLOADER,
        hasCustomRole: false,
        roleRow: row({
          name: "UPLOADER",
          baseRole: UserRole.UPLOADER,
          isSystem: true,
          permissions: perms,
          permissionsSetAt: at,
        }),
      });
    // saved long ago: never chose these, so UPLOADER keeps its old access
    const old = saved("2026-01-01T00:00:00.000Z", ["upload.view", "catalogue.view"]);
    expect(can(old.permissions, "stockLocation.anyLocation")).toBe(true);
    expect(can(old.permissions, "catalogue.viewResellerPrice")).toBe(true);
    // saved after: an explicit choice, so unticked means off
    const fresh = saved("2026-12-01T00:00:00.000Z", ["upload.view", "catalogue.view"]);
    expect(can(fresh.permissions, "stockLocation.anyLocation")).toBe(false);
    expect(can(fresh.permissions, "catalogue.viewResellerPrice")).toBe(false);
    // and a shop-type base role is never given them by the fallback
    const shop = resolveAccess({
      role: UserRole.SHOP_SELLER,
      hasCustomRole: false,
      roleRow: row({ name: "SHOP_SELLER", baseRole: UserRole.SHOP_SELLER, isSystem: true, permissions: ["sell.view"], permissionsSetAt: "2026-01-01T00:00:00.000Z" }),
    });
    expect(can(shop.permissions, "stockLocation.anyLocation")).toBe(false);
  });

  it("version changes when, and only when, the permission set changes", () => {
    const a = permissionsVersion(["a.view", "b.view"]);
    expect(permissionsVersion(["b.view", "a.view"])).toBe(a);
    expect(permissionsVersion(["a.view"])).not.toBe(a);
  });
});

describe("helpers", () => {
  it("can / canAny / canAll", () => {
    const set = new Set(["offers.view", "offers.edit"]);
    expect(can(set, "offers.view")).toBe(true);
    expect(can(set, "offers.delete")).toBe(false);
    expect(can(null, "offers.view")).toBe(false);
    expect(canAny(set, ["offers.delete", "offers.edit"])).toBe(true);
    expect(canAll(set, ["offers.view", "offers.delete"])).toBe(false);
  });

  it("canOpenPath follows <module>.view and leaves unknown paths alone", () => {
    const set = new Set(["orders.view"]);
    expect(canOpenPath("/orders", set)).toBe(true);
    expect(canOpenPath("/orders/9", set)).toBe(true);
    expect(canOpenPath("/customer-orders", set)).toBe(false);
    expect(canOpenPath("/sellRetailer", new Set(["sell.view"]))).toBe(false);
    expect(canOpenPath("/some-detail-route", set)).toBe(true);
  });

  it("nobody can grant more than they hold; admin can grant anything", () => {
    const actor = { isAdmin: false, permissions: new Set(["roles.edit", "offers.view"]) };
    expect(canGrantAll(actor, ["offers.view"])).toBe(true);
    expect(canGrantAll(actor, ["offers.view", "expenses.delete"])).toBe(false);
    expect(canGrantAll({ isAdmin: true, permissions: new Set<string>() }, ["expenses.delete"])).toBe(true);
  });
});
