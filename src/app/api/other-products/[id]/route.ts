import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await db.otherProduct.findUnique({
      where: { id },
    });

    if (!product) {
      return new NextResponse(
        JSON.stringify({ error: "Product not found" }),
        { status: 404 }
      );
    }

    return NextResponse.json({ data: product });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const updatedProduct = await db.otherProduct.update({
      where: { id },
      data: {
        categoryName,
        productType,
        subType: subType || null,
        description: description || null,
        images: images,
      },
    });

    return NextResponse.json({ data: updatedProduct, success: true });
  } catch (err: any) {
    console.error("Error updating other product:", err);
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Soft delete
    const deletedProduct = await db.otherProduct.update({
      where: { id },
      data: { isDeleted: true },
    });

    return NextResponse.json({ data: deletedProduct, success: true });
  } catch (err: any) {
    console.error("Error deleting other product:", err);
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

