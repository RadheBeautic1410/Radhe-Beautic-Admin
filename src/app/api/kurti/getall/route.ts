export const dynamic = 'force-dynamic'

import { getAllKurti, getAllKurtiByTime } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";


export async function GET(request: NextRequest) {
    try {
        const data = await getAllKurti();
        console.log('data', data?.length);
        return new NextResponse(JSON.stringify({ data }),
            {
                status: 200,
            });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}

export async function POST(request: NextRequest) {
    try {
        let { currentTime } = await request.json();
        console.log(currentTime);
        const data = await getAllKurtiByTime(currentTime);
        console.log('data', data?.length);
        return new NextResponse(JSON.stringify({ data }),
            {
                status: 200,
            });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}






