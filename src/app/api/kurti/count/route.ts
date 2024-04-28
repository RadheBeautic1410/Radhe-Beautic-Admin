export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    try {
        const cat = request.nextUrl.searchParams.get("cat") || "";
        const data = await getKurtiCount(cat);
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





