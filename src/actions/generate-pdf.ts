"use server";

import { generatePDFFromHTML } from "@/src/lib/puppeteer";
import { generateInvoiceHTML } from "@/src/lib/utils";

export const generateInvoicePDF = async (data: {
  saleData: any;
  batchNumber: string;
  customerName: string;
  customerPhone: string;
  selectedLocation: string;
  billCreatedBy: string;
  currentUser: any;
  soldProducts: any[];
  totalAmount: number;
  gstType: "IGST" | "SGST_CGST";
}): Promise<{ success: boolean; pdfBase64?: string; error?: string }> => {
  try {
    const {
      saleData,
      batchNumber,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      currentUser,
      soldProducts,
      totalAmount,
      gstType
    } = data;

    // Debug logging
    console.log('PDF Generation Debug:', {
      batchNumber,
      customerName,
      soldProducts: soldProducts.map(item => ({
        code: item.kurti?.code,
        selledPrice: item.selledPrice,
        quantity: item.quantity,
        selledPriceType: typeof item.selledPrice,
        quantityType: typeof item.quantity
      })),
      totalAmount,
      totalAmountType: typeof totalAmount,
      gstType
    });

    // Generate HTML invoice
    const invoiceHTML = generateInvoiceHTML(
      saleData,
      batchNumber,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      currentUser,
      soldProducts,
      totalAmount,
      gstType || "SGST_CGST"
    );

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

    // Convert Buffer to base64 string for serialization
    const pdfBase64 = pdfBuffer.toString('base64');

    return {
      success: true,
      pdfBase64
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF'
    };
  }
}; 