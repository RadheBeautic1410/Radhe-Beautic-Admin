export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return new NextResponse(JSON.stringify({ error: "Only admins can view shipping history" }), { status: 403 });
    }

    // Get the online sale batch to find the order
    const saleBatch = await db.onlineSellBatch.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!saleBatch || !saleBatch.order) {
      return new NextResponse(JSON.stringify({ error: "Online sale or order not found" }), { status: 404 });
    }

    // Get shipping change history for this order
    const shippingHistory = await db.shippingChangeLog.findMany({
      where: { orderId: saleBatch.order.id },
      include: {
        changedByUser: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return new NextResponse(JSON.stringify({
      success: true,
      data: shippingHistory
    }), { status: 200 });

  } catch (error: any) {
    console.error('Shipping history API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
