export const dynamic = "force-dynamic";

import { getLocationSummary } from "@/src/data/godown";
import { accessCan, checkPermission } from "@/src/lib/permissions/server";
import { NextResponse } from "next/server";

// Pieces per location for everyone who can open /stock-location; the stock
// value (amount) only with stockLocation.viewStockValue.
export async function GET() {
  try {
    const guard = await checkPermission(["stockLocation.view", "godown.view", "moveToFloor.view"]);
    if (!guard.ok) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: guard.status });
    }
    const data = await getLocationSummary();
    if (!accessCan(guard.access, "stockLocation.viewStockValue")) {
      const { amount, ...rest } = data; // sizes carry pieces only, no value
      return new NextResponse(
        JSON.stringify({
          data: { ...rest, locations: data.locations.map(({ amount, ...l }) => l) },
        }),
        { status: 200 }
      );
    }
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    console.error("location-summary:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to load stock summary" }), {
      status: 500,
    });
  }
}
