"use client";
import * as z from "zod";
import { UserButton } from "@/src/components/ui/user-button";
import { Button } from "@/src/components/ui/button";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { useForm } from "react-hook-form";
import { cn } from "@/src/lib/utils";

const routes = [
  {
    name: "Upload",
    href: "/upload",
    role: [UserRole.ADMIN, UserRole.UPLOADER],
    icon: "📤",
  },
  //     {
  //     name: 'New Upload',
  //     href: '/newupload',
  //     role: [UserRole.ADMIN, UserRole.UPLOADER]
  // },
  {
    name: "Catalogue",
    href: "/catalogue",
    role: [
      UserRole.ADMIN,
      UserRole.UPLOADER,
      UserRole.SELLER,
      UserRole.RESELLER,
      UserRole.SHOP_SELLER,
      UserRole.SELLER_MANAGER,
    ],
    icon: "📋",
  },
  {
    name: "Sell",
    href: "/sell",
    role: [UserRole.ADMIN, UserRole.UPLOADER, UserRole.SELLER],
    icon: "💰",
  },
  {
    name: "Sell Retailer",
    href: "/sellRetailer",
    role: [UserRole.ADMIN, UserRole.SHOP_SELLER],
    icon: "🏬",
  },
  {
    name: "Hall Sales",
    href: "/hall-sales",
    role: [
      UserRole.ADMIN,
      // UserRole.SHOP_SELLER,
      UserRole.SELLER_MANAGER,
    ],
    icon: "🏪",
  },
  {
    name: "Add Stock",
    href: "/addstock",
    role: [UserRole.ADMIN, UserRole.UPLOADER, UserRole.SELLER],
    icon: "📦",
  },
  {
    name: "Request",
    href: "/request",
    role: [UserRole.ADMIN],
    icon: "📝",
  },
  {
    name: "Selling History",
    href: "/sellinghistory",
    role: [UserRole.ADMIN, UserRole.SELLER],
    icon: "📊",
  },
  {
    name: "Offline Sales",
    href: "/offline-sales",
    role: [UserRole.ADMIN, UserRole.SHOP_SELLER, UserRole.SELLER_MANAGER],
    icon: "🏪",
  },
  {
    name: "Online Sales",
    href: "/online-sales",
    role: [UserRole.ADMIN, UserRole.SELLER_MANAGER],
    icon: "🌐",
  },
  {
    name: "Orders",
    href: "/orders",
    role: [UserRole.ADMIN, UserRole.SELLER_MANAGER],
    icon: "🛒",
  },
  {
    name: "Analytics",
    href: "/analytics",
    role: [UserRole.ADMIN, UserRole.SELLER_MANAGER],
    icon: "📈",
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    role: [UserRole.ADMIN, UserRole.SELLER_MANAGER],
    icon: "📊",
  },
  {
    name: "Settings",
    href: "/settings",
    role: [
      UserRole.ADMIN,
      UserRole.RESELLER,
      UserRole.SELLER,
      UserRole.UPLOADER,
      UserRole.SELLER_MANAGER,
    ],
    icon: "⚙️",
  },
  {
    name: "History",
    href: "/moved-history",
    role: [
      UserRole.ADMIN,
      UserRole.RESELLER,
      UserRole.SHOP_SELLER,
      UserRole.SELLER,
      UserRole.UPLOADER,
      UserRole.SELLER_MANAGER,
    ],
    icon: "📜",
  },
  {
    name: "Watermark",
    href: "/watermark",
    role: [
      UserRole.ADMIN,
      UserRole.UPLOADER,
      // UserRole.RESELLER,
    ],
    icon: "💧",
  },
  {
    name: "Wallet Request",
    href: "/wallet-request",
    role: [
      UserRole.ADMIN,
      UserRole.SELLER_MANAGER,
      // UserRole.RESELLER,
      // UserRole.SELLER,
    ],
    icon: "💰",
  },
];

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const form = useForm({
    defaultValues: {
      name: "",
    },
  });

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
        className="fixed top-4 left-4 z-50 lg:hidden bg-white/10 backdrop-blur-sm p-2 rounded-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-6 h-6 text-white"
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
                  <Image
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
                  <Image
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
              {routes.map((route) => (
                <RoleGateForComponent allowedRole={route.role} key={route.name}>
                  <Link
                    href={route.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                      (
                        route.href === "/sell" || route.href === "/sellHistory"
                          ? pathname === route.href
                          : pathname.includes(route.href)
                      )
                        ? "bg-white/20 text-white shadow-lg"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className="text-xl flex-shrink-0">{route.icon}</span>
                    {!isCollapsed && (
                      <span className="font-medium">{route.name}</span>
                    )}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {route.name}
                      </div>
                    )}
                  </Link>
                </RoleGateForComponent>
              ))}
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
