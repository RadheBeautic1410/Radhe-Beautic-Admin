export const dynamic = "force-dynamic";

import { getAllKurti, getAllKurtiByTime } from "@/src/data/kurti";
import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";

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

    let kurtis;
    let totalCount;

    if (search) {
      // Query all matches without database pagination to sort in memory globally by stock count
      const allKurtis = await db.kurti.findMany({ where });

      // Map available stock count (countOfPiece)
      const processed = allKurtis.map((kurti) => {
        let cnt = 0;
        const sizes = Array.isArray(kurti.sizes) ? kurti.sizes : [];
        for (let j = 0; j < sizes.length; j++) {
          const s = sizes[j] as any;
          if (s && s.quantity > 0) cnt += s.quantity;
        }
        const reserved = Array.isArray(kurti.reservedSizes) ? kurti.reservedSizes : [];
        for (let j = 0; j < reserved.length; j++) {
          const r = reserved[j] as any;
          if (r && r.quantity > 0) cnt -= r.quantity;
        }
        return {
          ...kurti,
          countOfPiece: Math.max(0, cnt),
        };
      });

      // Sort by stock count desc
      processed.sort((a, b) => b.countOfPiece - a.countOfPiece);

      totalCount = processed.length;
      kurtis = processed.slice(skip, skip + limit);
    } else {
      // Normal database paginated query
      const [fetchedKurtis, count] = await Promise.all([
        db.kurti.findMany({
          where,
          skip,
          take: limit,
        }),
        db.kurti.count({ where }),
      ]);
      
      kurtis = fetchedKurtis.map((kurti) => {
        let cnt = 0;
        const sizes = Array.isArray(kurti.sizes) ? kurti.sizes : [];
        for (let j = 0; j < sizes.length; j++) {
          const s = sizes[j] as any;
          if (s && s.quantity > 0) cnt += s.quantity;
        }
        const reserved = Array.isArray(kurti.reservedSizes) ? kurti.reservedSizes : [];
        for (let j = 0; j < reserved.length; j++) {
          const r = reserved[j] as any;
          if (r && r.quantity > 0) cnt -= r.quantity;
        }
        return {
          ...kurti,
          countOfPiece: Math.max(0, cnt),
        };
      });
      totalCount = count;
    }

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
