export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import { PaymentStatus } from "@prisma/client";
import { getCurrTime } from "@/src/data/kurti";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currTime = await getCurrTime();
    const session = await auth();
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const batchIds: string[] = body?.batchIds || [];

    if (!Array.isArray(batchIds) || batchIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "No batches provided" }),
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      // Validate user
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true },
      });
      if (!user) throw new Error("User not found");

      // Fetch pending batches that belong to this user via order relation
      const batches = await tx.onlineSellBatch.findMany({
        where: {
          id: { in: batchIds },
          paymentStatus: PaymentStatus.PENDING,
          order: { userId: userId },
        },
        select: { id: true, totalAmount: true },
      });

      if (batches.length !== batchIds.length) {
        throw new Error(
          "Some selected batches are not pending or not accessible"
        );
      }

      const totalToDeduct = batches.reduce(
        (sum, b) => sum + (b.totalAmount || 0),
        0
      );
      if ((user.balance || 0) < totalToDeduct) {
        throw new Error("Insufficient wallet balance for selected batches");
      }

      // Deduct total from wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: totalToDeduct },
        },
      });

      // Update batches to COMPLETED and create wallet history per batch
      for (const b of batches) {
        await tx.onlineSellBatch.update({
          where: { id: b.id },
          data: { paymentStatus: PaymentStatus.COMPLETED, updatedAt: currTime },
        });

        await tx.walletHistory.create({
          data: {
            userId,
            amount: b.totalAmount || 0,
            type: "DEBIT",
            paymentMethod: "wallet",
            onlineSellBatchId: b.id,
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
