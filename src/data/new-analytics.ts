import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(request: NextRequest) {
    const { datetime, filter } = await request.json();

    if (!datetime || filter !== "DATETIME") {
        return new NextResponse(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
    }

    const dateObj = new Date(datetime);
    const start = new Date(dateObj);
    const end = new Date(dateObj);
    end.setHours(end.getHours() + 1); // 1 hour window, or adjust as needed

    const salesData = await db.sell.findMany({
        where: {
            sellTime: {
                gte: start,
                lt: end,
            },
            
        },
          include: {
    prices: true,
  },
    });

    const totalSales = salesData.reduce((sum, sale) => sum + (sale.selledPrice ?? 0), 0)
    const totalProfit = salesData.reduce((sum, sale) => sum + (sale.selledPrice || 0) - (sale.prices?.actualPrice1 || 0), 0);
    const count = salesData.length;

    return new NextResponse(JSON.stringify({
        data: { totalSales, totalProfit, count }
    }), { status: 200 });
}
