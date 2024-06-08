export const dynamic = 'force-dynamic'

import { getAllKurti } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";


export async function GET(request: NextRequest) {
    try {
        const data = await getAllKurti();
        console.log('data:');
        return new NextResponse(JSON.stringify({ data }),
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=1',
                    'CDN-Cache-Control': 'public, s-maxage=60',
                    'Vercel-CDN-Cache-Control': 'public, s-maxage=3600',
                }
            });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}





