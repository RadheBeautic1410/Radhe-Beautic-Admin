export const dynamic = 'force-dynamic'

import { getCode, getKurtiCount } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    try {
        const cat = (request.nextUrl.searchParams.get("cat") || "");
        console.log(cat);
        const data = await getKurtiCount(cat.toUpperCase());
        const data2 = await getCode(cat);
        let code = data2.concat(String((data||0)+1).padStart(4, '0'));
        return new NextResponse(JSON.stringify({ code: code }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





