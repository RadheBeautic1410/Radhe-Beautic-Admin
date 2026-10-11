import { getAvailableKurtiSizes } from "@/src/data/analytics";
import { NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await apiPermission("analytics.view");
  if (guard.response) return guard.response;
  try {
    const data = await getAvailableKurtiSizes();
    return new NextResponse(JSON.stringify({ data }), {
      status: 200,
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
