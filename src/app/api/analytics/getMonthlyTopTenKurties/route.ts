export const dynamic = 'force-dynamic'

import { getMonthlyTopTenKurties } from "@/src/data/analytics";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        let { date } = await request.json();
        const data = await getMonthlyTopTenKurties(date);
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