export const dynamic = "force-dynamic";

import { getPendingFloorMoves } from "@/src/data/godown";
import { NextRequest, NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";
import { COUNTED_LOCATIONS, PendingSource, STOCK_LOCATIONS } from "@/src/lib/godown";

export async function GET(request: NextRequest) {
  const guard = await apiPermission(["godown.view","stockLocation.view","moveToFloor.view"]);
  if (guard.response) return guard.response;
  try {
    const params = request.nextUrl.searchParams;
    const page = parseInt(params.get("page") || "1", 10) || 1;
    const pageSize = parseInt(params.get("pageSize") || "20", 10) || 20;
    const category = params.get("category") || undefined;
    const search = params.get("search") || undefined;
    const rawLocation = params.get("location");
    const location = COUNTED_LOCATIONS.find((loc) => loc === rawLocation);
    const rawSource = params.get("source");
    const source: PendingSource =
      rawSource === "ANY" ? "ANY" : STOCK_LOCATIONS.find((loc) => loc === rawSource) || "GODOWN";

    const data = await getPendingFloorMoves({ page, pageSize, category, search, location, source });
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
