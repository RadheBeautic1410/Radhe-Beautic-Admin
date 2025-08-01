import { getShopList } from "@/src/actions/shop";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const shops = await getShopList();
    return NextResponse.json({ data: shops }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching shops:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shops" },
      { status: 500 }
    );
  }
} 