import { getAllUsersWithRole, UserQuery } from "@/src/data/user";
import { checkPermission } from "@/src/lib/permissions/server";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
    const guard = await checkPermission(["staff.view"]);
    const query: UserQuery = {
        role: [UserRole.SELLER, UserRole.UPLOADER, UserRole.ADMIN, UserRole.RESELLER, UserRole.USER, UserRole.SHOP_SELLER, UserRole.SELLER_MANAGER],
    };
    if (guard.ok) {
        // The staff table's password column is gated by staff.resetPassword, so the
        // stored password is only sent to callers who hold that permission.
        const includePassword = (await checkPermission(["staff.resetPassword"])).ok;
        const data = await getAllUsersWithRole(query, { includePassword });
        return new NextResponse(JSON.stringify({ data }), { status: 200 })
    }
    return new NextResponse(null, {
        status: guard.status
    });
}
