export const dynamic = 'force-dynamic';

import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const result = await db.$runCommandRaw({
      aggregate: "Kurti",
      pipeline: [
        {
          $listSearchIndexes: {}
        }
      ],
      cursor: {}
    });

    const indexes = (result as any).cursor?.firstBatch || [];
    return new NextResponse(JSON.stringify({ success: true, indexes }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
