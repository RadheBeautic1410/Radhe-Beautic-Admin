import { getAllUsersWithRole, UserQuery } from "@/src/data/user";
import { checkPermission } from "@/src/lib/permissions/server";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
    const guard = await checkPermission(["allCustomers.view"]);
    const query: UserQuery = {
        role: [UserRole.CUSTOMER],
    };
    if (guard.ok) {
        const data = await getAllUsersWithRole(query);
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    }
    return new NextResponse(null, {
        status: guard.status
    });
}
