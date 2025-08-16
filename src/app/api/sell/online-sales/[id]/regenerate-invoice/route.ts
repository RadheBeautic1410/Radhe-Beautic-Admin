export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOnlineSaleById } from "@/src/data/online-sales";
import { generateInvoicePDF } from "@/src/actions/generate-pdf";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Get the sale data
    const sale = await getOnlineSaleById(params.id);
    
    if (!sale) {
      return new NextResponse(JSON.stringify({ error: "Sale not found" }), { status: 404 });
    }

    // Convert sales items to the format expected by the PDF generator
    const soldProducts = sale.sales.map((item: any) => ({
      kurti: item.kurti,
      size: item.kurtiSize,
      quantity: item.quantity || 1,
      selledPrice: item.selledPrice || 0,
      unitPrice: item.selledPrice || 0,
      totalPrice: (item.selledPrice || 0) * (item.quantity || 1),
    }));

    // Generate the invoice PDF
    const result = await generateInvoicePDF({
      saleData: sale,
      batchNumber: sale.batchNumber,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || "",
      selectedLocation: "", // No shop location for online sales
      billCreatedBy: sale.billCreatedBy,
      currentUser: session.user,
      soldProducts,
      totalAmount: sale.totalAmount,
      gstType: (sale.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
      invoiceNumber: sale.invoiceNumber?.toString() || "",
      sellType: sale.sellType,
    });

    if (!result.success || !result.pdfBase64) {
      throw new Error(result.error || "Failed to generate PDF");
    }

    // Convert base64 to blob and upload to storage (you'll need to implement this)
    // For now, we'll return the base64 data
    // In a real implementation, you'd upload this to a storage service and return the URL

    return new NextResponse(JSON.stringify({
      success: true,
      message: "Invoice regenerated successfully",
      pdfBase64: result.pdfBase64
    }), { status: 200 });

  } catch (error: any) {
    console.error('Invoice regeneration API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
