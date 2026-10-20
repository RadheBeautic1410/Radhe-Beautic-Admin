export const dynamic = 'force-dynamic'

import { sellKurti2 } from "@/src/data/kurti";
import { getUserShop } from "@/src/actions/shop";
import { LOCATION_LABELS, locationForShopId } from "@/src/lib/godown";
import { NextRequest, NextResponse } from "next/server";
import { accessCan, apiPermission } from "@/src/lib/permissions/server";


// export async function GET(request: NextRequest) {
//     try {
//         const code = request.nextUrl.searchParams.get("code") || "";
//         // console.log(code, code.substring(0, 7), code.substring(7));
//         const data = await sellKurti(code.toUpperCase());
//         return new NextResponse(JSON.stringify({ data }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }

export async function POST(request: NextRequest) {
    const guard = await apiPermission(["sell.create","sellRetailer.create","hallSales.create"]);
    if (guard.response) return guard.response;
    try {
        // const code = request.nextUrl.searchParams.get("code") || "";
        let data = await request.json();
        console.log("its sell data",data);

        // Shop logins (ground floor, 1st floor, Shop 316) can only sell their own location's stock,
        // except hall sales, where the piece can be picked up from any location.
        if (!accessCan(guard.access, "stockLocation.anyLocation") && data?.isHallSale !== true) {
            const shop = await getUserShop(guard.access.userId);
            const own = locationForShopId(shop?.id);
            if (!own) {
                return new NextResponse(JSON.stringify({ data: { error: "Your login is not linked to a shop location." } }), { status: 200 });
            }
            if (data?.stockLocation !== own) {
                return new NextResponse(JSON.stringify({ data: { error: `Your login can only sell from ${LOCATION_LABELS[own]}.` } }), { status: 200 });
            }
        }

        // console.log(code, code.substring(0, 7), code.substring(7));
        data = await sellKurti2(data);
        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 404
        });
    }
}
