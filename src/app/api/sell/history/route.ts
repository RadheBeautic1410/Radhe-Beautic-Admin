export const dynamic = 'force-dynamic'

import { getSellHistory, getSellingHistoryFiltered } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateISO = searchParams.get("date") || undefined; // YYYY-MM-DD
    const shopId = searchParams.get("shopId") || undefined; // 'DIRECT' or actual Shop id

    if (!dateISO && !shopId) {
      // Backward compatibility: original endpoint returning today's direct sell history
      const data = await getSellHistory();
      return new NextResponse(JSON.stringify({ data }), { status: 200 });
    }

    const data = await getSellingHistoryFiltered({ dateISO, shopId });
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}

// export async function POST(request: NextRequest) {
//     try {
//         // const code = request.nextUrl.searchParams.get("code") || "";
//         let data = await request.json();
//         console.log(data);
//         // console.log(code, code.substring(0, 7), code.substring(7));
//         data = await sellKurti2(data);
//         return new NextResponse(JSON.stringify({ data }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }





