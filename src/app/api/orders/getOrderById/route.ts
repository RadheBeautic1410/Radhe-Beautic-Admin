export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getOrderByOrderId } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function POST(request: NextRequest) {
    try {
        let { orderId, status } = await request.json();
        const data = await getOrderByOrderId(orderId, status);
        // console.log('data', data?.length);
        if(!data) {
            return new NextResponse(JSON.stringify({success: false, data, message: 'Order not found' }),
            {
                status: 500,
            });
        }
        return new NextResponse(JSON.stringify({ success: true, data }),
            {
                status: 200,
            });
    } catch (error: any) {
        console.log("🚀 ~ POST ~ error:", error)
        return new NextResponse(JSON.stringify({ success: false, message: error.message }), {
            status: 404
        });
    }
}





