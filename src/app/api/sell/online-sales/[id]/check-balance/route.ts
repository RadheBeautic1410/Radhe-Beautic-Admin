export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { checkWalletBalanceForNewProducts, calculateUpdatedTotal } from "@/src/data/online-sales";
import { db } from "@/src/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const body = await request.json();
    const { newProducts = [], updatedItems = [], removedItems = [], userId } = body;

    // Use session user ID if not provided in body
    const targetUserId = userId || session.user.id;

    // Check wallet balance for new products only
    const balanceCheck = await checkWalletBalanceForNewProducts(
      targetUserId,
      newProducts
    );

    // Calculate updated total
    const totalCalculation = await calculateUpdatedTotal(
      id,
      updatedItems,
      newProducts,
      removedItems
    );

    // Get current sale to check payment status
    const currentSale = await db.onlineSellBatch.findUnique({
      where: { id },
      select: { paymentStatus: true }
    });

    const isPendingOrder = currentSale?.paymentStatus === "PENDING";
    const canCompletePayment = isPendingOrder && balanceCheck.hasSufficientBalance;

    return new NextResponse(JSON.stringify({
      success: true,
      data: {
        balanceCheck,
        totalCalculation,
        canProceed: balanceCheck.hasSufficientBalance,
        newProductsAmount: balanceCheck.requiredAmount,
        currentBalance: balanceCheck.currentBalance,
        amountToDeduct: balanceCheck.requiredAmount, // Clear amount that will be deducted
        finalTotal: totalCalculation.finalTotal,
        breakdown: totalCalculation.breakdown,
        orderStatus: {
          isPending: isPendingOrder,
          canCompletePayment,
          currentStatus: currentSale?.paymentStatus || "UNKNOWN"
        }
      }
    }), { status: 200 });

  } catch (error: any) {
    console.error('Online sale balance check API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
