import { UserRole } from "@prisma/client";
import { ALL_MENU_ITEMS } from "@/src/lib/menus";

/**
 * The single list of everything a role can be allowed to do.
 *
 * A permission key is `<module>.<action>`. Every module that has a sidebar
 * page carries that page's href in `menu`; its `view` action is what lets a
 * user open the page. Modules and actions are plain data: the Roles page,
 * the sidebar, the server guards and the legacy migration are all generated
 * from this file, so adding an action here is the only step needed to make it
 * assignable.
 *
 * `legacy` says which fixed roles could do the action BEFORE this system
 * existed (the hard-coded `role === ...` checks). It is used only to turn the
 * old role+menu model into permissions without changing anyone's access:
 *   - omitted / "menu": whoever could open the module's page could do it
 *   - UserRole[]: only those fixed roles (the narrower check that was in code)
 * `menuIndependent` actions never depended on the sidebar menu (API-only
 * powers such as wallet approval), so the menu grant is not required.
 */

export interface ActionDef {
  key: string;
  label: string;
  /** Shown in the "Special" column of the matrix instead of a CRUD column. */
  special?: boolean;
  legacy?: "menu" | UserRole[];
  menuIndependent?: boolean;
  /**
   * ISO time the action was introduced. A role saved BEFORE it was introduced
   * cannot have chosen it, so it gets its legacy default until the role is saved
   * again (otherwise adding an action would silently take access away).
   */
  since?: string;
}

export interface ModuleDef {
  key: string;
  label: string;
  group: string;
  /** Sidebar href that `<key>.view` opens. */
  menu?: string;
  actions: ActionDef[];
}

const { ADMIN, MOD, UPLOADER, SELLER, RESELLER, SHOP_SELLER } = UserRole;

// `legacy` on view narrows the sidebar's role list to who could ACTUALLY use the
// page: several pages hid their content behind a stricter in-page role gate than
// the menu list, so the menu alone over-states what those roles could do.
const view = (legacy?: ActionDef["legacy"]): ActionDef => ({ key: "view", label: "View", legacy });
const create = (legacy?: ActionDef["legacy"]): ActionDef => ({ key: "create", label: "Create", legacy });
const edit = (legacy?: ActionDef["legacy"]): ActionDef => ({ key: "edit", label: "Edit", legacy });
const del = (legacy?: ActionDef["legacy"]): ActionDef => ({ key: "delete", label: "Delete", legacy });
const special = (
  key: string,
  label: string,
  legacy?: ActionDef["legacy"],
  menuIndependent = false,
  since?: string
): ActionDef => ({
  key,
  label,
  special: true,
  legacy,
  menuIndependent,
  since,
});

// Everyone except the shop-floor logins, who were limited to their own shop.
const NOT_SHOP_LOGIN = Object.values(UserRole).filter((r) => r !== UserRole.SHOP_SELLER);
const ADDED_2026_10_11 = "2026-10-11T10:24:22.370Z";

export const MODULES: ModuleDef[] = [
  // ───────── Products ─────────
  {
    key: "upload",
    label: "Upload",
    group: "Products",
    menu: "/upload",
    actions: [view(), create()],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    group: "Products",
    menu: "/catalogue",
    actions: [
      view(),
      // Opening a category's designs (the page after the category list).
      special("browse", "Browse a category's designs", [ADMIN, UPLOADER, SELLER, RESELLER, SHOP_SELLER]),
      // Billing logins used to see the catalogue without the reseller price.
      special(
        "viewResellerPrice",
        "See the reseller price",
        [ADMIN, UPLOADER, SELLER, RESELLER, UserRole.SELLER_MANAGER],
        false,
        ADDED_2026_10_11
      ),
      // A design's detail page, read only (billing logins); editors get it editable.
      special("viewDetails", "Open a design's detail page", [ADMIN, UPLOADER, SHOP_SELLER]),
      // Kurti media / price / spec / restock edits: kurti.ts allowed ADMIN + UPLOADER only.
      edit([ADMIN, UPLOADER]),
      // Deleting a category / kurti and clearing its stock were ADMIN-only buttons.
      del([ADMIN]),
      special("viewStats", "View item & piece counts", [ADMIN, UPLOADER]),
      special("manageCategories", "Add / edit categories", [ADMIN]),
      special("export", "Download media & PDFs", [ADMIN]),
      // Index / vector / data-migration endpoints nobody should hit by accident.
      special("maintenance", "Run catalogue maintenance jobs", [ADMIN]),
    ],
  },
  {
    key: "otherProducts",
    label: "Other Products",
    group: "Products",
    menu: "/other-products",
    // Other roles are listed in the sidebar but get a "no permission" message.
    actions: [view([ADMIN, UPLOADER]), create(), edit(), del()],
  },
  {
    key: "watermark",
    label: "Watermark",
    group: "Products",
    menu: "/watermark",
    actions: [view()],
  },
  {
    key: "movedHistory",
    label: "Moved Kurti History",
    group: "Products",
    menu: "/moved-history",
    actions: [view()],
  },

  // ───────── Billing ─────────
  {
    key: "sell",
    label: "Sell",
    group: "Billing",
    menu: "/sell",
    // The sidebar also lists UPLOADER, but the page itself shows it "not allowed".
    actions: [view([ADMIN, SELLER, SHOP_SELLER]), create()],
  },
  {
    key: "sellRetailer",
    label: "Sell Retailer",
    group: "Billing",
    menu: "/sellRetailer",
    actions: [view(), create(), special("chooseShop", "Bill on behalf of any shop", [ADMIN])],
  },
  {
    key: "hallSales",
    label: "Hall Sales",
    group: "Billing",
    menu: "/hall-sales",
    actions: [view(), create(), special("chooseShop", "Bill on behalf of any shop", [ADMIN])],
  },

  // ───────── Stock ─────────
  {
    key: "addStock",
    label: "Add Stock",
    group: "Stock",
    menu: "/addstock",
    // The page is ADMIN-only in code (UPLOADER is shown "not allowed").
    actions: [view([ADMIN]), create()],
  },
  {
    key: "godown",
    label: "Godown Stock",
    group: "Stock",
    menu: "/godown",
    actions: [view(), edit()],
  },
  {
    key: "stockLocation",
    label: "Stock by Location",
    group: "Stock",
    menu: "/stock-location",
    actions: [
      view(),
      special("viewMoves", "View stock moves", [ADMIN, UPLOADER]),
      // Pieces per location are for everyone on the page; the rupee value was admin-only.
      special("viewStockValue", "View stock value", [ADMIN]),
      special("moveStock", "Move stock between locations"),
      // Without this a login can only sell / move stock in and out of its own shop.
      special(
        "anyLocation",
        "Use any stock location (not limited to own shop)",
        NOT_SHOP_LOGIN,
        true,
        ADDED_2026_10_11
      ),
      special("clearLocation", "Clear a location's stock", [ADMIN]),
    ],
  },
  {
    key: "moveToFloor",
    label: "Move to Floor",
    group: "Stock",
    menu: "/move-to-floor",
    actions: [view(), special("moveStock", "Move stock")],
  },

  // ───────── Sales & Orders ─────────
  {
    key: "orders",
    label: "Orders",
    group: "Sales & Orders",
    menu: "/orders",
    actions: [view(), edit(), del()],
  },
  {
    key: "onlineSales",
    label: "Online Sales",
    group: "Sales & Orders",
    menu: "/online-sales",
    actions: [
      view(),
      edit(),
      special("editShipping", "Edit shipping & view its history", [ADMIN]),
    ],
  },
  {
    key: "offlineSales",
    label: "Offline Sales",
    group: "Sales & Orders",
    menu: "/offline-sales",
    // Editing a bill was open to the shop's own staff; only the cross-shop view was admin-only.
    actions: [view(), edit(), special("viewAllShops", "View & edit every shop's bills", [ADMIN])],
  },
  {
    key: "sellingHistory",
    label: "Selling History",
    group: "Sales & Orders",
    menu: "/sellinghistory",
    // The page gate admits ADMIN / SHOP_SELLER (and shows SELLER "not allowed").
    actions: [view([ADMIN, SHOP_SELLER])],
  },

  // ───────── Reports ─────────
  {
    key: "analytics",
    label: "Analytics",
    group: "Reports",
    menu: "/analytics",
    actions: [view(), special("viewProfit", "View profit", [ADMIN])],
  },
  {
    key: "salesByLocation",
    label: "Sales by Location",
    group: "Reports",
    menu: "/sales-by-location",
    actions: [view()],
  },

  // ───────── Customer ─────────
  {
    key: "offers",
    label: "Offers",
    group: "Customer",
    menu: "/offers",
    actions: [view(), create(), edit(), del()],
  },
  {
    key: "shippingRates",
    label: "Shipping Rates",
    group: "Customer",
    menu: "/shipping-calculator",
    actions: [view(), create(), edit(), del()],
  },
  {
    key: "customerOrders",
    label: "Customer Orders",
    group: "Customer",
    menu: "/customer-orders",
    actions: [view(), edit()],
  },
  {
    key: "allCustomers",
    label: "All Customers",
    group: "Customer",
    menu: "/all-customers",
    actions: [view()],
  },
  {
    key: "homepageSliders",
    label: "Homepage Sliders",
    group: "Customer",
    menu: "/customer-settings",
    actions: [view(), create(), del()],
  },
  {
    key: "kurtiTypes",
    label: "Kurti Types",
    group: "Customer",
    menu: "/kurti-types",
    actions: [view(), edit(), del()],
  },
  {
    key: "storefrontMenu",
    label: "Storefront Menu",
    group: "Customer",
    menu: "/storefront-menu",
    actions: [view(), create(), edit(), del()],
  },
  {
    key: "reels",
    label: "Reels",
    group: "Customer",
    menu: "/reels",
    actions: [view(), create(), edit(), del()],
  },

  // ───────── Accounts ─────────
  {
    key: "wallet",
    label: "Wallet Requests",
    group: "Accounts",
    menu: "/wallet-request",
    actions: [
      view(),
      // The wallet API only ever let ADMIN and MOD approve or add money.
      special("approve", "Approve / reject requests", [ADMIN, MOD], true),
      special("addMoney", "Add money / reseller credit", [ADMIN, MOD], true),
    ],
  },
  {
    key: "expenses",
    label: "Expenses",
    group: "Accounts",
    menu: "/expenses",
    actions: [view(), create(), edit(), del()],
  },
  {
    key: "staff",
    label: "Staff & Users",
    group: "Accounts",
    menu: "/request",
    actions: [
      view(),
      // Verifying users / editing group & credit limit: ADMIN and MOD used the page.
      edit([ADMIN, MOD]),
      del([ADMIN]),
      special("resetPassword", "Reset passwords", [ADMIN]),
      special("assignRole", "Change a user's role", [ADMIN]),
      special("viewSalary", "View & set salary", [ADMIN]),
    ],
  },
  {
    key: "roles",
    label: "Roles & Permissions",
    group: "Accounts",
    menu: "/roles",
    actions: [view(), create(), edit(), del()],
  },

  // ───────── Settings ─────────
  {
    key: "settings",
    label: "Settings",
    group: "Settings",
    menu: "/settings",
    actions: [
      view(),
      edit(),
      // The "new release" price bands shown on the storefront. Anyone who could
      // open Settings could change them before, so the menu rule is kept.
      special("manageNewRelease", "Edit storefront 'new release' bands"),
      // The payment QR / UPI id shown to resellers and customers.
      special("managePayment", "Change payment QR / UPI", [ADMIN]),
      // The /api/whatsapp relay sends from the business number, so it is kept to admins.
      special("sendWhatsapp", "Send WhatsApp messages", [ADMIN]),
    ],
  },
];

export type PermissionKey = string;

export const permissionKey = (module: string, action: string): PermissionKey => `${module}.${action}`;

const BY_KEY = new Map<PermissionKey, { module: ModuleDef; action: ActionDef }>();
for (const m of MODULES) {
  for (const a of m.actions) BY_KEY.set(permissionKey(m.key, a.key), { module: m, action: a });
}

/** Every permission key the system knows, in registry order. */
export const ALL_PERMISSIONS: readonly PermissionKey[] = Array.from(BY_KEY.keys());

export const isValidPermission = (key: unknown): key is PermissionKey =>
  typeof key === "string" && BY_KEY.has(key);

/** Keeps only registry keys (deduplicated). Unknown keys are dropped, never trusted. */
export const sanitizePermissions = (input: unknown): PermissionKey[] =>
  Array.from(new Set(Array.isArray(input) ? input.filter(isValidPermission) : []));

export const findModuleForPath = (pathname: string): ModuleDef | undefined => {
  // "/orders" must not match "/customer-orders", nor "/sell" match "/sellRetailer".
  let best: ModuleDef | undefined;
  for (const m of MODULES) {
    if (!m.menu) continue;
    if (pathname === m.menu || pathname.startsWith(`${m.menu}/`)) {
      if (!best || m.menu.length > (best.menu?.length ?? 0)) best = m;
    }
  }
  return best;
};

export const moduleForMenu = (href: string): ModuleDef | undefined =>
  MODULES.find((m) => m.menu === href);

export const viewPermissionForMenu = (href: string): PermissionKey | undefined => {
  const m = moduleForMenu(href);
  return m ? permissionKey(m.key, "view") : undefined;
};

/** Actions introduced after the first release, with when. */
export const LATER_ADDED: { key: PermissionKey; since: number }[] = MODULES.flatMap((m) =>
  m.actions
    .filter((a) => a.since)
    .map((a) => ({ key: permissionKey(m.key, a.key), since: Date.parse(a.since as string) }))
);

// ───────── Legacy mapping ─────────

const menuRoles = (href: string | undefined): UserRole[] =>
  href ? ALL_MENU_ITEMS.find((i) => i.href === href)?.roles ?? [] : [];

/** Fixed roles that could do this permission under the old role checks. */
export const legacyRolesFor = (key: PermissionKey): UserRole[] => {
  const hit = BY_KEY.get(key);
  if (!hit) return [];
  const { module, action } = hit;
  if (action.legacy && action.legacy !== "menu") return action.legacy;
  // Inherit whoever could really use the page (its view rule), else the menu list.
  const viewRule = module.actions.find((a) => a.key === "view")?.legacy;
  if (viewRule && viewRule !== "menu") return viewRule;
  return menuRoles(module.menu);
};

/**
 * The permissions the old model gave a role: the menus it listed plus the
 * in-page rights its fixed (base) role had. Nothing is granted that the role
 * could not already do; this is what existing roles are migrated to.
 */
export const legacyPermissions = (baseRole: UserRole, menus: readonly string[]): PermissionKey[] => {
  const menuSet = new Set(menus);
  const out: PermissionKey[] = [];
  for (const [key, { module, action }] of BY_KEY) {
    const hasMenu = !module.menu || menuSet.has(module.menu);
    if (action.key === "view") {
      // The menu grants the page; a stricter in-page gate (view override) must
      // also admit the base role.
      const rule = action.legacy && action.legacy !== "menu" ? action.legacy : null;
      if (hasMenu && module.menu && (!rule || rule.includes(baseRole))) out.push(key);
      continue;
    }
    if (!action.menuIndependent && !hasMenu) continue;
    if (legacyRolesFor(key).includes(baseRole)) out.push(key);
  }
  return out;
};

// ───────── Shared guards for lookups used by many pages ─────────

const viewOf = (...modules: string[]): PermissionKey[] => modules.map((m) => permissionKey(m, "view"));

/**
 * Product / category / party / kurti lookups are shared by every page that
 * works with stock or bills. Reading them needs the view permission of at least
 * one such module, which still keeps customer-type accounts out.
 */
export const PRODUCT_READ_PERMISSIONS: PermissionKey[] = viewOf(
  "catalogue",
  "upload",
  "addStock",
  "godown",
  "stockLocation",
  "moveToFloor",
  "sell",
  "sellRetailer",
  "hallSales",
  "offlineSales",
  "onlineSales",
  "orders",
  "otherProducts",
  "offers",
  "movedHistory",
  "sellingHistory",
  "analytics",
  "customerOrders"
);

/** Image upload is shared by every form that attaches pictures. */
export const IMAGE_UPLOAD_PERMISSIONS: PermissionKey[] = [
  "upload.create",
  "catalogue.edit",
  "catalogue.manageCategories",
  "otherProducts.create",
  "otherProducts.edit",
  "offers.create",
  "offers.edit",
  "homepageSliders.create",
  "kurtiTypes.edit",
  "storefrontMenu.create",
  "storefrontMenu.edit",
  "settings.manageNewRelease",
  "settings.managePayment",
];
