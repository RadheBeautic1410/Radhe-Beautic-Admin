export const dynamic = "force-dynamic";

import { getPendingFloorMoves } from "@/src/data/godown";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = parseInt(params.get("page") || "1", 10) || 1;
    const pageSize = parseInt(params.get("pageSize") || "20", 10) || 20;
    const category = params.get("category") || undefined;
    const search = params.get("search") || undefined;

    const data = await getPendingFloorMoves({ page, pageSize, category, search });
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
