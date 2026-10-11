import { db } from "@/src/lib/db";
import { NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET() {
  const guard = await apiPermission(["staff.view","wallet.view"]);
  if (guard.response) return guard.response;
  try {
    const walletHistories = await db.walletHistory.findMany({
      include: {
        // Never hand out the whole user row (it carries the stored password).
        user: { select: { id: true, name: true, phoneNumber: true, role: true, balance: true } },
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
