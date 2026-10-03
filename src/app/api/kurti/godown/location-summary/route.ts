export const dynamic = "force-dynamic";

import { getLocationSummary } from "@/src/data/godown";
import { currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

// Pieces per location for everyone who can open /stock-location; the stock
// value (amount) only for admins.
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const data = await getLocationSummary();
    if (user.role !== UserRole.ADMIN) {
      const { amount, ...rest } = data;
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
