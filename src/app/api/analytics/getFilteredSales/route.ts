export const dynamic = 'force-dynamic'

import { getFilteredSales } from "@/src/data/analytics";
import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { date, filter } = await request.json();
    const baseData = await getFilteredSales(date, filter);

    const { salesList: soldCodes, ...summary } = baseData;

    const kurtiImages = await db.kurti.findMany({
      where: { code: { in: soldCodes.map((item) => item.code) } },
      select: { code: true, images: true },
    });
    const imageByCode = new Map(kurtiImages.map((k) => [k.code, k.images?.[0] || null]));

    const salesList = soldCodes.map((item) => ({
      code: item.code,
      count: item.count,
      image: imageByCode.get(item.code) || null,
    }));

    return NextResponse.json({
      data: summary,
      salesList,
    }, { status: 200 });

  } catch (error: any) {
    console.error("API Error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
