import { getShopList } from "@/src/actions/shop";
import { NextResponse } from "next/server";
import { PRODUCT_READ_PERMISSIONS } from "@/src/lib/permissions/registry";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET() {
  const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
  if (guard.response) return guard.response;
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