import { db } from "@/src/lib/db"; 
import { NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET(req: Request) {
  const guard = await apiPermission(["staff.view","wallet.view"]);
  if (guard.response) return guard.response;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const history = await db.walletHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ history });
  } catch (err) {
    return NextResponse.json({ error: "Error fetching history" }, { status: 500 });
  }
}
