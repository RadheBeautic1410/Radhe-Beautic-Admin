export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOfflineSaleById } from "@/src/data/offline-sales";
import { db } from "@/src/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Sale ID is required" }),
        { status: 400 }
      );
    }

    const sale = await getOfflineSaleById(id);

    if (!sale) {
      return new NextResponse(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
      });
    }

    // Check if user has access to this sale
    if (session.user.role !== "ADMIN") {
      // For non-admin users, check if the sale belongs to their shop
      const userShop = await db.user.findUnique({
        where: { id: session.user.id },
        include: { shop: true },
      });

      if (userShop?.shop?.id !== sale.shopId) {
        return new NextResponse(JSON.stringify({ error: "Access denied" }), {
          status: 403,
        });
      }
    }

    return new NextResponse(
      JSON.stringify({
        data: sale,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Offline sale details API Error:", error);
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
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { id } = params;

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Sale ID is required" }),
        { status: 400 }
      );
    }

    const body = await request.json();
    const { customerName, customerPhone, billCreatedBy, paymentType, gstType } =
      body;

    // Validate required fields
    if (!customerName?.trim()) {
      return new NextResponse(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400 }
      );
    }

    if (!billCreatedBy?.trim()) {
      return new NextResponse(
        JSON.stringify({ error: "Bill created by is required" }),
        { status: 400 }
      );
    }

    // Get the sale to check access and update
    const existingSale = await getOfflineSaleById(id);

    if (!existingSale) {
      return new NextResponse(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
      });
    }

    // Check if user has access to this sale
    if (session.user.role !== "ADMIN") {
      // For non-admin users, check if the sale belongs to their shop
      const userShop = await db.user.findUnique({
        where: { id: session.user.id },
        include: { shop: true },
      });

      if (userShop?.shop?.id !== existingSale.shopId) {
        return new NextResponse(JSON.stringify({ error: "Access denied" }), {
          status: 403,
        });
      }
    }

    // Update the sale
    const updatedSale = await db.offlineSellBatch.update({
      where: { id },
      data: {
        customerName: customerName.trim(),
        customerPhone: customerPhone?.trim() || null,
        billCreatedBy: billCreatedBy.trim(),
        paymentType: paymentType?.trim() || null,
        gstType: gstType || "SGST_CGST",
      },
      include: {
        shop: true,
        sales: {
          include: {
            kurti: true,
          },
        },
      },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: updatedSale,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Offline sale update API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
