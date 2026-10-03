export const dynamic = 'force-dynamic'

import { addStock } from "@/src/data/kurti";
import { isStockLocation } from "@/src/lib/godown";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
    try {
        let data = await request.json();
        console.log(data);
        // No location = a new parcel, which lands in the godown.
        const location = data.location === undefined ? "GODOWN" : data.location;
        if (!isStockLocation(location)) {
            return new NextResponse(JSON.stringify({ data: { error: "Unknown stock location" } }), { status: 200 });
        }
        const data2 = await addStock(data.code, location);
        return new NextResponse(JSON.stringify({ data: data2 }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}
