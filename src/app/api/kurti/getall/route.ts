export const dynamic = "force-dynamic";

import { getAllKurti, getAllKurtiByTime } from "@/src/data/kurti";
import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";

// export async function GET(request: NextRequest) {
//     try {
//         const data = await getAllKurti();
//         console.log('data', data?.length);
//         return new NextResponse(JSON.stringify({ data }),
//             {
//                 status: 200,
//             });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const skip = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() ?? "";

    let where: any = { isDeleted: false };
    if (search) {
      where.code = { contains: search, mode: "insensitive" };
    }

    const [kurtis, totalCount] = await Promise.all([
      db.kurti.findMany({
        where,
        skip,
        take: limit,
      }),
      db.kurti.count({ where }),
    ]);

    return NextResponse.json({
      data: kurtis,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    let { currentTime } = await request.json();
    console.log(currentTime);
    const data = await getAllKurtiByTime(currentTime);
    console.log("data", data?.length);
    return new NextResponse(JSON.stringify({ data }), {
      status: 200,
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
