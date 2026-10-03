export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { getOfflineSaleById } from "@/src/data/offline-sales";
import { regenerateOfflineSaleInvoice } from "@/src/data/kurti";
import { db } from "@/src/lib/db";
import {
  StockLocation,
  addToLocation,
  deductFromLocation,
  isStockLocation,
  locationForShopId,
} from "@/src/lib/godown";

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
      newManualProducts,
      updatedManualItems,
      removedManualItems,
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

    if (newManualProducts && Array.isArray(newManualProducts)) {
      for (const p of newManualProducts) {
        if (!String(p?.category || "").trim()) {
          return new NextResponse(
            JSON.stringify({ error: "Category is required for new untracked line" }),
            { status: 400 }
          );
        }
        if ((Number(p?.quantity) || 0) <= 0 || (Number(p?.sellingPrice) || 0) <= 0) {
          return new NextResponse(
            JSON.stringify({
              error: "Untracked quantity and selling price must be greater than 0",
            }),
            { status: 400 }
          );
        }
      }
    }

    if (updatedManualItems && Array.isArray(updatedManualItems)) {
      for (const item of updatedManualItems) {
        if (!item.id) {
          return new NextResponse(
            JSON.stringify({
              error: "Invalid untracked item update: id is required.",
            }),
            { status: 400 }
          );
        }
        if (item.quantity !== undefined && item.quantity <= 0) {
          return new NextResponse(
            JSON.stringify({ error: "Untracked quantity must be greater than 0" }),
            { status: 400 }
          );
        }
        if (item.sellingPrice !== undefined && item.sellingPrice <= 0) {
          return new NextResponse(
            JSON.stringify({
              error: "Untracked selling price must be greater than 0",
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
      newManualProducts: newManualProducts?.length || 0,
      updatedManualItems: updatedManualItems?.length || 0,
      removedManualItems: removedManualItems?.length || 0,
    });

    // NOTE:
    // This endpoint can legitimately touch 100+ rows (sales + stock updates).
    // Prisma interactive transactions default to a 5s timeout, which can be exceeded on large updates.
    // Lines on this bill sell from (and return to) the bill's shop location.
    const billLocation = locationForShopId(existingSale.shopId);
    if (!billLocation && (removedItems?.length || newProducts?.length)) {
      return new NextResponse(
        JSON.stringify({ error: "This bill's shop has no stock location, so products can't be added or removed" }),
        { status: 400 }
      );
    }
    const stockLocation = billLocation!;

    const result = await db.$transaction(
      async (tx) => {
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

      // A changed quantity on an existing line moves stock too: extra pieces come
      // out of the line's location, fewer pieces go back into it.
      if (updatedItems && Array.isArray(updatedItems)) {
        const newQtyById = new Map<string, number>(
          updatedItems
            .filter((item: any) => item?.id && item.quantity !== undefined)
            .map((item: any) => [item.id, Number(item.quantity)])
        );
        const originals = newQtyById.size
          ? await tx.offlineSell.findMany({
              where: { id: { in: Array.from(newQtyById.keys()) }, batchId: id },
              select: { id: true, code: true, kurtiId: true, kurtiSize: true, quantity: true, stockLocation: true },
            })
          : [];

        // kurtiId -> list of { size, delta, location }
        const changesByKurti = new Map<string, { size: string; delta: number; location: StockLocation; label: string }[]>();
        for (const row of originals) {
          const delta = (newQtyById.get(row.id) || 0) - (row.quantity || 1);
          if (!delta || !row.kurtiId) continue;
          const location = isStockLocation(row.stockLocation) ? row.stockLocation : billLocation;
          if (!location) {
            throw new Error("This bill's shop has no stock location, so quantities can't be changed");
          }
          const size = String(row.kurtiSize || "").toUpperCase();
          if (!changesByKurti.has(row.kurtiId)) changesByKurti.set(row.kurtiId, []);
          changesByKurti.get(row.kurtiId)!.push({ size, delta, location, label: `${row.code}-${size}` });
        }

        if (changesByKurti.size > 0) {
          const kurtis = await tx.kurti.findMany({
            where: { id: { in: Array.from(changesByKurti.keys()) } },
            select: { id: true, sizes: true },
          });
          for (const k of kurtis) {
            let sizes = [...((k.sizes as any[]) || [])];
            for (const change of changesByKurti.get(k.id) || []) {
              const idx = sizes.findIndex(
                (s: any) => String(s?.size || "").toUpperCase() === change.size
              );
              if (change.delta > 0) {
                if (idx === -1) {
                  throw new Error(`${change.label}: not in stock, can't raise the quantity`);
                }
                sizes[idx] = deductFromLocation(sizes[idx], change.delta, change.location, change.label);
              } else if (idx === -1) {
                sizes.push(addToLocation({ size: change.size, quantity: 0 }, -change.delta, change.location));
              } else {
                sizes[idx] = addToLocation(sizes[idx], -change.delta, change.location);
              }
            }
            await tx.kurti.update({
              where: { id: k.id },
              data: { sizes, updatedAt: currTime },
            });
          }
        }
      }

      // Update existing items if provided
      if (updatedItems && Array.isArray(updatedItems)) {
        // Do updates in small concurrent batches to reduce total wall time without overwhelming DB.
        const toUpdate = updatedItems
          .filter(
            (item: any) =>
              item?.id &&
              (item.quantity !== undefined || item.sellingPrice !== undefined)
          )
          .map((item: any) => {
            const updateData: any = { updatedAt: currTime };
            if (item.quantity !== undefined) updateData.quantity = item.quantity;
            if (item.sellingPrice !== undefined)
              updateData.selledPrice = item.sellingPrice;
            return { id: item.id, data: updateData };
          });

        const BATCH = 25;
        for (let i = 0; i < toUpdate.length; i += BATCH) {
          const chunk = toUpdate.slice(i, i + BATCH);
          await Promise.all(
            chunk.map((u) =>
              tx.offlineSell.update({
                where: { id: u.id },
                data: u.data,
              })
            )
          );
        }
      }

      // Remove items if provided
      if (removedItems && Array.isArray(removedItems)) {
        const ids = removedItems.filter(Boolean);
        if (ids.length > 0) {
          // Fetch all items once (instead of N findUnique calls)
          const itemsToDelete = await tx.offlineSell.findMany({
            where: { id: { in: ids } },
            select: { id: true, kurtiId: true, kurtiSize: true, quantity: true },
          });

          // Restore stock grouped by kurtiId (update each kurti at most once)
          const restoreByKurti = new Map<
            string,
            Map<string, number>
          >();
          for (const it of itemsToDelete) {
            const size = String(it.kurtiSize || "").toUpperCase();
            if (!it.kurtiId || !size) continue;
            const qty = it.quantity || 1;
            if (!restoreByKurti.has(it.kurtiId)) {
              restoreByKurti.set(it.kurtiId, new Map());
            }
            const m = restoreByKurti.get(it.kurtiId)!;
            m.set(size, (m.get(size) || 0) + qty);
          }

          const kurtiIds = Array.from(restoreByKurti.keys());
          if (kurtiIds.length > 0) {
            const kurtis = await tx.kurti.findMany({
              where: { id: { in: kurtiIds } },
              select: { id: true, sizes: true },
            });

            await Promise.all(
              kurtis.map(async (k) => {
                const restoreMap = restoreByKurti.get(k.id);
                if (!restoreMap || !k.sizes) return;

                const updatedSizes = (k.sizes as any[]).map((s: any) => {
                  const key = String(s?.size || "").toUpperCase();
                  const add = restoreMap.get(key) || 0;
                  if (!add) return s;
                  return addToLocation(s, add, stockLocation);
                });

                await tx.kurti.update({
                  where: { id: k.id },
                  data: { sizes: updatedSizes, updatedAt: currTime },
                });
              })
            );
          }

          // Delete all removed items in one query
          await tx.offlineSell.deleteMany({
            where: { id: { in: ids } },
          });
        }
      }

      // Add new products if provided
      if (newProducts && Array.isArray(newProducts)) {
        const currentTime = new Date();

        const validNewProducts = newProducts.filter(
          (p: any) =>
            p?.kurtiId &&
            p?.selectedSize &&
            p?.quantity &&
            p?.sellingPrice
        );

        if (validNewProducts.length > 0) {
          // Group required stock decrements by kurtiId -> size -> qty
          const decByKurti = new Map<string, Map<string, number>>();
          for (const p of validNewProducts) {
            const size = String(p.selectedSize).toUpperCase();
            const qty = Number(p.quantity) || 0;
            if (!p.kurtiId || !size || qty <= 0) continue;
            if (!decByKurti.has(p.kurtiId)) decByKurti.set(p.kurtiId, new Map());
            const m = decByKurti.get(p.kurtiId)!;
            m.set(size, (m.get(size) || 0) + qty);
          }

          // Fetch all needed kurtis once
          const kurtiIds = Array.from(decByKurti.keys());
          const kurtis = await tx.kurti.findMany({
            where: { id: { in: kurtiIds } },
            select: { id: true, sizes: true },
          });

          const kurtiById = new Map(kurtis.map((k) => [k.id, k]));

          // Validate stock for all products before applying any updates
          for (const [kurtiId, sizeMap] of decByKurti.entries()) {
            const k = kurtiById.get(kurtiId);
            if (!k || !k.sizes) {
              throw new Error(`Product not found or has no sizes: ${kurtiId}`);
            }
            for (const [size, qty] of sizeMap.entries()) {
              const sizeInfo = (k.sizes as any[]).find(
                (s: any) => String(s?.size || "").toUpperCase() === size
              );
              if (!sizeInfo) {
                throw new Error(`Size ${size} not found for product ${kurtiId}`);
              }
              // Throws with where the pieces actually are when this shop lacks them
              deductFromLocation(sizeInfo, qty, stockLocation, `${kurtiId} size ${size}`);
            }
          }

          // Apply stock updates (each kurti updated once)
          await Promise.all(
            kurtiIds.map(async (kurtiId) => {
              const k = kurtiById.get(kurtiId);
              const sizeMap = decByKurti.get(kurtiId);
              if (!k || !k.sizes || !sizeMap) return;

              const updatedSizes = (k.sizes as any[]).map((s: any) => {
                const key = String(s?.size || "").toUpperCase();
                const dec = sizeMap.get(key) || 0;
                if (!dec) return s;
                return deductFromLocation(s, dec, stockLocation, `${kurtiId} size ${key}`);
              });

              await tx.kurti.update({
                where: { id: kurtiId },
                data: { sizes: updatedSizes, updatedAt: currTime },
              });
            })
          );

          // Create sale rows in bulk
          await tx.offlineSell.createMany({
            data: validNewProducts.map((p: any) => ({
              sellTime: currentTime,
              code: p.code || p.kurtiCode,
              kurtiSize: String(p.selectedSize).toUpperCase(),
              kurtiId: p.kurtiId,
              batchId: id,
              quantity: p.quantity,
              selledPrice: p.sellingPrice,
              customerName: customerName.trim(),
              customerPhone: customerPhone?.trim() || null,
              shopLocation: existingSale.shop?.shopLocation || null,
              stockLocation,
              createdAt: currentTime,
              updatedAt: currentTime,
            })),
          });
        }
      }

      // --- Untracked (manual) lines: no stock changes ---
      if (removedManualItems && Array.isArray(removedManualItems)) {
        const mids = removedManualItems.filter(Boolean);
        if (mids.length > 0) {
          await tx.offlineManualSell.deleteMany({
            where: { batchId: id, id: { in: mids } },
          });
        }
      }

      if (updatedManualItems && Array.isArray(updatedManualItems)) {
        const toUpdateManual = updatedManualItems
          .filter((item: any) => item?.id)
          .map((item: any) => {
            const data: any = { updatedAt: currTime };
            if (item.quantity !== undefined) data.quantity = item.quantity;
            if (item.sellingPrice !== undefined) data.selledPrice = item.sellingPrice;
            if (item.category !== undefined)
              data.category = String(item.category || "").trim();
            if (item.selectedSize !== undefined) {
              const s = String(item.selectedSize || "").trim().toUpperCase();
              data.kurtiSize = s || null;
            }
            return { id: item.id, data };
          });

        const BATCHM = 25;
        for (let i = 0; i < toUpdateManual.length; i += BATCHM) {
          const chunk = toUpdateManual.slice(i, i + BATCHM);
          await Promise.all(
            chunk.map((u) =>
              tx.offlineManualSell.updateMany({
                where: { id: u.id, batchId: id },
                data: u.data,
              })
            )
          );
        }
      }

      if (newManualProducts && Array.isArray(newManualProducts)) {
        const validManual = newManualProducts.filter(
          (p: any) =>
            String(p?.category || "").trim() &&
            (Number(p?.quantity) || 0) > 0 &&
            (Number(p?.sellingPrice) || 0) > 0
        );
        if (validManual.length > 0) {
          await tx.offlineManualSell.createMany({
            data: validManual.map((p: any) => {
              const sz = String(p?.selectedSize || "").trim().toUpperCase();
              return {
                batchId: id,
                category: String(p.category).trim(),
                kurtiSize: sz || null,
                quantity: Number(p.quantity),
                selledPrice: Number(p.sellingPrice),
                hsnCode: String(p?.hsnCode || "6204"),
                customerName: customerName.trim(),
                customerPhone: customerPhone?.trim() || null,
                createdAt: currTime,
                updatedAt: currTime,
              };
            }),
          });
        }
      }

      // Recalculate totals efficiently (no need to load every row)
      const totals = await tx.offlineSell.aggregate({
        where: { batchId: id },
        _sum: {
          quantity: true,
          selledPrice: true, // note: this sums unit prices, not amounts; totalAmount is computed below
        },
      });

      // Prisma doesn't support sum(selledPrice * quantity) directly; do it via lightweight select.
      // Still cheaper than including entire kurti objects while recalculating.
      const rowsForTotal = await tx.offlineSell.findMany({
        where: { batchId: id },
        select: { selledPrice: true, quantity: true },
      });
      const manualRowsForTotal = await tx.offlineManualSell.findMany({
        where: { batchId: id },
        select: { selledPrice: true, quantity: true },
      });
      const trackedAmount = rowsForTotal.reduce(
        (sum, r) => sum + (r.selledPrice || 0) * (r.quantity || 1),
        0
      );
      const manualAmount = manualRowsForTotal.reduce(
        (sum, r) => sum + (r.selledPrice || 0) * (r.quantity || 1),
        0
      );
      const manualItems = manualRowsForTotal.reduce(
        (sum, r) => sum + (r.quantity || 1),
        0
      );
      const totalAmount = trackedAmount + manualAmount;
      const totalItems = (totals._sum.quantity || 0) + manualItems;

      // Update batch totals
      const finalUpdatedSale = await tx.offlineSellBatch.update({
        where: { id },
        data: {
          totalAmount,
          totalItems,
        },
        include: {
          shop: true,
          manualSales: true,
          sales: {
            include: {
              kurti: true,
            },
          },
        },
      });

      return finalUpdatedSale;
      },
      {
        // Increase interactive transaction timeout for large edits
        timeout: 60000,
        maxWait: 60000,
      }
    );

    // Regenerate invoice if there were any changes to products
    let invoiceResult = null;
    if (
      (newProducts && newProducts.length > 0) ||
      (updatedItems && updatedItems.length > 0) ||
      (removedItems && removedItems.length > 0) ||
      (newManualProducts && newManualProducts.length > 0) ||
      (updatedManualItems && updatedManualItems.length > 0) ||
      (removedManualItems && removedManualItems.length > 0)
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
