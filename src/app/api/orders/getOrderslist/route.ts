export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getOrdersOfUserbyStatus } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function POST(request: NextRequest) {
    try {
        let { pageNum, status, pageSize, dateRange } = await request.json();
        dateRange.to = addDays(dateRange.to, 1);
        console.log(pageNum, status, dateRange);
        const data = await getOrdersOfUserbyStatus(status, pageNum, pageSize, dateRange);
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





