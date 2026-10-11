export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { accessCan } from "@/src/lib/permissions/server";
import { getOfflineSales } from "@/src/data/offline-sales";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET(request: NextRequest) {
  const guard = await apiPermission("offlineSales.view");
  if (guard.response) return guard.response;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const shopId = searchParams.get('shopId') || '';
    const search = searchParams.get('search') || '';
    const searchType = searchParams.get('searchType') || 'customerName';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const result = await getOfflineSales({
      page,
      limit,
      shopId,
      search,
      searchType,
      startDate,
      endDate,
      userId: session.user.id,
      // Shop scoping inside getOfflineSales keys on "ADMIN": hand it that only
      // when the user may see every shop's bills.
      userRole: accessCan(guard.access, "offlineSales.viewAllShops") ? "ADMIN" : guard.access.baseRole,
    });

    return new NextResponse(JSON.stringify({
      data: result
    }), { status: 200 });

  } catch (error: any) {
    console.error('Offline sales API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
} 