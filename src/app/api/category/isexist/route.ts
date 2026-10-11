export const dynamic = 'force-dynamic'

import { getAllCategory, getCategorybyName } from "@/src/data/category";
import { NextResponse, NextRequest  } from "next/server";
import { PRODUCT_READ_PERMISSIONS } from "@/src/lib/permissions/registry";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET(request: NextRequest) {
    const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
    if (guard.response) return guard.response;
    try {
        let category = request.nextUrl.searchParams.get('category') ? request.nextUrl.searchParams.get('category') : "";
        if(category === ""){
            return new NextResponse(JSON.stringify({ data: false }), {
                status: 200
            });
        }
        else {
            const data = await getCategorybyName(category? category : "");
            return new NextResponse(JSON.stringify({ data: data ? true: false }), { status: 200 });
        }
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}
