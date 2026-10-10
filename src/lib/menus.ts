import { UserRole } from "@prisma/client";

/**
 * The admin sidebar. Each item's `href` is its permission key: a Role's `menus`
 * lists the hrefs it may open. `roles` is the built-in default - used to seed the
 * system roles, and as the fallback for a user whose role has no Role row yet.
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

// "/orders" must not match "/customer-orders", nor "/sell" match "/sellRetailer".
const matches = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * Can this user open `href`? `menus` comes from the session (their Role row);
 * when it is missing the built-in per-role defaults apply. ADMIN is never locked out.
 */
export const canOpenMenu = (
  href: string,
  user: { role?: UserRole; menus?: string[] | null } | undefined | null
): boolean => {
  if (!user?.role) return false;
  if (user.role === UserRole.ADMIN && !user.menus) return true;
  if (user.menus) return user.menus.includes(href);
  return !!ALL_MENU_ITEMS.find((m) => m.href === href)?.roles.includes(user.role);
};

/**
 * Whether `pathname` is allowed. Paths that are not a menu item (home, detail
 * routes under an unknown prefix, auth pages) are not restricted here.
 */
export const canOpenPath = (
  pathname: string,
  user: { role?: UserRole; menus?: string[] | null } | undefined | null
): boolean => {
  const item = ALL_MENU_ITEMS.find((m) => matches(pathname, m.href));
  if (!item) return true;
  return canOpenMenu(item.href, user);
};
