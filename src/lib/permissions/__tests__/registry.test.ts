import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { ALL_MENU_ITEMS, SYSTEM_ROLES, defaultMenusForRole } from "@/src/lib/menus";
import {
  ALL_PERMISSIONS,
  MODULES,
  findModuleForPath,
  isValidPermission,
  legacyPermissions,
  legacyRolesFor,
  permissionKey,
  sanitizePermissions,
  viewPermissionForMenu,
} from "../registry";

describe("registry", () => {
  it("has unique <module>.<action> keys", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    for (const key of ALL_PERMISSIONS) expect(key).toMatch(/^[a-zA-Z]+\.[a-zA-Z]+$/);
  });

  it("gives every sidebar item exactly one module with a view permission", () => {
    for (const item of ALL_MENU_ITEMS) {
      const matches = MODULES.filter((m) => m.menu === item.href);
      expect(matches, item.href).toHaveLength(1);
      expect(matches[0].actions[0].key).toBe("view");
      expect(viewPermissionForMenu(item.href)).toBe(`${matches[0].key}.view`);
    }
  });

  it("covers the permissions named in the migration brief", () => {
    for (const key of [
      "expenses.view",
      "expenses.create",
      "expenses.edit",
      "expenses.delete",
      "offers.view",
      "offers.create",
      "offers.edit",
      "offers.delete",
      "shippingRates.view",
      "reels.view",
      "analytics.viewProfit",
      "wallet.view",
      "wallet.approve",
      "roles.view",
      "roles.create",
      "roles.edit",
      "roles.delete",
      "moveToFloor.moveStock",
    ]) {
      expect(isValidPermission(key), key).toBe(true);
    }
  });

  it("rejects unknown keys", () => {
    expect(isValidPermission("expenses.nuke")).toBe(false);
    expect(isValidPermission("nothing.view")).toBe(false);
    expect(isValidPermission(42)).toBe(false);
    expect(sanitizePermissions(["expenses.view", "x.y", "expenses.view", 7])).toEqual(["expenses.view"]);
    expect(sanitizePermissions("expenses.view")).toEqual([]);
  });

  it("resolves a path to its module without confusing look-alike prefixes", () => {
    expect(findModuleForPath("/orders")?.key).toBe("orders");
    expect(findModuleForPath("/orders/123")?.key).toBe("orders");
    expect(findModuleForPath("/customer-orders")?.key).toBe("customerOrders");
    expect(findModuleForPath("/sell")?.key).toBe("sell");
    expect(findModuleForPath("/sellRetailer")?.key).toBe("sellRetailer");
    expect(findModuleForPath("/sellinghistory")?.key).toBe("sellingHistory");
    expect(findModuleForPath("/auth/login")).toBeUndefined();
    expect(findModuleForPath("/")).toBeUndefined();
  });

  it("keeps legacy role lists inside the real roles", () => {
    for (const key of ALL_PERMISSIONS) {
      for (const role of legacyRolesFor(key)) expect(Object.values(UserRole)).toContain(role);
    }
  });
});

describe("legacy mapping preserves today's access", () => {
  // Pages whose in-page role gate was stricter than the sidebar list: the page
  // showed "not allowed" / nothing to the other roles, so they never really
  // had access. The rule must follow what the page actually admitted.
  const PAGE_GATES: Record<string, UserRole[]> = {
    "/sell": [UserRole.ADMIN, UserRole.SELLER, UserRole.SHOP_SELLER],
    "/addstock": [UserRole.ADMIN],
    "/sellinghistory": [UserRole.ADMIN, UserRole.SHOP_SELLER],
    "/other-products": [UserRole.ADMIN, UserRole.UPLOADER],
  };

  it("opens exactly the pages each fixed role could really use (menu defaults + page gates)", () => {
    for (const role of Object.values(UserRole)) {
      const perms = new Set(legacyPermissions(role, defaultMenusForRole(role)));
      for (const item of ALL_MENU_ITEMS) {
        const inMenu = item.roles.includes(role);
        const gate = PAGE_GATES[item.href];
        const was = inMenu && (!gate || gate.includes(role));
        const key = viewPermissionForMenu(item.href)!;
        expect(perms.has(key), `${role} ${item.href}`).toBe(was);
      }
    }
  });

  it("never grants a page the old menu did not list", () => {
    for (const role of Object.values(UserRole)) {
      const perms = new Set(legacyPermissions(role, defaultMenusForRole(role)));
      for (const item of ALL_MENU_ITEMS) {
        if (perms.has(viewPermissionForMenu(item.href)!)) expect(item.roles).toContain(role);
      }
    }
  });

  it("keeps UPLOADER out of pages that showed it 'not allowed'", () => {
    const uploader = new Set(legacyPermissions(UserRole.UPLOADER, defaultMenusForRole(UserRole.UPLOADER)));
    expect(uploader.has("addStock.view")).toBe(false);
    expect(uploader.has("addStock.create")).toBe(false);
    expect(uploader.has("sell.view")).toBe(false);
    expect(uploader.has("sell.create")).toBe(false);
    expect(uploader.has("upload.view")).toBe(true);
  });

  it("grants a custom role's listed menus as view only unless its base role could act", () => {
    // A SELLER-based custom role handed the Expenses menu could open the page
    // before, but every expense action was ADMIN-only.
    const perms = new Set(legacyPermissions(UserRole.SELLER, ["/expenses", "/sell"]));
    expect(perms.has("expenses.view")).toBe(true);
    expect(perms.has("expenses.create")).toBe(false);
    expect(perms.has("expenses.delete")).toBe(false);
    expect(perms.has("sell.view")).toBe(true);
    expect(perms.has("sell.create")).toBe(true);
    // menus it was not given stay closed
    expect(perms.has("catalogue.view")).toBe(false);
  });

  it("keeps narrower in-page rules narrower than the menu", () => {
    // Catalogue is open to SELLER, but editing kurtis was ADMIN/UPLOADER only.
    const seller = new Set(legacyPermissions(UserRole.SELLER, defaultMenusForRole(UserRole.SELLER)));
    expect(seller.has("catalogue.view")).toBe(true);
    expect(seller.has("catalogue.edit")).toBe(false);
    expect(seller.has("catalogue.viewStats")).toBe(false);
    const uploader = new Set(legacyPermissions(UserRole.UPLOADER, defaultMenusForRole(UserRole.UPLOADER)));
    expect(uploader.has("catalogue.edit")).toBe(true);
    expect(uploader.has("catalogue.delete")).toBe(false);
    expect(uploader.has("analytics.view")).toBe(false);
  });

  it("gives system ADMIN every permission through the legacy path too", () => {
    const perms = new Set(legacyPermissions(UserRole.ADMIN, defaultMenusForRole(UserRole.ADMIN)));
    for (const key of ALL_PERMISSIONS) {
      expect(perms.has(key), key).toBe(true);
    }
  });

  it("keeps menu-independent wallet powers for MOD (API-only role)", () => {
    const mod = new Set(legacyPermissions(UserRole.MOD, defaultMenusForRole(UserRole.MOD)));
    expect(mod.has("wallet.approve")).toBe(true);
    expect(mod.has("wallet.addMoney")).toBe(true);
    expect(mod.has("wallet.view")).toBe(false);
    expect(mod.has("expenses.view")).toBe(false);
  });

  it("does not grant anything outside the registry", () => {
    for (const role of SYSTEM_ROLES) {
      for (const key of legacyPermissions(role, ALL_MENU_ITEMS.map((m) => m.href))) {
        expect(isValidPermission(key)).toBe(true);
      }
    }
    expect(permissionKey("a", "b")).toBe("a.b");
  });
});
