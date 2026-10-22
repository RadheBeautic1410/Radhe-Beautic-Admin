import { UserRole } from "@prisma/client";

/**
 * The admin sidebar structure (groups, names, icons, hrefs). What a user may open
 * is decided by permissions (src/lib/permissions): the module whose `menu` is an
 * item's href must grant `<module>.view`.
 * `roles` is the LEGACY per-role default. It is kept only to seed the system
 * roles and to map the old menu model onto permissions (permissions/registry.ts);
 * nothing authorizes from it directly any more.
 */
export interface MenuItem {
  name: string;
  href: string;
  icon: string;
  roles: UserRole[];
}

export interface MenuGroup {
  name: string;
  icon: string;
  items: MenuItem[];
}

const { ADMIN, UPLOADER, SELLER, RESELLER, SHOP_SELLER, SELLER_MANAGER } = UserRole;

export const MENU_GROUPS: MenuGroup[] = [
  {
    name: "Products",
    icon: "📋",
    items: [
      { name: "Upload", href: "/upload", icon: "📤", roles: [ADMIN, UPLOADER] },
      {
        name: "Catalogue",
        href: "/catalogue",
        icon: "📋",
        roles: [ADMIN, UPLOADER, SELLER, RESELLER, SHOP_SELLER, SELLER_MANAGER],
      },
      {
        name: "Other Products",
        href: "/other-products",
        icon: "👗",
        roles: [ADMIN, UPLOADER, SELLER, RESELLER, SHOP_SELLER, SELLER_MANAGER],
      },
      { name: "Watermark", href: "/watermark", icon: "💧", roles: [ADMIN, UPLOADER] },
      {
        name: "Moved Kurti History",
        href: "/moved-history",
        icon: "📜",
        roles: [ADMIN, RESELLER, SHOP_SELLER, SELLER, UPLOADER, SELLER_MANAGER],
      },
    ],
  },
  {
    name: "Billing",
    icon: "💰",
    items: [
      { name: "Sell", href: "/sell", icon: "💰", roles: [ADMIN, UPLOADER, SELLER, SHOP_SELLER] },
      { name: "Sell Retailer", href: "/sellRetailer", icon: "🏬", roles: [ADMIN, SHOP_SELLER] },
      { name: "Hall Sales", href: "/hall-sales", icon: "🏪", roles: [ADMIN, SELLER_MANAGER] },
    ],
  },
  {
    name: "Stock",
    icon: "📦",
    items: [
      { name: "Add Stock", href: "/addstock", icon: "📦", roles: [ADMIN, UPLOADER, SELLER] },
      { name: "Godown Stock", href: "/godown", icon: "🏬", roles: [ADMIN, UPLOADER, SHOP_SELLER] },
      {
        name: "Stock by Location",
        href: "/stock-location",
        icon: "📍",
        roles: [ADMIN, UPLOADER, SELLER, SHOP_SELLER],
      },
      { name: "Move to Floor", href: "/move-to-floor", icon: "⬇️", roles: [ADMIN, UPLOADER, SELLER] },
      { name: "Vendor Purchases", href: "/vendor-purchases", icon: "🧾", roles: [ADMIN] },
    ],
  },
  {
    name: "Sales & Orders",
    icon: "🛒",
    items: [
      { name: "Orders", href: "/orders", icon: "🛒", roles: [ADMIN, SELLER_MANAGER] },
      { name: "Online Sales", href: "/online-sales", icon: "🌐", roles: [ADMIN, SELLER_MANAGER] },
      {
        name: "Offline Sales",
        href: "/offline-sales",
        icon: "🏪",
        roles: [ADMIN, SHOP_SELLER, SELLER_MANAGER],
      },
      {
        name: "Selling History",
        href: "/sellinghistory",
        icon: "🧾",
        roles: [ADMIN, SELLER, SHOP_SELLER],
      },
    ],
  },
  {
    name: "Reports",
    icon: "📈",
    items: [
      { name: "Analytics", href: "/analytics", icon: "📈", roles: [ADMIN, SELLER_MANAGER] },
      { name: "Sales by Location", href: "/sales-by-location", icon: "📍", roles: [ADMIN] },
    ],
  },
  {
    name: "Customer",
    icon: "👥",
    items: [
      { name: "Offer", href: "/offers", icon: "🎁", roles: [ADMIN] },
      { name: "Shipping Calculator", href: "/shipping-calculator", icon: "🚚", roles: [ADMIN] },
      { name: "COD Charges", href: "/cod-settings", icon: "💵", roles: [ADMIN] },
      { name: "Customer Orders", href: "/customer-orders", icon: "📦", roles: [ADMIN] },
      { name: "All Customers", href: "/all-customers", icon: "👥", roles: [ADMIN] },
      { name: "Homepage Sliders", href: "/customer-settings", icon: "⚙️", roles: [ADMIN] },
      { name: "Kurti Types", href: "/kurti-types", icon: "👗", roles: [ADMIN] },
      { name: "Storefront Menu", href: "/storefront-menu", icon: "🧭", roles: [ADMIN] },
      { name: "Reels", href: "/reels", icon: "🎬", roles: [ADMIN] },
    ],
  },
  {
    name: "Accounts",
    icon: "💸",
    items: [
      { name: "Wallet Request", href: "/wallet-request", icon: "👛", roles: [ADMIN, SELLER_MANAGER] },
      { name: "Expenses", href: "/expenses", icon: "💸", roles: [ADMIN] },
      { name: "Staff Requests", href: "/request", icon: "📝", roles: [ADMIN] },
      { name: "Roles & Permissions", href: "/roles", icon: "🔐", roles: [ADMIN] },
    ],
  },
  {
    name: "Settings",
    icon: "⚙️",
    items: [
      {
        name: "Settings",
        href: "/settings",
        icon: "⚙️",
        roles: [ADMIN, RESELLER, SELLER, UPLOADER, SELLER_MANAGER],
      },
    ],
  },
];

export const ALL_MENU_ITEMS: MenuItem[] = MENU_GROUPS.flatMap((g) => g.items);

/** Fixed roles that get a system Role row, with the menus they have today. */
export const SYSTEM_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MOD,
  UserRole.UPLOADER,
  UserRole.SELLER,
  UserRole.RESELLER,
  UserRole.SHOP_SELLER,
  UserRole.SELLER_MANAGER,
  UserRole.USER,
];

export const defaultMenusForRole = (role: UserRole): string[] =>
  ALL_MENU_ITEMS.filter((m) => m.roles.includes(role)).map((m) => m.href);

// Whether a user may open a menu / path is decided by permissions:
// see canOpenPath in src/lib/permissions/resolve.ts.
