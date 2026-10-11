"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { canOpenPath, firstAllowedPath } from "@/src/lib/menus";
import NotAllowedPage from "./errorPages/NotAllowedPage";

/**
 * Blocks a page whose menu the signed-in user's role does not include, so a
 * hidden sidebar entry cannot be opened by typing its URL.
 *
 * The post-login landing page is the exception: if a role cannot open it, send
 * them to the first page they can open instead of showing an error.
 */
export const MenuGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { data, status } = useSession();

  const denied = !!data?.user && !canOpenPath(pathname, data.user);
  const landing = denied && pathname === DEFAULT_LOGIN_REDIRECT ? firstAllowedPath(data.user) : null;

  useEffect(() => {
    if (landing && landing !== pathname) router.replace(landing);
  }, [landing, pathname, router]);

  if (status === "loading") return null;
  if (landing) return null;
  if (denied) {
    return (
      <div className="flex justify-center p-6">
        <NotAllowedPage />
      </div>
    );
  }
  return <>{children}</>;
};
