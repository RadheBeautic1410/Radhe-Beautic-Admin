export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { completePendingOrderPayment } from "@/src/data/online-sales";

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
    const { newProducts = [] } = body;

    // Complete pending order payment
    const result = await completePendingOrderPayment(
      id,
      session.user.id!,
      newProducts
    );

    if (result.success) {
      return new NextResponse(JSON.stringify({
        success: true,
        data: {
          amountDeducted: result.amountDeducted,
          message: result.amountDeducted > 0 
            ? `Successfully completed payment. Deducted ${result.amountDeducted} from wallet.`
            : 'Payment already completed or no new products to pay for.'
        }
      }), { status: 200 });
    } else {
      return new NextResponse(JSON.stringify({
        success: false,
        error: result.error || 'Failed to complete payment'
      }), { status: 400 });
    }

  } catch (error: any) {
    console.error('Complete payment API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
