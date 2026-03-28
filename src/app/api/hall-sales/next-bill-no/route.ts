"use server";

import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getISTDateKey = () => {
  const now = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + ISTOffset);
  const yyyy = ist.getFullYear();
  const mm = pad2(ist.getMonth() + 1);
  const dd = pad2(ist.getDate());
  return `${yyyy}${mm}${dd}`;
};

export async function POST() {
  try {
    const dateKey = getISTDateKey();

    const counter = await db.hallSalesBillCounter.upsert({
      where: { date: dateKey },
      create: { date: dateKey, sequence: 1 },
      update: { sequence: { increment: 1 } },
    });

    const displayBillNo = `offline-${String(counter.sequence).padStart(3, "0")}`;

    return NextResponse.json({ success: true, displayBillNo });
  } catch (error) {
    console.error("next-bill-no error", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate bill number" },
      { status: 500 }
    );
  }
}

