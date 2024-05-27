export const dynamic = 'force-dynamic'

import { getAllKurti } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";


export async function GET(request: NextRequest) {
    try {
        const data = await getAllKurti();
        // console.log('data:', data);/
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





