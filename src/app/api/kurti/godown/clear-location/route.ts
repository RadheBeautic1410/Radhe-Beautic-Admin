export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { clearLocationEverywhere } from "@/src/data/godown";
import { currentUser } from "@/src/lib/auth";
import { LOCATION_LABELS, isStockLocation } from "@/src/lib/godown";
import { checkPermission } from "@/src/lib/permissions/server";
import { NextRequest, NextResponse } from "next/server";

// POST { location, password } - needs stockLocation.clearLocation; the same password as Clear Stock.
export async function POST(request: NextRequest) {
  const guard = await checkPermission("stockLocation.clearLocation");
  if (!guard.ok) {
    return new NextResponse(
      JSON.stringify({ error: "You do not have permission to clear a location" }),
      { status: guard.status }
    );
  }
  const user = await currentUser();

  const { location, password } = (await request.json()) || {};
  if (!isStockLocation(location)) {
    return new NextResponse(JSON.stringify({ error: "Choose a location to clear" }), { status: 400 });
  }
  if (!password || password !== process.env.NEXT_PUBLIC_CLEAR_STOCK_PASSWORD) {
    return new NextResponse(JSON.stringify({ error: "Invalid password" }), { status: 400 });
  }

  try {
    const data = await clearLocationEverywhere(location, user?.name || undefined);
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    console.error("clear-location:", error);
    return new NextResponse(
      JSON.stringify({ error: `Failed to clear ${LOCATION_LABELS[location]}: ${error.message}` }),
      { status: 500 }
    );
  }
}
