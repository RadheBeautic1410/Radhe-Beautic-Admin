export const dynamic = 'force-dynamic'

import { getKurtiCount } from "@/src/data/kurti";
import { getAddresses } from "@/src/data/orders";
import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
// import { date } from "zod";


export async function GET(request: NextRequest) {
    try {
        const data: any = await getAddresses();
        // console.log('data', data?.length);
        
        return new NextResponse(JSON.stringify({ success: true, data: data || [] }),
            {
                status: 200,
            });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ success: false, message: error.message }), {
            status: 404
        });
    }
}





