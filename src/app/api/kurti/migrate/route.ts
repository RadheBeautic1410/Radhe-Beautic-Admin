export const dynamic = 'force-dynamic'

import { migrate, migrate2 } from "@/src/data/kurti";
import { migrate3 } from "@/src/data/migrate";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
    try {
        // const code = request.nextUrl.searchParams.get("code") || "";
        // console.log(code, code.substring(0, 7), code.substring(7));
        const data = await migrate3();
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





