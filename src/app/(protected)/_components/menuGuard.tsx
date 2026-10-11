"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { usePermissions } from "@/src/components/auth/permissions-provider";
import { findModuleForPath, permissionKey } from "@/src/lib/permissions/registry";
import { firstAllowedPath } from "@/src/lib/permissions/resolve";
import NotAllowedPage from "./errorPages/NotAllowedPage";

/**
 * Blocks a page whose `<module>.view` permission the signed-in user does not
 * hold, so a hidden sidebar entry cannot be opened by typing its URL. It follows
 * live permission changes: if access is revoked while the page is open, the page
 * is replaced by the "not allowed" screen without a reload or re-login.
 *
 * The post-login landing page is the exception: if a role cannot open it, send
 * them to the first page they can open instead of showing an error.
 */
export const MenuGuard = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const { ready, can, permissions } = usePermissions();

  const module = findModuleForPath(pathname);
  const denied = ready && !!module && !can(permissionKey(module.key, "view"));
  const landing =
    denied && pathname === DEFAULT_LOGIN_REDIRECT
      ? firstAllowedPath(permissions)
      : null;

  useEffect(() => {
    if (landing && landing !== pathname) router.replace(landing);
  }, [landing, pathname, router]);

  // Never judge access before permissions have loaded: right after sign-in the
  // session can lag behind, and "not loaded yet" must not look like "no access".
  if (status === "loading" || !ready) return null;
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
