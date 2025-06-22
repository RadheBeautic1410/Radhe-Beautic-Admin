import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { datetime, filter } = await request.json();

    if (!datetime || filter !== "DATETIME") {
      return new NextResponse(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
      });
    }

    const start = new Date(datetime);
    const end = new Date(start);
    end.setHours(end.getHours() + 1); // 1-hour window

    const salesData = await db.sales.findMany({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const totalSales = salesData.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalProfit = salesData.reduce((sum, s) => sum + (s.profit || 0), 0);
    const count = salesData.length;

    return new NextResponse(
      JSON.stringify({
        data: {
          totalSales,
          totalProfit,
          count,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error:", error);
    return new NextResponse(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
