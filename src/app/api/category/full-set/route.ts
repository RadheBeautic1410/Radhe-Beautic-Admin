export const dynamic = "force-dynamic";

import { getFullSetKurtis } from "@/src/data/fullSet";
import { NextRequest, NextResponse } from "next/server";

const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Omit `category` to list full-set designs across every category.
    const category = searchParams.get("category")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || "60", 10) || 60)
    );

    const { data, total } = await getFullSetKurtis({
      categoryName: category || undefined,
      page,
      limit,
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
