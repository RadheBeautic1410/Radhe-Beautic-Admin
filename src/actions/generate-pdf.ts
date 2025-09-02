"use server";

import { generatePDFFromHTML, generateSmallPDFFromHTML } from "@/src/lib/puppeteer";
import { generateAddressInfoHtml, generateInvoiceHTML } from "@/src/lib/utils";
import { OfflineSellType, OnlineSellType } from "@prisma/client";

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
  invoiceNumber: string;
  sellType: OfflineSellType | OnlineSellType;
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
      gstType,
      invoiceNumber,
      sellType,
    } = data;

    // Debug logging
    // console.log('PDF Generation Debug:', {
    //   batchNumber,
    //   customerName,
    //   soldProducts: soldProducts.map(item => ({
    //     code: item.kurti?.code,
    //     selledPrice: item.selledPrice,
    //     quantity: item.quantity,
    //     selledPriceType: typeof item.selledPrice,
    //     quantityType: typeof item.quantity
    //   })),
    //   totalAmount,
    //   totalAmountType: typeof totalAmount,
    //   gstType
    // });

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
      gstType || "SGST_CGST",
      invoiceNumber,
      sellType
    );

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

    // Convert Buffer to base64 string for serialization
    const pdfBase64 = pdfBuffer.toString("base64");

    return {
      success: true,
      pdfBase64,
    };
  } catch (error) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
};

export const generateAddressInfo = async ({
  orderId,
  date,
  quantity,
  group,
  name,
  address,
  mobileNo,
}: {
  orderId: string;
  date: string;
  quantity: number;
  group: string;
  name: string;
  address: string;
  mobileNo: string;
}) => {
  const invoiceHTML = generateAddressInfoHtml({
    orderId,
    date,
    quantity,
    group,
    name,
    address,
    mobileNo,
  });
  const pdfBuffer = await generateSmallPDFFromHTML(invoiceHTML);

  // Convert Buffer to base64 string for serialization
  const pdfBase64 = pdfBuffer.toString("base64");

  return {
    success: true,
    pdfBase64,
  };
};
