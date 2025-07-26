export const dynamic = 'force-dynamic'
import { db } from "@/src/lib/db";
import { getCode, getKurtiCount } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";

// search for the highest existing code
export async function GET(request: NextRequest) {
  try {
    const cat = (request.nextUrl.searchParams.get("cat") || "").toUpperCase();
    const prefix = await getCode(cat);
    if (!prefix) throw new Error("Category code not found");

    const latestKurti = await db.kurti.findFirst({
      where: {
        code: {
          startsWith: prefix,
        },
      },
      orderBy: {
        code: "desc",
      },
      select: {
        code: true,
      },
    });

    let nextNumber = 1;

    if (latestKurti?.code) {
      const numericPart = latestKurti.code.slice(prefix.length); // e.g., "0265"
      nextNumber = parseInt(numericPart, 10) + 1;
    }

    const finalCode = prefix + String(nextNumber).padStart(4, "0");

    return new NextResponse(JSON.stringify({ code: finalCode }), {
      status: 200,
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}






