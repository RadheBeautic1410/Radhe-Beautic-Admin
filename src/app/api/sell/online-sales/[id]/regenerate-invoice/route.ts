export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { regenerateOnlineSaleInvoice } from "@/src/data/online-sales";

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

    // Regenerate invoice
    const result = await regenerateOnlineSaleInvoice(id, session.user);

    if (result.error) {
      return new NextResponse(JSON.stringify({
        success: false,
        error: result.error
      }), { status: 400 });
    }

    return new NextResponse(JSON.stringify({
      success: true,
      data: {
        invoiceUrl: result.invoiceUrl,
        message: 'Invoice regenerated successfully'
      }
    }), { status: 200 });

  } catch (error: any) {
    console.error('Regenerate invoice API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
