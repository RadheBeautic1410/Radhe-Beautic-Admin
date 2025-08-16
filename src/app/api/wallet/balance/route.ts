import { db } from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const walletHistories = await db.walletHistory.findMany({
      include: {
        user: true, // optional: if you want user data with wallet history
      },
      orderBy: {
        createdAt: "desc", // optional: latest first
      },
    });

    return NextResponse.json(walletHistories);
  } catch (error) {
    console.error("Failed to fetch wallet history:", error);
    return new NextResponse("Error fetching wallet history", { status: 500 });
  }
}
