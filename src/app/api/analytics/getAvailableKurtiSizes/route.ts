export const dynamic = 'force-dynamic'

import { getAvailableKurtiSizes } from "@/src/data/analytics";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const data = await getAvailableKurtiSizes();
        // console.log('data', data?.length);
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