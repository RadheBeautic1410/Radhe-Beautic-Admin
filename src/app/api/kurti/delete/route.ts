export const dynamic = "force-dynamic";

import {
  deleteKurti,
  getKurtiByCategory,
  getKurtiCount,
} from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET(request: NextRequest) {
  const guard = await apiPermission("catalogue.delete");
  if (guard.response) return guard.response;
  try {
    let category = request.nextUrl.searchParams.get("cat") || "";
    let code = request.nextUrl.searchParams.get("code") || "";
    // console.log('category:', category);

    const data = await deleteKurti(code, category);
    // console.log('data:', data);/
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
