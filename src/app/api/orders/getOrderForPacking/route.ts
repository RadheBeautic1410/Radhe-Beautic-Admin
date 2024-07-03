export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getOrderForPacking } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function POST(request: NextRequest) {
    try {
        let { orderId } = await request.json();
        const data = await getOrderForPacking(orderId);
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





