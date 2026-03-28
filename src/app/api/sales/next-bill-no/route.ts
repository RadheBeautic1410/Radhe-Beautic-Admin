"use server";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getISTDateStrDDMMYYYY = () => {
  const now = new Date();
  // Use timezone-aware formatting instead of manual offset math
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const dd = parts.find((p) => p.type === "day")?.value ?? pad2(now.getDate());
  const mm =
    parts.find((p) => p.type === "month")?.value ??
    pad2(now.getMonth() + 1);
  const yyyy =
    parts.find((p) => p.type === "year")?.value ?? String(now.getFullYear());
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

