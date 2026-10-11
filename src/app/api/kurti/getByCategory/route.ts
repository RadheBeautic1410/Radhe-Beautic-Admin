export const dynamic = 'force-dynamic'

import { getKurtiByCategory, getKurtiCount } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";
import { PRODUCT_READ_PERMISSIONS } from "@/src/lib/permissions/registry";
import { apiPermission } from "@/src/lib/permissions/server";


export async function GET(request: NextRequest) {
    const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
    if (guard.response) return guard.response;
    try {
        let category = request.nextUrl.searchParams.get('category') ? request.nextUrl.searchParams.get('category') : "";
        // console.log('category:', category);
        if(category === "" || category === null){
            return new NextResponse(JSON.stringify({ data: [] }), {
                status: 200
            });
        }
        const data = await getKurtiByCategory(category? category : "");
        // console.log('data:', data);/
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





