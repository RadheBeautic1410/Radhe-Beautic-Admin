export const dynamic = "force-dynamic";

import { moveStockLocation, GodownDirection } from "@/src/data/godown";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code: string = body?.code || "";
    const direction: GodownDirection =
      body?.direction === "TO_FLOOR" ? "TO_FLOOR" : "TO_GODOWN";

    const data = await moveStockLocation(code, direction);
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
