export const dynamic = 'force-dynamic'

import { sellMultipleOfflineKurtis } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";

const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

// API Route Handler for Offline Retailer Sales
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Products array is required and cannot be empty" }),
        { status: 400 }
      );
    }

    if (!data.customerName?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Customer name is required" }), { status: 400 });
    }

    if (!data.selectedLocation?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Shop location is required" }), { status: 400 });
    }

    if (!data.billCreatedBy?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Bill created by is required" }), { status: 400 });
    }

    if (!data.paymentType?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Payment type is required" }), { status: 400 });
    }

    if (!data.gstType?.trim()) {
      return new NextResponse(JSON.stringify({ error: "GST type is required" }), { status: 400 });
    }

    // ✅ Forward all required data to sellMultipleOfflineKurtis
    const result = await sellMultipleOfflineKurtis(data);

    if (result.error) {
      return new NextResponse(JSON.stringify({ data: result }), { status: 400 });
    }

    return new NextResponse(JSON.stringify({ data: result }), { status: 200 });
  } catch (error: any) {
    console.error('Offline API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
} 