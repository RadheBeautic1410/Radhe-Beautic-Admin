export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOfflineSaleById } from "@/src/data/offline-sales";
import { regenerateOfflineSaleInvoice } from "@/src/data/kurti";
import { db } from "@/src/lib/db";

const getCurrTime = async () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Sale ID is required" }),
        { status: 400 }
      );
    }

    const sale = await getOfflineSaleById(id);

    if (!sale) {
      return new NextResponse(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
      });
    }

    // Check if user has access to this sale
    if (session.user.role !== "ADMIN") {
      // For non-admin users, check if the sale belongs to their shop
      const userShop = await db.user.findUnique({
        where: { id: session.user.id },
        include: { shop: true },
      });

      if (userShop?.shop?.id !== sale.shopId) {
        return new NextResponse(JSON.stringify({ error: "Access denied" }), {
          status: 403,
        });
      }
    }

    return new NextResponse(
      JSON.stringify({
        data: sale,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Offline sale details API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const currTime = await getCurrTime();
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { id } = await params;

    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: "Sale ID is required" }),
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerName,
      customerPhone,
      billCreatedBy,
      paymentType,
      gstType,
      sellType,
      newProducts, // Array of new products to add
      updatedItems, // Array of existing items to update
      removedItems, // Array of item IDs to remove
    } = body;

    // Validate required fields
    if (!customerName?.trim()) {
      return new NextResponse(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400 }
      );
    }

    if (!billCreatedBy?.trim()) {
      return new NextResponse(
        JSON.stringify({ error: "Bill created by is required" }),
        { status: 400 }
      );
    }

    // Validate new products data
    if (newProducts && Array.isArray(newProducts)) {
      for (const product of newProducts) {
        if (
          !product.kurtiId ||
          !product.selectedSize ||
          !product.quantity ||
          !product.sellingPrice
        ) {
          return new NextResponse(
            JSON.stringify({
              error: "Invalid new product data. All fields are required.",
            }),
            { status: 400 }
          );
        }
        if (product.quantity <= 0 || product.sellingPrice <= 0) {
          return new NextResponse(
            JSON.stringify({
              error: "Quantity and selling price must be greater than 0",
            }),
            { status: 400 }
          );
        }
      }
    }

    // Validate updated items data
    if (updatedItems && Array.isArray(updatedItems)) {
      for (const item of updatedItems) {
        if (!item.id) {
          return new NextResponse(
            JSON.stringify({
              error: "Invalid updated item data. Item ID is required.",
            }),
            { status: 400 }
          );
        }
        if (item.quantity !== undefined && item.quantity <= 0) {
          return new NextResponse(
            JSON.stringify({ error: "Quantity must be greater than 0" }),
            { status: 400 }
          );
        }
        if (item.sellingPrice !== undefined && item.sellingPrice <= 0) {
          return new NextResponse(
            JSON.stringify({ error: "Selling price must be greater than 0" }),
            { status: 400 }
          );
        }
      }
    }

    // Get the sale to check access and update
    const existingSale = await getOfflineSaleById(id);

    if (!existingSale) {
      return new NextResponse(JSON.stringify({ error: "Sale not found" }), {
        status: 404,
      });
    }

    // Check if user has access to this sale
    if (session.user.role !== "ADMIN") {
      // For non-admin users, check if the sale belongs to their shop
      const userShop = await db.user.findUnique({
        where: { id: session.user.id },
        include: { shop: true },
      });

      if (userShop?.shop?.id !== existingSale.shopId) {
        return new NextResponse(JSON.stringify({ error: "Access denied" }), {
          status: 403,
        });
      }
    }

    // Start a transaction to handle all updates
    console.log("Starting offline sale update transaction:", {
      id,
      newProducts: newProducts?.length || 0,
      updatedItems: updatedItems?.length || 0,
      removedItems: removedItems?.length || 0,
    });

    const result = await db.$transaction(async (tx) => {
      // Update the sale batch details
      const updatedSale = await tx.offlineSellBatch.update({
        where: { id },
        data: {
          customerName: customerName.trim(),
          customerPhone: customerPhone?.trim() || null,
          billCreatedBy: billCreatedBy.trim(),
          paymentType: paymentType?.trim() || null,
          gstType: gstType || "SGST_CGST",
          sellType: sellType || "SHOP_SELL_OFFLINE",
          updatedAt: currTime,
        },
      });

      // Update existing items if provided
      if (updatedItems && Array.isArray(updatedItems)) {
        for (const item of updatedItems) {
          if (
            item.id &&
            (item.quantity !== undefined || item.sellingPrice !== undefined)
          ) {
            const updateData: any = {};
            if (item.quantity !== undefined)
              updateData.quantity = item.quantity;
            if (item.sellingPrice !== undefined)
              updateData.selledPrice = item.sellingPrice;
            updateData.updatedAt = currTime;
            await tx.offlineSell.update({
              where: { id: item.id },
              data: updateData,
            });
          }
        }
      }

      // Remove items if provided
      if (removedItems && Array.isArray(removedItems)) {
        for (const itemId of removedItems) {
          // Get the item details before deletion to restore stock
          const itemToDelete = await tx.offlineSell.findUnique({
            where: { id: itemId },
          });

          if (itemToDelete) {
            // Restore kurti stock
            const kurti = await tx.kurti.findUnique({
              where: { id: itemToDelete.kurtiId },
            });

            if (kurti && kurti.sizes) {
              const updatedSizes = kurti.sizes.map((size: any) => {
                if ((size as any).size === itemToDelete.kurtiSize) {
                  return {
                    ...size,
                    quantity:
                      (size as any).quantity + (itemToDelete.quantity || 1),
                  };
                }
                return size;
              });

              await tx.kurti.update({
                where: { id: itemToDelete.kurtiId },
                data: { sizes: updatedSizes },
              });
            }

            // Delete the offline sale record
            await tx.offlineSell.delete({
              where: { id: itemId },
            });
          }
        }
      }

      // Add new products if provided
      if (newProducts && Array.isArray(newProducts)) {
        const currentTime = new Date();

        for (const product of newProducts) {
          if (
            product.kurtiId &&
            product.selectedSize &&
            product.quantity &&
            product.sellingPrice
          ) {
            // Create new offline sale record
            await tx.offlineSell.create({
              data: {
                sellTime: currentTime,
                code: product.code || product.kurtiCode,
                kurtiSize: product.selectedSize,
                kurtiId: product.kurtiId,
                batchId: id,
                quantity: product.quantity,
                selledPrice: product.sellingPrice,
                customerName: customerName.trim(),
                customerPhone: customerPhone?.trim() || null,
                shopLocation: existingSale.shop?.shopLocation || null,
                createdAt: currentTime,
                updatedAt: currentTime,
              },
            });

            // Update kurti stock
            const kurti = await tx.kurti.findUnique({
              where: { id: product.kurtiId },
            });

            if (kurti && kurti.sizes) {
              const sizeInfo = kurti.sizes.find(
                (size: any) => (size as any).size === product.selectedSize
              );
              if (!sizeInfo) {
                throw new Error(
                  `Size ${product.selectedSize} not found for product ${product.kurtiCode}`
                );
              }

              if ((sizeInfo as any).quantity < product.quantity) {
                throw new Error(
                  `Insufficient stock for ${product.kurtiCode} size ${
                    product.selectedSize
                  }. Available: ${(sizeInfo as any).quantity}, Requested: ${
                    product.quantity
                  }`
                );
              }

              const updatedSizes = kurti.sizes.map((size: any) => {
                if ((size as any).size === product.selectedSize) {
                  return {
                    ...size,
                    quantity: Math.max(
                      0,
                      (size as any).quantity - product.quantity
                    ),
                  };
                }
                return size;
              });

              await tx.kurti.update({
                where: { id: product.kurtiId },
                data: { sizes: updatedSizes },
              });
            } else {
              throw new Error(
                `Product ${product.kurtiCode} not found or has no sizes`
              );
            }
          }
        }
      }

      // Recalculate total amount and items
      const allSales = await tx.offlineSell.findMany({
        where: { batchId: id },
      });

      const totalAmount = allSales.reduce((sum, sale) => {
        return sum + (sale.selledPrice || 0) * (sale.quantity || 1);
      }, 0);

      const totalItems = allSales.reduce((sum, sale) => {
        return sum + (sale.quantity || 1);
      }, 0);

      // Update batch totals
      const finalUpdatedSale = await tx.offlineSellBatch.update({
        where: { id },
        data: {
          totalAmount,
          totalItems,
        },
        include: {
          shop: true,
          sales: {
            include: {
              kurti: true,
            },
          },
        },
      });

      return finalUpdatedSale;
    });

    // Regenerate invoice if there were any changes to products
    let invoiceResult = null;
    if (
      (newProducts && newProducts.length > 0) ||
      (updatedItems && updatedItems.length > 0) ||
      (removedItems && removedItems.length > 0)
    ) {
      try {
        console.log("Regenerating invoice due to product changes...");
        invoiceResult = await regenerateOfflineSaleInvoice(id, session.user);
        if (invoiceResult.error) {
          console.error("Invoice regeneration failed:", invoiceResult.error);
        } else {
          console.log(
            "Invoice regenerated successfully:",
            invoiceResult.invoiceUrl
          );
        }
      } catch (invoiceError) {
        console.error("Error during invoice regeneration:", invoiceError);
      }
    }

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: result,
        invoiceRegenerated: invoiceResult?.success || false,
        newInvoiceUrl: invoiceResult?.invoiceUrl || null,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Offline sale update API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
