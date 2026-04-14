export const dynamic = 'force-dynamic'

import { sellMultipleOfflineKurtis } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";

// API Route Handler for Offline Retailer Sales
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const trackedProducts = Array.isArray(data.trackedProducts) ? data.trackedProducts : [];
    const untrackedProducts = Array.isArray(data.untrackedProducts) ? data.untrackedProducts : [];

    // Validate required line items
    if (trackedProducts.length === 0 && untrackedProducts.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "At least one tracked or untracked product is required" }),
        { status: 400 }
      );
    }

    for (const p of untrackedProducts) {
      if (!String(p?.category || "").trim()) {
        return new NextResponse(JSON.stringify({ error: "Category is required for untracked product" }), {
          status: 400,
        });
      }
      if ((Number(p?.quantity) || 0) <= 0 || (Number(p?.sellingPrice) || 0) <= 0) {
        return new NextResponse(
          JSON.stringify({ error: "Untracked product quantity and price must be greater than 0" }),
          { status: 400 }
        );
      }
    }

    if (!data.customerName?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Customer name is required" }), { status: 400 });
    }

    // if (!data.selectedLocation?.trim()) {
    //   return new NextResponse(JSON.stringify({ error: "Shop location is required" }), { status: 400 });
    // }

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