export const dynamic = "force-dynamic";

import {
  SALE_CHANNELS,
  SOLD_BY,
  SaleChannel,
  SoldBy,
  getSalesByLocation,
  getSalesByLocationItems,
} from "@/src/data/sales-by-location";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET ?from=YYYY-MM-DD&to=YYYY-MM-DD            -> summary per location
// GET ...&soldBy=ONLINE[&channel=SCAN]          -> the sales behind one cell
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (user?.role !== UserRole.ADMIN) {
    return new NextResponse(JSON.stringify({ error: "Access denied" }), { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  if (!DAY.test(from) || !DAY.test(to) || from > to) {
    return new NextResponse(JSON.stringify({ error: "Give a valid from/to date range" }), {
      status: 400,
    });
  }

  try {
    const soldBy = params.get("soldBy");
    if (soldBy) {
      if (!SOLD_BY.includes(soldBy as SoldBy)) {
        return new NextResponse(JSON.stringify({ error: "Unknown seller" }), { status: 400 });
      }
      const channel = params.get("channel") || undefined;
      if (channel && !SALE_CHANNELS.includes(channel as SaleChannel)) {
        return new NextResponse(JSON.stringify({ error: "Unknown sale type" }), { status: 400 });
      }
      const items = await getSalesByLocationItems({
        from,
        to,
        soldBy: soldBy as SoldBy,
        channel: channel as SaleChannel | undefined,
      });
      return new NextResponse(JSON.stringify({ data: items }), { status: 200 });
    }

    const data = await getSalesByLocation({ from, to });
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    console.error("sales-by-location:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to build the report" }), {
      status: 500,
    });
  }
}
