export const dynamic = 'force-dynamic'

import { addStock } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    try {
        // const code = request.nextUrl.searchParams.get("code") || "";
        let data = await request.json();
        console.log(data);
        // console.log(data);
        // console.log(code, code.substring(0, 7), code.substring(7));
        const data2 = await addStock(data.code);
        return new NextResponse(JSON.stringify({ data: data2 }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





