"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const oldBatchNumber = String(body?.oldBatchNumber || "").trim();
    const newBatchNumber = String(body?.newBatchNumber || "").trim();

    if (!oldBatchNumber || !newBatchNumber) {
      return NextResponse.json(
        { success: false, error: "oldBatchNumber and newBatchNumber are required" },
        { status: 400 }
      );
    }

    // Update OfflineSellBatch by old batchNumber
    const existing = await db.offlineSellBatch.findUnique({
      where: { batchNumber: oldBatchNumber },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    await db.offlineSellBatch.update({
      where: { batchNumber: oldBatchNumber },
      data: { batchNumber: newBatchNumber },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Handle unique constraint error for duplicate numbers gracefully
    const message =
      error?.code === "P2002"
        ? "Duplicate bill number; please try again"
        : "Failed to update batch number";
    console.error("update-batch-number error", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

