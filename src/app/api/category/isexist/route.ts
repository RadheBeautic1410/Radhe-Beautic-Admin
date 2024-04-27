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
            const data = await getCategorybyName(category? category : "");
            return new NextResponse(JSON.stringify({ data: data ? true: false }), { status: 200 });
        }
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}
