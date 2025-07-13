import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Missing date range" }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = await prisma.sell.groupBy({
      by: ['kurtiId'],
      where: {
        sellTime: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        kurtiId: true,
      },
      orderBy: {
        _count: {
          kurtiId: 'desc',
        },
      },
      take: 100,
    });

    const topKurtiIds = result.map(r => r.kurtiId).filter((id): id is string => id !== null);

    const kurtis = await prisma.kurti.findMany({
      where: {
        id: { in: topKurtiIds },
      },
    });

    const final = kurtis.map(k => {
      const count = result.find(r => r.kurtiId === k.id)?._count.kurtiId || 0;
      return { ...k, soldCount: count };
    });

    return NextResponse.json(final);
  } catch (err) {
    console.error("Top sold kurtis error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
