import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const startDate = searchParams.get("startDate");
//     const endDate = searchParams.get("endDate");

//     if (!startDate || !endDate) {
//       return NextResponse.json({ error: "Missing date range" }, { status: 400 });
//     }

//     const start = new Date(startDate);
//     const end = new Date(endDate);

//     const result = await prisma.sell.groupBy({
//       by: ['kurtiId'],
//       where: {
//         sellTime: {
//           gte: start,
//           lte: end,
//         },
//       },
//       _count: {
//         kurtiId: true,
//       },
//       orderBy: {
//         _count: {
//           kurtiId: 'desc',
//         },
//       },
//       take: 100
//     });

//     const topKurtiIds = result.map(r => r.kurtiId).filter((id): id is string => id !== null);

//     const kurtis = await prisma.kurti.findMany({
//       where: {
//         id: { in: topKurtiIds },
//       },
//     });

//     const final = kurtis.map(k => {
//       const count = result.find(r => r.kurtiId === k.id)?._count.kurtiId || 0;
//       return { ...k, soldCount: count };
//     });

//     return NextResponse.json(final);
//   } catch (err) {
//     console.error("Top sold kurtis error:", err);
//     return NextResponse.json({ error: "Server error" }, { status: 500 });
//   }
// }



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    if ((startDate && isNaN(Date.parse(startDate))) || (endDate && isNaN(Date.parse(endDate)))) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.kurti = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    }

    const topSoldKurtis = await prisma.topSoldKurti.findMany({
      take: 10,
      orderBy: {
        soldCount: 'desc',
      },
      where: whereClause,
      include: {
        kurti: true,
      },
    });

    return NextResponse.json({ success: true, data: topSoldKurtis });
  } catch (error) {
    console.error("Error fetching top sold kurtis:", error);
    return NextResponse.json({ error: "Failed to fetch top sold kurtis" }, { status: 500 });
  }
}