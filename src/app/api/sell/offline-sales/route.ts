export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOfflineSales } from "@/src/data/offline-sales";

export async function GET(request: NextRequest) {
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

    const result = await getOfflineSales({
      page,
      limit,
      shopId,
      search,
      searchType,
      userId: session.user.id,
      userRole: session.user.role
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