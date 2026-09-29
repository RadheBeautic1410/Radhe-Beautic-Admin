export const dynamic = "force-dynamic";

import { getRecentStockMovements, moveStockLocation } from "@/src/data/godown";
import { currentUser } from "@/src/lib/auth";
import { LOCATION_LABELS, isStockLocation, locationForShopId } from "@/src/lib/godown";
import { getUserShop } from "@/src/actions/shop";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code: string = body?.code || "";

    const { from, to } = body || {};
    if (!isStockLocation(from) || !isStockLocation(to)) {
      return new NextResponse(
        JSON.stringify({ data: { error: "Choose both a From and a To location." } }),
        { status: 200 }
      );
    }

    const user = await currentUser();
    if (!user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Shop logins (1st floor, 2nd floor, Shop 316) may only move stock into or
    // out of their own location.
    if (user.role === UserRole.SHOP_SELLER) {
      const shop = user.id ? await getUserShop(user.id) : null;
      const own = locationForShopId(shop?.id);
      if (!own) {
        return new NextResponse(
          JSON.stringify({ data: { error: "Your login is not linked to a shop location." } }),
          { status: 200 }
        );
      }
      if (from !== own && to !== own) {
        return new NextResponse(
          JSON.stringify({
            data: { error: `You can only move stock into or out of ${LOCATION_LABELS[own]}.` },
          }),
          { status: 200 }
        );
      }
    }

    const data = await moveStockLocation(code, from, to, user?.name || undefined);
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50", 10) || 50;
  const data = await getRecentStockMovements(Math.min(limit, 200));
  return new NextResponse(JSON.stringify({ data }), { status: 200 });
}
