export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Check if user is admin
    if (session.user.role !== "ADMIN") {
      return new NextResponse(
        JSON.stringify({
          error: "Only admins can update shipping information",
        }),
        { status: 403 }
      );
    }

    if (!session.user.id) {
      return new NextResponse(JSON.stringify({ error: "User ID not found" }), {
        status: 400,
      });
    }

    const body = await request.json();
    const { trackingId, shippingCharge, changeReason, selectedCourier } = body;

    // Get the current online sale batch to find the order
    const saleBatch = await db.onlineSellBatch.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!saleBatch || !saleBatch.order) {
      return new NextResponse(
        JSON.stringify({ error: "Online sale or order not found" }),
        { status: 404 }
      );
    }

    const order = saleBatch.order;
    const previousTrackingId = order.trackingId;
    const previousShippingCharge = order.shippingCharge;

    // Check if there are any changes
    const trackingIdChanged = trackingId !== previousTrackingId;
    const shippingChargeChanged = shippingCharge !== previousShippingCharge;

    if (!trackingIdChanged && !shippingChargeChanged) {
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: "No changes detected",
        }),
        { status: 200 }
      );
    }

    // Update the order with new shipping information
    const updatedOrder = await db.orders.update({
      where: { id: order.id },
      data: {
        trackingId: trackingId || null,
        shippingCharge: shippingCharge || 0,
        courier: selectedCourier || null,
      },
    });

    // Log the changes if tracking ID changed
    if (trackingIdChanged) {
      await db.shippingChangeLog.create({
        data: {
          orderId: order.id,
          previousTrackingId: previousTrackingId || null,
          newTrackingId: trackingId || null,
          previousShippingCharge: previousShippingCharge,
          newShippingCharge: shippingCharge || 0,
          changedBy: session.user.id,
          changeReason: changeReason || null,
        },
      });
    }

    // If only shipping charge changed (without tracking ID change), still log it
    if (!trackingIdChanged && shippingChargeChanged) {
      await db.shippingChangeLog.create({
        data: {
          orderId: order.id,
          previousTrackingId: previousTrackingId || null,
          newTrackingId: previousTrackingId || null, // Same as previous
          previousShippingCharge: previousShippingCharge,
          newShippingCharge: shippingCharge || 0,
          changedBy: session.user.id,
          changeReason: changeReason || null,
        },
      });
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Shipping information updated successfully",
        data: {
          trackingId: updatedOrder.trackingId,
          shippingCharge: updatedOrder.shippingCharge,
          changesLogged: trackingIdChanged || shippingChargeChanged,
        },
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update shipping API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
