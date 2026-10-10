"use client";
import { UserButton } from "@/src/components/ui/user-button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { cn } from "@/src/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MENU_GROUPS, canOpenMenu } from "@/src/lib/menus";

// "/orders" must not light up on "/customer-orders", nor "/sell" on "/sellRetailer".
const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  // Only the menus this user's role grants; a group with none is dropped.
  const routes = useMemo(
    () =>
      MENU_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter((item) => canOpenMenu(item.href, user)),
      })).filter((group) => group.items.length > 0),
    [user?.role, user?.menus]
  );

  // Auto-expand submenu if current path matches any submenu item
  useEffect(() => {
    routes.forEach((route) => {
      if (route.items.some((item) => isActive(pathname, item.href))) {
        setOpenSubmenus((prev) => new Set(prev).add(route.name));
      }
    });
  }, [pathname, routes]);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden rounded-lg p-2 shadow-md border border-black/10 bg-white text-slate-900 hover:bg-white/95 transition-colors"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-slate-900"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen bg-white/10 backdrop-blur-lg border-r border-white/20 shadow-xl transition-all duration-300  from-sky-400 ",
          isCollapsed ? "w-16" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-white/20">
            <div className="flex items-center justify-between">
              {!isCollapsed && (
                <Link href="/" className="flex items-center gap-2">
                  <img
                    src="/images/radhe_logo.svg"
                    alt="logo"
                    width={250}
                    className="w-full"
                    height={250}
                  />
                </Link>
              )}
              {isCollapsed && (
                <Link href="/" className="flex justify-center w-full">
                  <img
                    src="/images/TextLogo.png"
                    height="32"
                    width="32"
                    alt="Logo"
                    className="rounded-lg"
                  />
                </Link>
              )}
              {/* <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:block text-white/70 hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn(
                    "w-5 h-5 transition-transform",
                    isCollapsed && "rotate-180"
                  )}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button> */}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-2">
              {routes.map((route) => {
                // A group holding a single page is shown as a plain link.
                const single = route.items.length === 1 && route.items[0].name === route.name;
                if (single) {
                  const item = route.items[0];
                  return (
                    <Link
                      key={route.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                        isActive(pathname, item.href)
                          ? "bg-white/20 text-white shadow-lg"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-xl flex-shrink-0">{item.icon}</span>
                      {!isCollapsed && <span className="font-medium">{item.name}</span>}
                    </Link>
                  );
                }

                return (
                  <div key={route.name}>
                    <button
                      onClick={() => {
                        const next = new Set(openSubmenus);
                        if (next.has(route.name)) next.delete(route.name);
                        else next.add(route.name);
                        setOpenSubmenus(next);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                        route.items.some((s) => isActive(pathname, s.href))
                          ? "text-white bg-white/10"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span className="text-xl flex-shrink-0">{route.icon}</span>
                      {!isCollapsed && (
                        <>
                          <span className="font-medium flex-1 text-left">{route.name}</span>
                          {openSubmenus.has(route.name) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </>
                      )}
                    </button>
                    {!isCollapsed && openSubmenus.has(route.name) && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-white/20 pl-2">
                        {route.items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                              isActive(pathname, item.href)
                                ? "bg-white/20 text-white shadow-lg"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <span className="text-xl flex-shrink-0">{item.icon}</span>
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>


          {/* User Section */}
          <div className="p-4 border-t border-white/20">
            <div className="flex items-center gap-3">
              <UserButton />
              {!isCollapsed && (
                <div className="flex-1">
                  <div className="text-white/70 text-sm">Welcome back!</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
