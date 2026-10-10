// /app/api/getpartywisecount/route.ts
export const dynamic = "force-dynamic";

import { getPartyWiseCount } from "@/src/data/analytics";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // e.g. "2025-06"

  if (!monthParam || !/^d{4}-d{2}$/.test(monthParam)) {
    return new NextResponse("Give a month like 2025-06", { status: 400 });
  }

  try {
    return NextResponse.json(await getPartyWiseCount(monthParam));
  } catch (error) {
    console.error("Error fetching party-wise count:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
