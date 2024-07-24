export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getOrdersOfUserbyStatus, sellOrder } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function POST(request: NextRequest) {
    try {
        let { code, cartId, currentUser, currentTime } = await request.json();
        console.log(code, cartId, currentUser, currentTime);
        const data: any = await sellOrder(code, cartId, currentUser, currentTime);
        // console.log('data', data?.length);

        if (data.success) {
            return new NextResponse(JSON.stringify({ success: true, message: `${code} sold successfully` }),
                {
                    status: 200,
                });
        } else {
            return new NextResponse(JSON.stringify({ successs: false, message: data.error }),
                {
                    status: 500,
                });
        }
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ message: error.message }), {
            status: 404
        });
    }
}





