export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getCountFromStatus, getOrdersOfUserbyStatus } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function POST(request: NextRequest) {
    try {
        let { status } = await request.json();
        const data = await getCountFromStatus(status);
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





