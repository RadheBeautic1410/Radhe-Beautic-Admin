"use server";

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
  shippingCharge?: number;
  trackingId?: string;
}): Promise<{ success: boolean; pdfBase64?: string; error?: string }> => {
  try {
    const {
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
      shippingCharge,
      trackingId,
    } = data;

    // Prepare the request payload for the backend API
    const requestPayload = {
      batchNumber,
      customerName,
      customerPhone,
      selectedLocation,
      billCreatedBy,
      currentUser,
      soldProducts: soldProducts.map((item) => ({
        kurti: {
          code: item.kurti?.code || "",
          hsnCode: item.kurti?.hsnCode || "6204",
        },
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.selledPrice || 0,
        totalPrice:
          item.totalPrice ||
          (item.unitPrice || item.selledPrice || 0) * (item.quantity || 1),
        size: item.size || "",
      })),
      totalAmount,
      gstType,
      invoiceNumber,
      sellType,
      shippingCharge: shippingCharge || 0,
      trackingId: trackingId || "",
    };

    // Call the backend API
    const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!backendUrl) {
      throw new Error("Backend URL not configured");
    }

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/generate-invoice-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        // Add timeout for the request
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === "TimeoutError") {
          throw new Error("Backend API request timed out. Please try again.");
        }
        if (fetchError.name === "AbortError") {
          throw new Error("Backend API request was cancelled.");
        }
        throw new Error(`Network error: ${fetchError.message}`);
      }
      throw new Error("Unknown network error occurred");
    }

    if (!response.ok) {
      let errorMessage = `Backend API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the default message
      }
      throw new Error(errorMessage);
    }

    let result: any;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error("Invalid response format from backend API");
    }

    if (!result.success) {
      throw new Error(result.message || "Failed to generate PDF from backend");
    }

    if (!result.pdfBase64) {
      throw new Error("Backend API returned empty PDF data");
    }

    return {
      success: true,
      pdfBase64: result.pdfBase64,
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
  try {
    // Prepare the request payload for the backend API
    const requestPayload = {
      orderId,
      date,
      quantity,
      group,
      name,
      address,
      mobileNo,
    };
    console.log("requestPayload", requestPayload);

    // Call the backend API
    const backendUrl = process.env.NEXT_PUBLIC_SERVER_URL;
    if (!backendUrl) {
      throw new Error("Backend URL not configured");
    }

    let response: Response;
    try {
      response = await fetch(`${backendUrl}/generate-address-pdf`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
        // Add timeout for the request
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });
    } catch (fetchError) {
      if (fetchError instanceof Error) {
        if (fetchError.name === "TimeoutError") {
          throw new Error("Backend API request timed out. Please try again.");
        }
        if (fetchError.name === "AbortError") {
          throw new Error("Backend API request was cancelled.");
        }
        throw new Error(`Network error: ${fetchError.message}`);
      }
      throw new Error("Unknown network error occurred");
    }

    if (!response.ok) {
      let errorMessage = `Backend API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the default message
      }
      throw new Error(errorMessage);
    }

    let result: any;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error("Invalid response format from backend API");
    }

    if (!result.success) {
      throw new Error(
        result.message || "Failed to generate address PDF from backend"
      );
    }

    if (!result.pdfBase64) {
      throw new Error("Backend API returned empty PDF data");
    }

    return {
      success: true,
      pdfBase64: result.pdfBase64,
    };
  } catch (error) {
    console.error("Error generating address PDF:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate address PDF",
    };
  }
};
