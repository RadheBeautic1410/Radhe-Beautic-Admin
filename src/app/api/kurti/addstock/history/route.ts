export const dynamic = 'force-dynamic'

import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";

function getDefaultLast7DaysIST() {
  const now = new Date();
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  // End = today IST at 23:59:59.999
  const yyyy = istNow.getUTCFullYear();
  const mm = String(istNow.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(istNow.getUTCDate()).padStart(2, "0");
  const endStr = `${yyyy}-${mm}-${dd}`;

  // Start = 6 days before at 00:00:00.000 (inclusive)
  const startDateIST = new Date(istNow);
  startDateIST.setUTCDate(startDateIST.getUTCDate() - 6);
  const sy = startDateIST.getUTCFullYear();
  const sm = String(startDateIST.getUTCMonth() + 1).padStart(2, "0");
  const sd = String(startDateIST.getUTCDate()).padStart(2, "0");
  const startStr = `${sy}-${sm}-${sd}`;

  // Convert IST date boundaries to UTC by constructing Z times
  const startUTC = new Date(`${startStr}T00:00:00.000Z`);
  const endUTC = new Date(`${endStr}T23:59:59.999Z`);

  return { startUTC, endUTC };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const from = searchParams.get("from"); // YYYY-MM-DD (IST date)
    const to = searchParams.get("to"); // YYYY-MM-DD (IST date)

    let startDate: Date;
    let endDate: Date;

    if (from && to) {
      startDate = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
      endDate = new Date(`${to.slice(0, 10)}T23:59:59.999Z`);
    } else {
      const { startUTC, endUTC } = getDefaultLast7DaysIST();
      startDate = startUTC;
      endDate = endUTC;
    }

    const where = {
      createdAt: {
        gte: startDate,
        lt: endDate,
      },
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

