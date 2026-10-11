import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";

export async function POST(req: Request) {
  const guard = await apiPermission(["onlineSales.view","orders.view","onlineSales.edit","staff.view","wallet.view"]);
  if (guard.response) return guard.response;
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, balance: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        balance: user.balance || 0
      }
    });
  } catch (error: any) {
    console.error("Error fetching user balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
