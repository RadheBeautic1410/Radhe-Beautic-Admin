// /app/api/getpartywisecount/route.ts
import { db } from "@/src/lib/db"; // adjust if your db import path is different
import { startOfMonth, endOfMonth } from "date-fns";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // e.g. "2025-06"

  let dateFilter: any = {};

  if (monthParam) {
    const [year, month] = monthParam.split("-");
    const start = startOfMonth(new Date(Number(year), Number(month) - 1));
    const end = endOfMonth(new Date(Number(year), Number(month) - 1));
    dateFilter = {
      sellTime: {
        gte: start,
        lte: end
      }
    };
  }

  try {
    const sells = await db.sell.findMany({
      where: dateFilter,
      select: {
        kurti2: {
          select: {
            party: true
          }
        }
      }
    });

    // Group by party
    const result: Record<string, number> = {};

    for (const sell of sells) {
      const party = sell.kurti2?.party || "Unknown";
      result[party] = (result[party] || 0) + 1;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching party-wise count:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
