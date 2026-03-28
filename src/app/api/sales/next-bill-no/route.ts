"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getISTDateStrDDMMYYYY = () => {
  const now = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + ISTOffset);
  const dd = pad2(ist.getDate());
  const mm = pad2(ist.getMonth() + 1);
  const yyyy = ist.getFullYear();
  return `${dd}${mm}${yyyy}`;
};

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type");
    const body = await req.json().catch(() => ({}));
    const type =
      (typeof body?.type === "string" && body.type.trim()) ||
      (typeParam && typeParam.trim()) ||
      "HS";

    const prefix = type.toUpperCase() === "RB" ? "RB" : "HS";
    const dateKey = getISTDateStrDDMMYYYY();

    // Try increment existing row
    let counter = await db.salesBillCounter.findUnique({
      where: { date_type_unique: { date: dateKey, type: prefix } },
    });

    if (!counter) {
      counter = await db.salesBillCounter.create({
        data: { date: dateKey, type: prefix, sequence: 1 },
      });
    } else {
      counter = await db.salesBillCounter.update({
        where: { date_type_unique: { date: dateKey, type: prefix } },
        data: { sequence: { increment: 1 } },
      });
    }

    const displayBillNo = `${prefix}-${dateKey}-${String(counter.sequence).padStart(2, "0")}`;
    return NextResponse.json({ success: true, displayBillNo });
  } catch (error) {
    console.error("sales/next-bill-no error", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate bill number" },
      { status: 500 }
    );
  }
}

