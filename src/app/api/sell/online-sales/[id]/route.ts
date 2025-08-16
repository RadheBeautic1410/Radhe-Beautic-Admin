export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOnlineSaleById } from "@/src/data/online-sales";
import { updateOnlineSale } from "@/src/data/online-sales";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const sale = await getOnlineSaleById(params.id);

    return new NextResponse(JSON.stringify({
      data: sale
    }), { status: 200 });

  } catch (error: any) {
    console.error('Online sale API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const result = await updateOnlineSale(params.id, body);

    return new NextResponse(JSON.stringify({
      success: true,
      data: result
    }), { status: 200 });

  } catch (error: any) {
    console.error('Online sale update API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
