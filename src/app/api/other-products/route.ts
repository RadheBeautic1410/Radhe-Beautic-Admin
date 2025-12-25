import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Search
    const search = searchParams.get("search")?.trim() ?? "";
    const searchType = searchParams.get("searchType") ?? "category"; // category, productType

    // Sort
    const sortType = searchParams.get("sort") ?? "RECENT"; // RECENT, CATEGORY_NAME, PRODUCT_TYPE

    // Product Type Filter
    const productType = searchParams.get("productType")?.trim() ?? "";
    // Sub Type Filter
    const subType = searchParams.get("subType")?.trim() ?? "";

    // Build Prisma filter
    let where: any = { isDeleted: false };
    if (search) {
      if (searchType === "category") {
        where.categoryName = { contains: search, mode: "insensitive" };
      } else if (searchType === "productType") {
        where.productType = { contains: search, mode: "insensitive" };
      }
    }

    // Add product type filter
    if (productType) {
      where.productType = productType;
    }

    // Add sub type filter
    if (subType) {
      where.subType = subType;
    }

    // Sorting mapping
    let orderBy: any;
    switch (sortType) {
      case "CATEGORY_NAME":
        orderBy = { categoryName: "asc" };
        break;
      case "PRODUCT_TYPE":
        orderBy = { productType: "asc" };
        break;
      case "RECENT":
      default:
        orderBy = { createdAt: "desc" };
    }

    const [products, totalCount] = await Promise.all([
      db.otherProduct.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.otherProduct.count({ where }),
    ]);

    return NextResponse.json({
      data: products,
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { categoryName, productType, subType, description, images } = body;

    if (!categoryName || !productType) {
      return new NextResponse(
        JSON.stringify({ error: "Category name and product type are required" }),
        { status: 400 }
      );
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "At least one image is required" }),
        { status: 400 }
      );
    }

    const newProduct = await db.otherProduct.create({
      data: {
        categoryName,
        productType,
        subType: subType || null,
        description: description || null,
        images: images,
      },
    });

    return NextResponse.json({ data: newProduct, success: true });
  } catch (err: any) {
    console.error("Error creating other product:", err);
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

