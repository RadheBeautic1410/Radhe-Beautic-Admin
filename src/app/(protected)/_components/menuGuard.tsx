"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { canOpenPath } from "@/src/lib/menus";
import NotAllowedPage from "./errorPages/NotAllowedPage";

/**
 * Blocks a page whose menu the signed-in user's role does not include, so a
 * hidden sidebar entry cannot be opened by typing its URL.
 */
export const MenuGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { data, status } = useSession();

  if (status === "loading") return null;
  if (data?.user && !canOpenPath(pathname, data.user)) {
    return (
      <div className="flex justify-center p-6">
        <NotAllowedPage />
      </div>
    );
  }
  return <>{children}</>;
};
