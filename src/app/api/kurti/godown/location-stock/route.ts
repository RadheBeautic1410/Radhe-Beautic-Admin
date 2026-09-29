export const dynamic = "force-dynamic";

import { getLocationStock } from "@/src/data/godown";
import { isStockLocation } from "@/src/lib/godown";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const location = params.get("location");
  if (!isStockLocation(location)) {
    return new NextResponse(JSON.stringify({ error: "Unknown location" }), { status: 400 });
  }
  const page = parseInt(params.get("page") || "1", 10) || 1;
  const pageSize = parseInt(params.get("pageSize") || "20", 10) || 20;
  const search = params.get("search") || undefined;

  const data = await getLocationStock({ location, page, pageSize, search });
  return new NextResponse(JSON.stringify({ data }), { status: 200 });
}
