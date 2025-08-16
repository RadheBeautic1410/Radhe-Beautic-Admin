export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOnlineSales } from "@/src/data/online-sales";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const searchType = searchParams.get('searchType') || 'customerName';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';

    const result = await getOnlineSales({
      page,
      limit,
      search,
      searchType,
      startDate,
      endDate,
      paymentStatus,
      userId: session.user.id,
      userRole: session.user.role
    });

    return new NextResponse(JSON.stringify({
      data: result
    }), { status: 200 });

  } catch (error: any) {
    console.error('Online sales API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
