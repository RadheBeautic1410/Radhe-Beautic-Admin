export const dynamic = "force-dynamic";

import { deleteVideo } from "@/src/data/kurti";
import { NextResponse, NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // let category = request.nextUrl.searchParams.get('cat') || "";
    let code = request.nextUrl.searchParams.get("code") || "";
    let idx = parseInt(request.nextUrl.searchParams.get("idx") || "0");
    // console.log('category:', category);
    const data = await deleteVideo(code, idx);
    // console.log('data:', data);/
    return new NextResponse(JSON.stringify({ data }), { status: 200 });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
