export const dynamic = "force-dynamic";

import {
  MAX_RANGE_DAYS,
  daysInRange,
  getAlerts,
  getMoney,
  getOnline,
  getOverview,
  getProducts,
  getStock,
} from "@/src/data/business-analytics";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const fail = (error: string, status: number) =>
  new NextResponse(JSON.stringify({ error }), { status });

// GET ?tab=overview|products|stock|money|online|alerts&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (user?.role !== UserRole.ADMIN && user?.role !== UserRole.SELLER_MANAGER) {
    return fail("Access denied", 403);
  }
  const isAdmin = user.role === UserRole.ADMIN;

  const params = request.nextUrl.searchParams;
  const tab = params.get("tab") || "overview";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  if (!DAY.test(from) || !DAY.test(to) || from > to) {
    return fail("Give a valid from/to date range", 400);
  }
  if (daysInRange(from, to) > MAX_RANGE_DAYS) {
    return fail(`Pick a range of at most ${MAX_RANGE_DAYS} days`, 400);
  }

  try {
    switch (tab) {
      case "overview":
        return NextResponse.json({ data: await getOverview(from, to, isAdmin) });
      case "products":
        return NextResponse.json({ data: await getProducts(from, to, isAdmin) });
      case "stock":
        return NextResponse.json({ data: await getStock(from, to, isAdmin) });
      case "alerts":
        return NextResponse.json({ data: await getAlerts(from, to, isAdmin) });
      case "online":
        return NextResponse.json({ data: await getOnline(from, to) });
      case "money":
        // Expenses and net profit are for the owner only.
        if (!isAdmin) return fail("Access denied", 403);
        return NextResponse.json({ data: await getMoney(from, to) });
      default:
        return fail("Unknown tab", 400);
    }
  } catch (error) {
    console.error("business analytics:", error);
    return fail("Failed to build the report", 500);
  }
}
