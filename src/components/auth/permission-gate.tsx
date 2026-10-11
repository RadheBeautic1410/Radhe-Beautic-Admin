"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/src/components/auth/permissions-provider";
import type { PermissionKey } from "@/src/lib/permissions/registry";

interface PermissionGateProps {
  /** Show the children when the user has this permission... */
  permission?: PermissionKey;
  /** ...or at least one of these. */
  anyOf?: readonly PermissionKey[];
  /** Rendered when not allowed (default: nothing). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Hides UI the user may not use. Visibility only: the matching server action or
 * route must enforce the same permission (see lib/permissions/server.ts).
 * Renders nothing while permissions are still loading, so it never flashes
 * controls that are about to be removed.
 */
export const PermissionGate = ({ permission, anyOf, fallback = null, children }: PermissionGateProps) => {
  const { ready, can, canAny } = usePermissions();
  if (!ready) return null;
  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : false;
  return <>{allowed ? children : fallback}</>;
};
