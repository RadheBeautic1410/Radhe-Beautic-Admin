import { NextResponse } from "next/server";
import { db as prisma } from "@/src/lib/db";

export async function GET() {
  try {
    const offlineSales = await prisma.offlineSell.findMany({
      select: {
        shopLocation: true,
        kurti: {
          select: {
            code: true,
            sellingPrice: true,
            actualPrice: true,
          },
        },
      },
    });

    const result = offlineSales.map((sale) => ({
      kurtiCode: sale.kurti?.code,
      sellingPrice: sale.kurti?.sellingPrice,
      actualPrice: sale.kurti?.actualPrice,
      shopLocation: sale.shopLocation,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
