export const dynamic = 'force-dynamic'

import { getKurtiByCategory, getKurtiByCode, getKurtiCount } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";


export async function GET(request: NextRequest) {
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





