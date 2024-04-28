export const dynamic = 'force-dynamic'

import { getAllCategory, getAllCategoryWithCount } from "@/src/data/category";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
    try {
        const data = await getAllCategoryWithCount();
        return new NextResponse(JSON.stringify({ data: data?.counts }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





