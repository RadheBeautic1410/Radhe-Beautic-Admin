"use client";
import * as z from "zod";

import { UserButton } from "@/src/components/ui/user-button";
import { Button } from "@/src/components/ui/button";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { useForm } from "react-hook-form";

const routes = [
  {
    name: "Upload",
    href: "/upload",
    role: [UserRole.ADMIN, UserRole.UPLOADER],
  },
  {
    name: "Catalogue",
    href: "/catalogue",
    role: [UserRole.ADMIN, UserRole.UPLOADER, UserRole.SELLER, UserRole.RESELLER],
  },
  {
    name: "sell",
    href: "/sell",
    role: [UserRole.ADMIN, UserRole.SELLER],
  },
  {
    name: "Add Stock",
    href: "/addstock",
    role: [UserRole.ADMIN],
  },
  {
    name: "Request",
    href: "/request",
    role: [UserRole.ADMIN],
  },
  {
    name: "Selling History",
    href: "/sellinghistory",
    role: [UserRole.ADMIN],
  },
  {
    name: "Orders",
    href: "/orders",
    role: [UserRole.ADMIN],
  },
  {
    name: "Analytics",
    href: "/analytics",
    role: [UserRole.ADMIN],
  },
  {
    name: "Settings",
    href: "/settings",
    role: [UserRole.ADMIN, UserRole.RESELLER, UserRole.SELLER, UserRole.UPLOADER],
  },
];

const Navbar = () => {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const form = useForm({ defaultValues: { name: "" } });

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="bg-white border shadow-sm p-4 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <button
              className="md:hidden text-gray-700"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <Link href="/" className="flex items-center space-x-2">
              <Image src="/images/TextLogo.png" alt="Logo" width={80} height={80} />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="m-5 hidden md:flex gap-2 flex-wrap">
            {routes.map((route) => (
              <RoleGateForComponent allowedRole={route.role} key={route.name}>
                <Button
                  asChild
                  variant={pathname.includes(route.href) ? "default" : "outline"}
                >
                  <Link href={route.href}>{route.name}</Link>
                </Button>
              </RoleGateForComponent>
            ))}
          </div>

          {/* User Section */}
          <UserButton />
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar Drawer */}
      <div
        className={`fixed top-0 left-0 w-64 h-full bg-white z-50 shadow-md transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 gap-20">
            <Image src="/images/TextLogo.png" alt="Logo" width={40} height={40} />
            <span className="font-bold text-lg">Brand</span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)}>
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-2">
          {routes.map((route) => (
            <RoleGateForComponent allowedRole={route.role} key={route.name}>
              <Link
                href={route.href}
                className={`block px-4 py-2 rounded-md ${
                  pathname.includes(route.href)
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 text-gray-800"
                }`}
              >
                {route.name}
              </Link>
            </RoleGateForComponent>
          ))}
        </div>
      </div>
    </>
  );
};

export default Navbar;
