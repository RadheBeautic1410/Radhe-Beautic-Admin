export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { clearLocationEverywhere } from "@/src/data/godown";
import { currentUser } from "@/src/lib/auth";
import { LOCATION_LABELS, isStockLocation } from "@/src/lib/godown";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// POST { location, password } - admin only; the same password as Clear Stock.
export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (user?.role !== UserRole.ADMIN) {
    return new NextResponse(JSON.stringify({ error: "Only an admin can clear a location" }), {
      status: 403,
    });
  }

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
