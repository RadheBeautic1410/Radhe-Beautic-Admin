export const dynamic = 'force-dynamic'

import { getKurtiByCategory, getKurtiByCode, getKurtiCount } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";
import { PRODUCT_READ_PERMISSIONS } from "@/src/lib/permissions/registry";
import { apiPermission } from "@/src/lib/permissions/server";


export async function GET(request: NextRequest) {
    const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
    if (guard.response) return guard.response;
    try {
        let code = request.nextUrl.searchParams.get('code') ? request.nextUrl.searchParams.get('code') : "";
        // console.log('code:', code);
        if(code === "" || code === null){
            return new NextResponse(JSON.stringify({ data: [] }), {
                status: 200
            });
        }
        const data = await getKurtiByCode(code? code : "");
        // console.log('data:', data);/
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





