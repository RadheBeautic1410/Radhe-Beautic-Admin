export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import { PaymentStatus, UserRole } from "@prisma/client";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const orderIds: string[] = body?.orderIds || [];

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "No orders provided" }),
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Validate user
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true, role: true },
      });
      if (!user) throw new Error("User not found");

      // Fetch pending orders selected by admin
      const orders = await tx.orders.findMany({
        where: {
          id: { in: orderIds },
          userId,
          paymentStatus: PaymentStatus.PENDING,
        },
        select: { id: true, orderId: true, total: true, shippingCharge: true },
      });

      if (orders.length !== orderIds.length) {
        throw new Error(
          "Some selected orders are not pending or not accessible"
        );
      }

      const totalToDeduct = orders.reduce(
        (sum, o) => sum + Number(o.total || 0) + Number(o.shippingCharge || 0),
        0
      );
      if ((user.balance || 0) < totalToDeduct) {
        throw new Error("Insufficient wallet balance for selected orders");
      }

      // Deduct total from wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: totalToDeduct },
        },
      });

      // Mark selected orders paid and write one wallet ledger row per order
      for (const o of orders) {
        const orderAmount =
          Number(o.total || 0) + Number(o.shippingCharge || 0);
        await tx.orders.update({
          where: { id: o.id },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });

        if (user.role === UserRole.RESELLER) {
          await tx.user.update({
            where: { id: userId },
            data: { creditLimit: { increment: orderAmount } },
          });
        }

        await tx.walletHistory.create({
          data: {
            userId,
            amount: orderAmount,
            type: "DEBIT",
            paymentMethod: "order-settlement-manual",
            paymentType: `Manual settle ${o.orderId}`,
          },
        });
      }

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      return {
        success: true,
        deducted: totalToDeduct,
        remainingBalance: updatedUser?.balance || 0,
      };
    });

    return new NextResponse(JSON.stringify(result), { status: 200 });
  } catch (error: any) {
    console.error("Error settling pending online orders:", error);
    return new NextResponse(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
