export const dynamic = 'force-dynamic'

import { getAllCategory } from "@/src/data/category";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
    try {
        const data = await getAllCategory();
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





