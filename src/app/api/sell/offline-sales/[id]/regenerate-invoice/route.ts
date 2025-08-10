export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { regenerateOfflineSaleInvoice } from "@/src/data/kurti";

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

    const { id } = await params;

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Sale ID is required" }),
        { status: 400 }
      );
    }

    console.log("Manual invoice regeneration requested for sale:", id);

    const result = await regenerateOfflineSaleInvoice(id, session.user);

    if (result.error) {
      return new NextResponse(
        JSON.stringify({ error: result.error }),
        { status: 400 }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        invoiceUrl: result.invoiceUrl,
        batchNumber: result.batchNumber,
        invoiceNumber: result.invoiceNumber,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Invoice regeneration API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
} 