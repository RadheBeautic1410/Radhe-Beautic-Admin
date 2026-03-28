"use server";

import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

const getISTDateStrDDMMYYYY = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(now);
  const dd = parts.find((p) => p.type === "day")?.value as string;
  const mm = parts.find((p) => p.type === "month")?.value as string;
  const yyyy = parts.find((p) => p.type === "year")?.value as string;
  return `${dd}${mm}${yyyy}`;
};

export async function POST() {
  try {
    const dateKey = getISTDateStrDDMMYYYY();

    const counter = await db.salesBillCounter.upsert({
      where: { date_type_unique: { date: dateKey, type: "HS" } },
      create: { date: dateKey, type: "HS", sequence: 1 },
      update: { sequence: { increment: 1 } },
    });

    const displayBillNo = `HS-${dateKey}-${String(counter.sequence).padStart(
      2,
      "0"
    )}`;

    return NextResponse.json({ success: true, displayBillNo });
  } catch (error) {
    console.error("next-bill-no error", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate bill number" },
      { status: 500 }
    );
  }
}

