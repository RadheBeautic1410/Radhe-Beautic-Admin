export const dynamic = "force-dynamic";

import { db } from "@/src/lib/db";
import { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

interface Category {
  id: string;
  name: string;
  // count: number;
  type: string;
  kurtiType?: string;
  countTotal: number;
  totalItems: number;
  sellingPrice: number;
  actualPrice: number;
  image?: string;
  bigPrice?: number;
  walletDiscount?: number;
  code?: string;
  isStockReady?: boolean;
}

// export async function GET(request: Request) {
//     try {
//         const data = await getAllCategoryWithCount({
//             page: 1,
//             limit: 20
//         });
//         return new NextResponse(JSON.stringify({ data: data?.counts }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Search
    const search = searchParams.get("search")?.trim() ?? "";
    const searchType = searchParams.get("searchType") ?? "category"; // category, price, type

    // Sort
    const sortType = searchParams.get("sort") ?? "PRICE_HIGH_TO_LOW"; // or NAME, PIECE_COUNT, PRICE_LOW_TO_HIGH

    // Kurti Type Filter
    const kurtiType = searchParams.get("kurtiType")?.trim() ?? "";

    // Build Prisma filter
    let where: any = { isDeleted: false };
    if (search) {
      if (searchType === "category") {
        where.name = { contains: search, mode: "insensitive" };
      } else if (searchType === "price") {
        where.sellingPrice = Number(search);
      } else if (searchType === "type") {
        where.type = { contains: search, mode: "insensitive" };
      }
    }

    // Add kurti type filter
    if (kurtiType) {
      where.kurtiType = kurtiType;
    }

    // Sorting mapping
    let orderBy: any;
    switch (sortType) {
      case "PRICE_HIGH_TO_LOW":
        orderBy = { sellingPrice: "desc" };
        break;
      case "PRICE_LOW_TO_HIGH":
        orderBy = { sellingPrice: "asc" };
        break;
      case "PIECE_COUNT":
        orderBy = { countTotal: "desc" };
        break;
      case "NAME":
        orderBy = { name: "asc" };
        break;
      default:
        orderBy = { sellingPrice: "desc" };
    }

    const [categories, totalCount] = await Promise.all([
      db.category.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.category.count({ where }),
    ]);

    return NextResponse.json({
      data: categories,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

function generateCSV(data: any): string {
  if (data.length === 0) return "";

  // Define the headers you want in the CSV
  const headers: (keyof Category)[] = [
    "name",
    "type",
    "kurtiType",
    "countTotal",
    "totalItems",
    "sellingPrice",
    "actualPrice",
    "image",
  ];

  // Create CSV rows
  const csvRows = [
    headers.join(","), // CSV Header row
    ...data.map((row: any) =>
      headers
        .map((field) => {
          const val = row[field];
          if (val === null || val === undefined) return "";
          // Escape inner quotes by doubling them
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  return csvRows.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const categories = await db.category.findMany({
      where: {
        isDeleted: false,
      },
    });
    const csv = generateCSV(categories);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="categories.csv"',
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
