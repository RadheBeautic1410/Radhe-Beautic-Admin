export const dynamic = 'force-dynamic'

import { getAllCategory, getCategorybyName } from "@/src/data/category";
import { NextResponse, NextRequest  } from "next/server";

export async function GET(request: NextRequest) {
    try {
        let category = request.nextUrl.searchParams.get('category') ? request.nextUrl.searchParams.get('category') : "";
        if(category === ""){
            return new NextResponse(JSON.stringify({ data: false }), {
                status: 200
            });
        }
        else {
            const row = await getCategorybyName(category? category : "");
            const exists = Boolean(row);
            return new NextResponse(
                JSON.stringify({
                    data: exists,
                    exists,
                    isForChildren: row ? Boolean(row.isForChildren) : false,
                }),
                { status: 200 }
            );
        }
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}
