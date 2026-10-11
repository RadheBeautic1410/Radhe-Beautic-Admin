import { NextResponse } from "next/server";
import { getAccess } from "@/src/lib/permissions/server";

// Always computed from the database for the current request; never cached.
export const dynamic = "force-dynamic";

/**
 * The signed-in user's CURRENT effective permissions. The admin UI polls this
 * (see PermissionsProvider) so sidebar items and action buttons follow role
 * edits without a re-login. It only drives what the UI shows: every protected
 * server action / route re-checks permissions itself.
 */
export async function GET() {
  const access = await getAccess();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      userId: access.userId,
      role: access.role,
      baseRole: access.baseRole,
      roleName: access.roleName,
      isAdmin: access.isAdmin,
      permissions: Array.from(access.permissions),
      version: access.version,
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
