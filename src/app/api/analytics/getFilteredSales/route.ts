export const dynamic = 'force-dynamic'

import { getFilteredSales } from "@/src/data/analytics";
import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { date, filter } = await request.json();
    const baseData = await getFilteredSales(date, filter);

    // ✅ Use returned start/end dates from baseData
    const { startDate, endDate } = baseData;

    if (!startDate || !endDate || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new Error("Invalid start or end date");
    }

    const salesGroup = await db.sell.groupBy({
      by: ["code"],
      _count: {
        code: true,
      },
      where: {
        sellTime: {
          gte: new Date(`${startDate}T00:00:00.000Z`),
          lt: new Date(`${endDate}T23:59:59.999Z`),
        },
        code: {
          not: {
            startsWith: "TES",
          },
        },
      },
      orderBy: {
        _count: {
          code: "desc",
        },
      },
    });

    const codes = salesGroup.map((item) => item.code);
    const kurtiImages = await db.kurti.findMany({
      where: {
        code: { in: codes },
      },
      select: {
        code: true,
        images: true,
      },
    });

    const salesList = salesGroup.map((item) => {
      const kurti = kurtiImages.find(k => k.code === item.code);
      return {
        code: item.code,
        count: item._count.code,
        image: kurti?.images?.[0] || null,
      };
    });

    return NextResponse.json({
      data: baseData,
      salesList,
    }, { status: 200 });

  } catch (error: any) {
    console.error("API Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
