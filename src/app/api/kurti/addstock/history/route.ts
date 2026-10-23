export const dynamic = 'force-dynamic'

import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";
import { istDay, istDayRange, istToday } from "@/src/lib/ist";

export async function GET(request: NextRequest) {
  const guard = await apiPermission(["addStock.view","catalogue.view"]);
  if (guard.response) return guard.response;
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const from = searchParams.get("from"); // YYYY-MM-DD (IST date)
    const to = searchParams.get("to"); // YYYY-MM-DD (IST date)

    // Default: the last 7 IST days, today included
    const today = istToday();
    const where = {
      createdAt:
        from && to
          ? istDayRange(from.slice(0, 10), to.slice(0, 10))
          : istDayRange(istDay(Date.now() - 6 * 24 * 60 * 60 * 1000), today),
    } as any;

    const skip = (page - 1) * pageSize;

    const [total, items] = await Promise.all([
      db.stockAddition.count({ where }),
      db.stockAddition.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          code: true,
          size: true,
          quantity: true,
          location: true,
          createdAt: true,
        },
      }),
    ]);

    return new NextResponse(
      JSON.stringify({
        data: {
          items,
          total,
          page,
          pageSize,
        },
      }),
      { status: 200 }
    );
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}

