"use server";

import { db } from "@/src/lib/db";
import { generateInvoicePDF } from "@/src/actions/generate-pdf";
import {
  uploadInvoicePDFToFirebase,
  deleteInvoiceFromFirebase,
} from "@/src/lib/firebase/firebase";
import { Buffer } from 'buffer';

export interface OnlineSalesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchType?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  userId?: string;
  userRole?: string;
}

export interface OnlineSalesResult {
  sales: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const getOnlineSales = async (
  filters: OnlineSalesFilters
): Promise<OnlineSalesResult> => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      searchType = "customerName",
      startDate = "",
      endDate = "",
      paymentStatus = "",
      userId,
      userRole,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause based on user role
    let whereClause: any = {};

    // For online sales, we don't filter by shop since there's no shop information
    // All users can see all online sales

    // Add date range filters
    if (startDate || endDate) {
      whereClause.saleTime = {};

      if (startDate) {
        whereClause.saleTime.gte = new Date(startDate);
      }

      if (endDate) {
        // Set end date to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.saleTime.lte = endDateTime;
      }
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== "all") {
      whereClause.paymentStatus = paymentStatus.toUpperCase() as any;
    }

    // Add search filters
    if (search.trim()) {
      const searchTerm = search.trim();

      switch (searchType) {
        case "customerName":
          whereClause.customerName = {
            contains: searchTerm,
            mode: "insensitive",
          };
          break;
        case "customerPhone":
          whereClause.customerPhone = {
            contains: searchTerm,
            mode: "insensitive",
          };
          break;
        case "invoiceNumber":
          whereClause.invoiceNumber = parseInt(searchTerm) || 0;
          break;
        case "orderId":
          whereClause.orderId = {
            contains: searchTerm,
            mode: "insensitive",
          };
          break;
        case "amount":
          whereClause.totalAmount = parseInt(searchTerm) || 0;
          break;
        case "paymentStatus":
          whereClause.paymentStatus = searchTerm.toUpperCase() as any;
          break;
        default:
          whereClause.customerName = {
            contains: searchTerm,
            mode: "insensitive",
          };
      }
    }

    // Get total count
    const total = await db.onlineSellBatch.count({
      where: whereClause,
    });

    // Get sales data with pagination
    const sales = await db.onlineSellBatch.findMany({
      where: whereClause,
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
        order: {
          include: {
            shippingAddress: {
              select: { id: true, address: true, zipCode: true },
            },
          },
        },
      },
      orderBy: {
        saleTime: "desc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      sales,
      total,
      totalPages,
      currentPage: page,
    };
  } catch (error) {
    console.error("Error fetching online sales:", error);
    throw new Error("Failed to fetch online sales");
  }
};
export const getOnlineSalesReport = async (
  filters: OnlineSalesFilters
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      searchType = "customerName",
      startDate = "",
      endDate = "",
      paymentStatus = "",
    } = filters;

    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // 📅 Date filters
    if (startDate || endDate) {
      whereClause.saleTime = {};
      if (startDate) whereClause.saleTime.gte = new Date(startDate);
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        whereClause.saleTime.lte = endDateTime;
      }
    }

    // 💳 Payment filter
    if (paymentStatus && paymentStatus !== "all") {
      whereClause.paymentStatus = paymentStatus.toUpperCase() as any;
    }

    // 🔍 Search filters
    if (search.trim()) {
      const searchTerm = search.trim();
      switch (searchType) {
        case "customerName":
          whereClause.customerName = {
            contains: searchTerm,
            mode: "insensitive",
          };
          break;
        case "customerPhone":
          whereClause.customerPhone = {
            contains: searchTerm,
            mode: "insensitive",
          };
          break;
        case "invoiceNumber":
          whereClause.invoiceNumber = parseInt(searchTerm) || 0;
          break;
        case "orderId":
          whereClause.orderId = { contains: searchTerm, mode: "insensitive" };
          break;
        case "amount":
          whereClause.totalAmount = parseInt(searchTerm) || 0;
          break;
        case "paymentStatus":
          whereClause.paymentStatus = searchTerm.toUpperCase() as any;
          break;
      }
    }

    // 📊 Count
    const total = await db.onlineSellBatch.count({ where: whereClause });

    // 📦 Fetch sales
    const batches = await db.onlineSellBatch.findMany({
      where: whereClause,
      include: {
        sales: {
          include: {
            kurti: true, // brings sellingPrice
          },
        },
        order: {
          //   include: {
          //     adress: true, // so we can get shop location
          //   },
        },
      },
      orderBy: { saleTime: "desc" },
      skip,
      take: limit,
    });

    // 🧮 Prepare report
    const report = batches.flatMap((batch) =>
      batch.sales.map((s) => {
        const sellingPrice = parseFloat(s.kurti.sellingPrice);
        const selledPrice = s.selledPrice || 0;
        const difference = (s.selledPrice || 0) - sellingPrice;

        return {
          kurtiCode: s.kurti.code,
          sellingPrice,
          selledPrice,
          difference,
          //   shopLocation: batch.order?.address?.location ?? "N/A", // <-- adjust field in Address
        };
      })
    );

    // 💰 Total profit (ignores filters)
    const allSales = await db.onlineSellBatch.findMany({
      include: {
        sales: { include: { kurti: true } },
      },
    });

    const totalProfit = allSales.reduce((sum, batch) => {
      return (
        sum +
        batch.sales.reduce((sSum, s) => {
          const sellingPrice = parseFloat(s.kurti.sellingPrice);
          const selledPrice = s.selledPrice ?? 0; // <-- adjust
          return sSum + (selledPrice - sellingPrice);
        }, 0)
      );
    }, 0);

    return {
      report,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProfit,
    };
  } catch (error) {
    console.error("Error generating online sales report:", error);
    throw new Error("Failed to generate report");
  }
};

export const getOnlineSaleById = async (id: string) => {
  try {
    const sale = await db.onlineSellBatch.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
        order: {
          include: {
            user: true,
            shippingAddress: true,
          },
        },
      },
    });

    if (!sale) {
      throw new Error("Online sale not found");
    }

    return sale;
  } catch (error) {
    console.error("Error fetching online sale by ID:", error);
    throw error;
  }
};

export const updateOnlineSale = async (id: string, updateData: any) => {
  try {
    const {
      customerName,
      customerPhone,
      billCreatedBy,
      paymentStatus,
      gstType,
      sellType,
      newProducts = [],
      updatedItems = [],
      removedItems = [],
    } = updateData;

    // Start a transaction
    const result = await db.$transaction(async (tx) => {
      // Update the main sale record
      const updatedSale = await tx.onlineSellBatch.update({
        where: { id },
        data: {
          customerName,
          customerPhone,
          billCreatedBy,
          paymentStatus,
          gstType,
          sellType,
        },
      });

      // Remove items if any
      if (removedItems.length > 0) {
        await tx.onlineSell.deleteMany({
          where: {
            id: { in: removedItems },
          },
        });
      }

      // Update existing items if any
      for (const item of updatedItems) {
        await tx.onlineSell.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            selledPrice: item.sellingPrice,
          },
        });
      }

      // Add new products if any
      if (newProducts.length > 0) {
        for (const product of newProducts) {
          await tx.onlineSell.create({
            data: {
              kurtiId: product.kurtiId,
              code: product.kurtiCode,
              kurtiSize: product.selectedSize,
              quantity: product.quantity,
              selledPrice: product.sellingPrice,
              batchId: id,
              sellTime: new Date(),
            },
          });
        }
      }

      // Return the updated sale with all sales items
      return await tx.onlineSellBatch.findUnique({
        where: { id },
        include: {
          sales: {
            include: {
              kurti: true,
            },
          },
          order: true,
        },
      });
    });

    return result;
  } catch (error) {
    console.error("Error updating online sale:", error);
    throw error;
  }
};

export const updateOnlineSaleWithWalletAndCart = async (
  id: string,
  updateData: any
) => {
  try {
    const {
      customerName,
      customerPhone,
      billCreatedBy,
      paymentStatus,
      gstType,
      sellType,
      newProducts = [],
      updatedItems = [],
      removedItems = [],
      orderId,
    } = updateData;

    const currentOrder = await db.orders.findUnique({
      where: { orderId },
      include: {
        user: true,
      },
    });

    const result = await db.$transaction(
      async (tx) => {
        console.log(`Starting transaction for sale update: ${id}`);

        const currentSale = await tx.onlineSellBatch.findUnique({
          where: { id },
          include: {
            sales: {
              include: {
                kurti: true,
              },
            },
            order: true,
          },
        });

        if (!currentSale) {
          throw new Error("Online sale not found");
        }

        // Calculate current total
        const currentTotal = currentSale.sales.reduce(
          (sum, sale) => sum + (sale.selledPrice || 0) * (sale.quantity || 1),
          0
        );

        // Calculate new total from updated items
        let updatedTotal = 0;
        for (const item of updatedItems) {
          updatedTotal += (item.sellingPrice || 0) * (item.quantity || 1);
        }

        // Calculate new total from new products
        let newProductsTotal = 0;
        for (const product of newProducts) {
          newProductsTotal +=
            (product.sellingPrice || 0) * (product.quantity || 1);
        }

        // Calculate total for items that will remain unchanged
        const unchangedItems = currentSale.sales.filter(
          (sale) =>
            !updatedItems.find((item: any) => item.id === sale.id) &&
            !removedItems.includes(sale.id)
        );
        const unchangedTotal = unchangedItems.reduce(
          (sum: number, sale: any) =>
            sum + (sale.selledPrice || 0) * (sale.quantity || 1),
          0
        );

        // let productTotal = 0;
        // if (currentSale.paymentStatus === "PENDING") {
        //   currentSale.sales.forEach((sale: any) => {
        //     productTotal += sale.selledPrice * sale.quantity;
        //   });
        // }

        console.log(
          "🚀 ~ updateOnlineSaleWithWalletAndCart ~ currentSale.sales:",
          currentSale.sales
        );
        // Calculate final total
        const finalTotal = updatedTotal + newProductsTotal + unchangedTotal;
        console.log(
          "🚀 ~ updateOnlineSaleWithWalletAndCart ~ unchangedTotal:",
          unchangedTotal
        );
        console.log(
          "🚀 ~ updateOnlineSaleWithWalletAndCart ~ updatedTotal:",
          updatedTotal
        );
        console.log(
          "🚀 ~ updateOnlineSaleWithWalletAndCart ~ newProductsTotal:",
          newProductsTotal
        );

        // Calculate amount to settle based on payment status transition
        let amountToSettle = 0;
        let hasSufficientBalance = true;
        let finalPaymentStatus = paymentStatus;

        if (currentOrder?.user) {
          const user = await tx.user.findUnique({
            where: { id: currentOrder.user.id },
            select: { balance: true },
          });

          if (!user) {
            hasSufficientBalance = false;
            finalPaymentStatus = "PENDING";
            console.log(`User not found. Keeping payment status as PENDING.`);
          } else {
            // Determine amount to settle based on payment status transition
            if (currentSale.paymentStatus === "PENDING") {
              // If transitioning from PENDING to COMPLETED, deduct the entire final total
              amountToSettle = finalTotal;
              console.log(
                `Payment status transition: PENDING -> COMPLETED. Amount to settle: ${amountToSettle}`
              );
            } else if (currentSale.paymentStatus === "COMPLETED") {
              // If already COMPLETED, only handle new products and refunds
              amountToSettle = newProductsTotal;
              console.log(
                `Payment status: COMPLETED -> COMPLETED. New products amount: ${amountToSettle}`
              );
            }

            // Check if user has sufficient balance
            if (amountToSettle > 0 && user.balance < amountToSettle) {
              hasSufficientBalance = false;
              finalPaymentStatus = "PENDING";
              console.log(
                `Insufficient balance. User balance: ${user.balance}, Required: ${amountToSettle}`
              );
            } else if (amountToSettle > 0) {
              finalPaymentStatus = "COMPLETED";
              console.log(
                `Sufficient balance. Will settle amount: ${amountToSettle}`
              );
            }
          }
        } else {
          // If no user associated with order, keep status as PENDING
          finalPaymentStatus = "PENDING";
          hasSufficientBalance = false;
          console.log(
            `No user associated with order. Keeping payment status as PENDING.`
          );
        }

        // Update the main sale record
        const updatedSale = await tx.onlineSellBatch.update({
          where: { id },
          data: {
            customerName,
            customerPhone,
            billCreatedBy,
            paymentStatus: finalPaymentStatus,
            gstType,
            sellType,
            totalAmount: finalTotal,
            totalItems:
              updatedItems.length + newProducts.length + unchangedItems.length,
          },
        });

        // Calculate refund amount for removed items (only if payment was completed)
        let refundAmount = 0;
        if (
          removedItems.length > 0 &&
          currentSale.paymentStatus === "COMPLETED"
        ) {
          for (const removedItemId of removedItems) {
            const removedItem = currentSale.sales.find(
              (sale) => sale.id === removedItemId
            );
            if (removedItem) {
              refundAmount +=
                (removedItem.selledPrice || 0) * (removedItem.quantity || 1);
            }
          }
        }

        // Remove items if any and restore stock
        if (removedItems.length > 0) {
          // First, get the items to be removed to restore their stock
          const itemsToRemove = currentSale.sales.filter((sale) =>
            removedItems.includes(sale.id)
          );

          // Restore stock for each removed item
          for (const removedItem of itemsToRemove) {
            if (
              removedItem.kurtiId &&
              removedItem.kurtiSize &&
              removedItem.quantity
            ) {
              console.log(
                `Restoring stock for kurti ${removedItem.kurtiId}, size ${removedItem.kurtiSize}, quantity ${removedItem.quantity}`
              );

              // Get the current kurti to update its sizes and reservedSizes
              const kurti = await tx.kurti.findUnique({
                where: { id: removedItem.kurtiId },
                select: {
                  sizes: true,
                  reservedSizes: true,
                  countOfPiece: true,
                },
              });

              if (kurti) {
                // Update the sizes array to add back the quantity
                const updatedSizes = [...kurti.sizes];
                const existingSizeIndex = updatedSizes.findIndex(
                  (sz: any) => sz.size === removedItem.kurtiSize
                );

                if (existingSizeIndex !== -1) {
                  // Size exists, increment quantity
                  const existingSize = updatedSizes[existingSizeIndex] as any;
                  existingSize.quantity += removedItem.quantity;
                  console.log(
                    `Updated existing size ${removedItem.kurtiSize} quantity to ${existingSize.quantity}`
                  );
                } else {
                  // Size doesn't exist, add new size entry
                  updatedSizes.push({
                    size: removedItem.kurtiSize,
                    quantity: removedItem.quantity,
                  });
                  console.log(
                    `Added new size ${removedItem.kurtiSize} with quantity ${removedItem.quantity}`
                  );
                }

                // Update the reservedSizes array to add back the quantity
                const updatedReservedSizes = [...kurti.reservedSizes];
                const existingReservedSizeIndex =
                  updatedReservedSizes.findIndex(
                    (sz: any) => sz.size === removedItem.kurtiSize
                  );

                if (existingReservedSizeIndex !== -1) {
                  // Reserved size exists, increment quantity
                  const existingReservedSize = updatedReservedSizes[
                    existingReservedSizeIndex
                  ] as any;
                  existingReservedSize.quantity += removedItem.quantity;
                  console.log(
                    `Updated existing reserved size ${removedItem.kurtiSize} quantity to ${existingReservedSize.quantity}`
                  );
                } else {
                  // Reserved size doesn't exist, add new size entry
                  updatedReservedSizes.push({
                    size: removedItem.kurtiSize,
                    quantity: removedItem.quantity,
                  });
                  console.log(
                    `Added new reserved size ${removedItem.kurtiSize} with quantity ${removedItem.quantity}`
                  );
                }

                // Update the kurti with restored stock
                await tx.kurti.update({
                  where: { id: removedItem.kurtiId },
                  data: {
                    sizes: updatedSizes as any,
                    reservedSizes: updatedReservedSizes as any,
                    countOfPiece:
                      (kurti.countOfPiece || 0) + removedItem.quantity,
                  },
                });

                console.log(
                  `Successfully restored stock for kurti ${removedItem.kurtiId}, size ${removedItem.kurtiSize}`
                );
              } else {
                console.log(
                  `Kurti ${removedItem.kurtiId} not found for stock restoration`
                );
              }
            }
          }

          // Now delete the online sell records
          await tx.onlineSell.deleteMany({
            where: {
              id: { in: removedItems },
            },
          });

          // Refund to wallet only if payment was completed and items were removed
          if (
            refundAmount > 0 &&
            currentOrder?.user &&
            currentSale.paymentStatus === "COMPLETED"
          ) {
            console.log(
              `Refunding ${refundAmount} to wallet for user ${currentOrder.user.id}`
            );

            // Add to wallet within the transaction
            await tx.user.update({
              where: { id: currentOrder.user.id },
              data: {
                balance: {
                  increment: refundAmount,
                },
              },
            });

            // Create wallet history entry for refund within the transaction
            await tx.walletHistory.create({
              data: {
                userId: currentOrder.user.id,
                amount: refundAmount,
                type: "CREDIT",
                paymentMethod: "wallet",
                onlineSellBatchId: id,
              },
            });

            console.log(`Successfully refunded ${refundAmount} to wallet`);

            // Verify the refund by checking updated balance
            const updatedUser = await tx.user.findUnique({
              where: { id: currentOrder.user.id },
              select: { balance: true },
            });
            console.log(
              `Updated user balance after refund: ${updatedUser?.balance}`
            );
          } else if (
            removedItems.length > 0 &&
            currentSale.paymentStatus === "PENDING"
          ) {
            console.log(
              `No refund needed for removed items as payment status is PENDING`
            );
          }
        }

        // Update existing items if any and adjust stock
        for (const item of updatedItems) {
          // Get the original item to calculate quantity difference
          const originalItem = currentSale.sales.find(
            (sale) => sale.id === item.id
          );

          if (originalItem && (originalItem.quantity || 0) !== item.quantity) {
            const quantityDifference =
              item.quantity - (originalItem.quantity || 0);
            console.log(
              `Quantity changed for item ${item.id}: ${originalItem.quantity} -> ${item.quantity} (difference: ${quantityDifference})`
            );

            if (quantityDifference !== 0) {
              // Get the current kurti to update its stock
              const kurti = await tx.kurti.findUnique({
                where: { id: originalItem.kurtiId },
                select: {
                  sizes: true,
                  reservedSizes: true,
                  countOfPiece: true,
                },
              });

              if (kurti) {
                // Update the sizes array
                const updatedSizes = [...kurti.sizes];
                const existingSizeIndex = updatedSizes.findIndex(
                  (sz: any) => sz.size === originalItem.kurtiSize
                );

                if (existingSizeIndex !== -1) {
                  // Size exists, adjust quantity
                  const existingSize = updatedSizes[existingSizeIndex] as any;
                  existingSize.quantity -= quantityDifference; // Subtract because we're reducing the sold quantity
                  console.log(
                    `Updated size ${originalItem.kurtiSize} quantity from ${
                      existingSize.quantity + quantityDifference
                    } to ${existingSize.quantity}`
                  );
                }

                // Update the reservedSizes array
                const updatedReservedSizes = [...kurti.reservedSizes];
                const existingReservedSizeIndex =
                  updatedReservedSizes.findIndex(
                    (sz: any) => sz.size === originalItem.kurtiSize
                  );

                if (existingReservedSizeIndex !== -1) {
                  // Reserved size exists, adjust quantity
                  const existingReservedSize = updatedReservedSizes[
                    existingReservedSizeIndex
                  ] as any;
                  existingReservedSize.quantity -= quantityDifference; // Subtract because we're reducing the sold quantity
                  console.log(
                    `Updated reserved size ${
                      originalItem.kurtiSize
                    } quantity from ${
                      existingReservedSize.quantity + quantityDifference
                    } to ${existingReservedSize.quantity}`
                  );
                }

                // Update the kurti with adjusted stock
                await tx.kurti.update({
                  where: { id: originalItem.kurtiId },
                  data: {
                    sizes: updatedSizes as any,
                    reservedSizes: updatedReservedSizes as any,
                    countOfPiece:
                      (kurti.countOfPiece || 0) - quantityDifference,
                  },
                });

                console.log(
                  `Successfully adjusted stock for kurti ${originalItem.kurtiId}, size ${originalItem.kurtiSize}`
                );
              }
            }
          }

          // Update the online sell record
          await tx.onlineSell.update({
            where: { id: item.id },
            data: {
              quantity: item.quantity,
              selledPrice: item.sellingPrice,
            },
          });
        }

        // Add new products if any and reduce stock
        const newSaleItems = [];
        if (newProducts.length > 0) {
          for (const product of newProducts) {
            console.log(
              `Adding new product: kurti ${product.kurtiId}, size ${product.selectedSize}, quantity ${product.quantity}`
            );

            // Get the current kurti to update its stock
            const kurti = await tx.kurti.findUnique({
              where: { id: product.kurtiId },
              select: { sizes: true, reservedSizes: true, countOfPiece: true },
            });

            if (kurti) {
              // Update the sizes array to reduce stock
              const updatedSizes = [...kurti.sizes];
              const existingSizeIndex = updatedSizes.findIndex(
                (sz: any) => sz.size === product.selectedSize
              );

              if (existingSizeIndex !== -1) {
                // Size exists, reduce quantity
                const existingSize = updatedSizes[existingSizeIndex] as any;
                if (existingSize.quantity < product.quantity) {
                  throw new Error(
                    `Insufficient stock for kurti ${product.kurtiId}, size ${product.selectedSize}. Available: ${existingSize.quantity}, Requested: ${product.quantity}`
                  );
                }
                existingSize.quantity -= product.quantity;
                console.log(
                  `Reduced size ${product.selectedSize} quantity from ${
                    existingSize.quantity + product.quantity
                  } to ${existingSize.quantity}`
                );
              } else {
                throw new Error(
                  `Size ${product.selectedSize} not found for kurti ${product.kurtiId}`
                );
              }

              // Update the reservedSizes array to reduce stock
              const updatedReservedSizes = [...kurti.reservedSizes];
              const existingReservedSizeIndex = updatedReservedSizes.findIndex(
                (sz: any) => sz.size === product.selectedSize
              );

              if (existingReservedSizeIndex !== -1) {
                // Reserved size exists, reduce quantity
                const existingReservedSize = updatedReservedSizes[
                  existingReservedSizeIndex
                ] as any;
                if (existingReservedSize.quantity < product.quantity) {
                  throw new Error(
                    `Insufficient reserved stock for kurti ${product.kurtiId}, size ${product.selectedSize}. Available: ${existingReservedSize.quantity}, Requested: ${product.quantity}`
                  );
                }
                existingReservedSize.quantity -= product.quantity;
                console.log(
                  `Reduced reserved size ${
                    product.selectedSize
                  } quantity from ${
                    existingReservedSize.quantity + product.quantity
                  } to ${existingReservedSize.quantity}`
                );
              } else {
                throw new Error(
                  `Reserved size ${product.selectedSize} not found for kurti ${product.kurtiId}`
                );
              }

              // Update the kurti with reduced stock
              await tx.kurti.update({
                where: { id: product.kurtiId },
                data: {
                  sizes: updatedSizes as any,
                  reservedSizes: updatedReservedSizes as any,
                  countOfPiece: (kurti.countOfPiece || 0) - product.quantity,
                },
              });

              console.log(
                `Successfully reduced stock for kurti ${product.kurtiId}, size ${product.selectedSize}`
              );
            } else {
              throw new Error(
                `Kurti ${product.kurtiId} not found for stock reduction`
              );
            }

            // Create the online sell record
            const newSale = await tx.onlineSell.create({
              data: {
                kurtiId: product.kurtiId,
                code: product.kurtiCode,
                kurtiSize: product.selectedSize,
                quantity: product.quantity,
                selledPrice: product.sellingPrice,
                batchId: id,
                sellTime: new Date(),
              },
            });
            newSaleItems.push(newSale);
          }
        }

        // Handle wallet settlement based on amountToSettle (moved outside new products block)
        if (hasSufficientBalance && currentOrder?.user && amountToSettle > 0) {
          console.log(
            `Settling amount ${amountToSettle} from wallet for user ${currentOrder.user.id}`
          );

          // Deduct from wallet within the transaction
          await tx.user.update({
            where: { id: currentOrder.user.id },
            data: {
              balance: {
                decrement: amountToSettle,
              },
            },
          });

          // Create wallet history entry within the transaction
          await tx.walletHistory.create({
            data: {
              userId: currentOrder.user.id,
              amount: amountToSettle,
              type: "DEBIT",
              paymentMethod: "wallet",
              onlineSellBatchId: id,
            },
          });

          console.log(
            `Successfully settled amount ${amountToSettle} from wallet`
          );

          // Verify the deduction by checking updated balance
          const updatedUser = await tx.user.findUnique({
            where: { id: currentOrder.user.id },
            select: { balance: true },
          });
          console.log(`Updated user balance: ${updatedUser?.balance}`);
        } else if (amountToSettle > 0) {
          console.log(
            `No settlement needed. Payment status remains PENDING due to insufficient balance or no user.`
          );
        }

        // Update cart products if orderId is provided
        if (orderId) {
          await updateCartProductsForOnlineSale(
            orderId,
            newProducts,
            removedItems,
            currentSale.sales
          );
        }

        // Generate new invoice number
        const lastInvoice = await tx.onlineSellBatch.findFirst({
          orderBy: { invoiceNumber: "desc" },
        });
        const newInvoiceNumber = (lastInvoice?.invoiceNumber || 0) + 1;

        // Update invoice number
        await tx.onlineSellBatch.update({
          where: { id },
          data: {
            invoiceNumber: newInvoiceNumber,
          },
        });

        // Return the updated sale with all sales items
        return await tx.onlineSellBatch.findUnique({
          where: { id },
          include: {
            sales: {
              include: {
                kurti: true,
              },
            },
            order: true,
          },
        });
      },
      {
        timeout: 30000, // 30 seconds timeout
      }
    );

    console.log(`Transaction completed successfully for sale: ${id}`);

    // Generate and save invoice PDF to Firebase
    if (result) {
      console.log("🚀 ~ updateOnlineSaleWithWalletAndCart ~ result:", result);
      try {
        // Delete old invoice from Firebase if it exists
        if (result.invoiceUrl && result.batchNumber) {
          await deleteInvoiceFromFirebase(result.batchNumber);
        }

        const soldProducts = result.sales.map((sale) => ({
          kurti: sale.kurti,
          selledPrice: sale.selledPrice,
          quantity: sale.quantity,
          kurtiSize: sale.kurtiSize,
          unitPrice: sale.selledPrice,
          totalPrice: sale.selledPrice ?? 0 * (sale.quantity || 1),
        }));

        // Get shipping information from the order
        const shippingCharge = currentOrder?.shippingCharge || 0;
        const trackingId = currentOrder?.trackingId || "";

        // Generate PDF using the backend API
        const pdfResult = await generateInvoicePDF({
          saleData: result,
          batchNumber: result.batchNumber,
          customerName: result.customerName,
          customerPhone: result.customerPhone || "",
          selectedLocation: "", // No shop location for online sales
          billCreatedBy: result.billCreatedBy,
          currentUser: currentOrder?.user,
          soldProducts,
          totalAmount: result.totalAmount,
          gstType: (result.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
          invoiceNumber: result.invoiceNumber?.toString() || "",
          sellType: result.sellType,
          shippingCharge,
          trackingId
        });

        if (!pdfResult.success || !pdfResult.pdfBase64) {
          throw new Error(pdfResult.error || "Failed to generate PDF");
        }

        // Convert base64 string to Buffer
        const pdfBuffer = Buffer.from(pdfResult.pdfBase64, 'base64');

        // Upload PDF to Firebase
        const invoiceUrl = await uploadInvoicePDFToFirebase(
          pdfBuffer,
          result.batchNumber
        );

        // Update the sale with Firebase invoice URL
        await db.onlineSellBatch.update({
          where: { id },
          data: {
            invoiceUrl: invoiceUrl,
          },
        });

        if (result.orderId) {
          await db.orders.update({
            where: { orderId: result.orderId },
            data: {
              total: result.totalAmount,
            },
          });
        }

        console.log(`Invoice uploaded to Firebase: ${invoiceUrl}`);
      } catch (error) {
        console.error(
          "Error generating or uploading invoice to Firebase:",
          error
        );
        // Don't fail the entire transaction if PDF generation fails
      }
    }

    return result;
  } catch (error) {
    console.error("Error updating online sale with wallet and cart:", error);
    throw error;
  }
};

export const checkWalletBalanceForNewProducts = async (
  userId: string,
  newProducts: any[]
): Promise<{
  hasSufficientBalance: boolean;
  requiredAmount: number;
  currentBalance: number;
}> => {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return {
        hasSufficientBalance: false,
        requiredAmount: 0,
        currentBalance: 0,
      };
    }

    const requiredAmount = newProducts.reduce(
      (sum: number, product: any) =>
        sum + (product.sellingPrice || 0) * (product.quantity || 1),
      0
    );

    const hasSufficientBalance = user.balance >= requiredAmount;

    return {
      hasSufficientBalance,
      requiredAmount,
      currentBalance: user.balance || 0,
    };
  } catch (error) {
    console.error("Error checking wallet balance:", error);
    return {
      hasSufficientBalance: false,
      requiredAmount: 0,
      currentBalance: 0,
    };
  }
};

export const calculateUpdatedTotal = async (
  saleId: string,
  updatedItems: any[],
  newProducts: any[],
  removedItems: string[]
): Promise<{
  finalTotal: number;
  breakdown: any;
  newProductsAmount: number;
}> => {
  try {
    const currentSale = await db.onlineSellBatch.findUnique({
      where: { id: saleId },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
      },
    });

    if (!currentSale) {
      throw new Error("Online sale not found");
    }

    // Calculate new total from updated items
    const updatedTotal = updatedItems.reduce(
      (sum: number, item: any) =>
        sum + (item.sellingPrice || 0) * (item.quantity || 1),
      0
    );

    // Calculate new total from new products (this is what will be deducted from wallet)
    const newProductsTotal = newProducts.reduce(
      (sum: number, product: any) =>
        sum + (product.sellingPrice || 0) * (product.quantity || 1),
      0
    );

    // Calculate total for items that will remain unchanged
    const unchangedItems = currentSale.sales.filter(
      (sale) =>
        !updatedItems.find((item: any) => item.id === sale.id) &&
        !removedItems.includes(sale.id)
    );
    const unchangedTotal = unchangedItems.reduce(
      (sum: number, sale: any) =>
        sum + (sale.selledPrice || 0) * (sale.quantity || 1),
      0
    );

    // Calculate final total
    const finalTotal = updatedTotal + newProductsTotal + unchangedTotal;

    return {
      finalTotal,
      newProductsAmount: newProductsTotal, // Amount that will be deducted from wallet
      breakdown: {
        updatedTotal,
        newProductsTotal,
        unchangedTotal,
        currentTotal: currentSale.totalAmount,
        amountToDeduct: newProductsTotal, // Clear indication of what will be deducted
      },
    };
  } catch (error) {
    console.error("Error calculating updated total:", error);
    throw error;
  }
};

export const updateCartProductsForOnlineSale = async (
  orderId: string,
  newProducts: any[],
  removedItems: string[],
  currentSaleItems: any[]
) => {
  try {
    const order = await db.orders.findUnique({
      where: { orderId },
      include: {
        cart: {
          include: {
            CartProduct: {
              include: {
                kurti: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // Remove cart products for removed items
    for (const removedItemId of removedItems) {
      const saleItem = currentSaleItems.find(
        (sale) => sale.id === removedItemId
      );
      if (saleItem) {
        await db.cartProduct.deleteMany({
          where: {
            cartId: order.cartId,
            kurtiId: saleItem.kurtiId,
          },
        });
      }
    }

    // Add cart products for new items
    for (const product of newProducts) {
      // Check if product already exists in cart
      const existingCartProduct = await db.cartProduct.findFirst({
        where: {
          cartId: order.cartId,
          kurtiId: product.kurtiId,
        },
      });

      if (!existingCartProduct) {
        await db.cartProduct.create({
          data: {
            kurtiId: product.kurtiId,
            cartId: order.cartId,
            sizes: [product.selectedSize],
            adminSideSizes: [product.selectedSize],
            scannedSizes: [product.selectedSize],
          },
        });
      } else {
        // Update existing cart product with new size if not already included
        const currentSizes = existingCartProduct.sizes as string[];
        if (!currentSizes.includes(product.selectedSize)) {
          await db.cartProduct.update({
            where: { id: existingCartProduct.id },
            data: {
              sizes: [...currentSizes, product.selectedSize],
              adminSideSizes: [...currentSizes, product.selectedSize],
              scannedSizes: [...currentSizes, product.selectedSize],
            },
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating cart products:", error);
    throw error;
  }
};

export const deductFromWalletForNewProducts = async (
  userId: string,
  newProducts: any[],
  saleId: string
): Promise<{ success: boolean; amountDeducted: number; error?: string }> => {
  try {
    if (newProducts.length === 0) {
      return { success: true, amountDeducted: 0 };
    }

    const totalAmount = newProducts.reduce(
      (sum: number, product: any) =>
        sum + (product.sellingPrice || 0) * (product.quantity || 1),
      0
    );

    if (totalAmount <= 0) {
      return { success: true, amountDeducted: 0 };
    }

    // Check current balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return { success: false, amountDeducted: 0, error: "User not found" };
    }

    if (user.balance < totalAmount) {
      return {
        success: false,
        amountDeducted: 0,
        error: `Insufficient balance. Required: ${totalAmount}, Available: ${user.balance}`,
      };
    }

    // Deduct from wallet
    await db.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: totalAmount,
        },
      },
    });

    // Create wallet history entry
    await db.walletHistory.create({
      data: {
        userId: userId,
        amount: totalAmount,
        type: "DEBIT",
        paymentMethod: "wallet",
        onlineSellBatchId: saleId,
      },
    });

    console.log(
      `Successfully deducted ${totalAmount} from wallet for user ${userId}`
    );
    return { success: true, amountDeducted: totalAmount };
  } catch (error) {
    console.error("Error deducting from wallet:", error);
    return {
      success: false,
      amountDeducted: 0,
      error:
        error instanceof Error ? error.message : "Failed to deduct from wallet",
    };
  }
};

export const completePendingOrderPayment = async (
  saleId: string,
  userId: string,
  newProducts: any[]
): Promise<{ success: boolean; amountDeducted: number; error?: string }> => {
  try {
    // Get the current sale to check if it's pending
    const currentSale = await db.onlineSellBatch.findUnique({
      where: { id: saleId },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
        order: {
          include: {
            shippingAddress: true,
          },
        },
      },
    });

    if (!currentSale) {
      return { success: false, amountDeducted: 0, error: "Sale not found" };
    }

    // If sale is already completed, no need to process
    if (currentSale.paymentStatus === "COMPLETED") {
      return { success: true, amountDeducted: 0 };
    }

    // Calculate total amount for new products
    const newProductsTotal = newProducts.reduce(
      (sum: number, product: any) =>
        sum + (product.sellingPrice || 0) * (product.quantity || 1),
      0
    );

    if (newProductsTotal <= 0) {
      return { success: true, amountDeducted: 0 };
    }

    // Check user balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      return { success: false, amountDeducted: 0, error: "User not found" };
    }

    if (user.balance < newProductsTotal) {
      return {
        success: false,
        amountDeducted: 0,
        error: `Insufficient balance. Required: ${newProductsTotal}, Available: ${user.balance}`,
      };
    }

    // Deduct from wallet
    await db.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: newProductsTotal,
        },
      },
    });

    // Create wallet history entry
    await db.walletHistory.create({
      data: {
        userId: userId,
        amount: newProductsTotal,
        type: "DEBIT",
        paymentMethod: "wallet",
        onlineSellBatchId: saleId,
      },
    });

    // Update sale status to COMPLETED
    await db.onlineSellBatch.update({
      where: { id: saleId },
      data: {
        paymentStatus: "COMPLETED",
      },
    });

    // Regenerate invoice with updated data
    try {
      // Delete old invoice from Firebase if it exists
      if (currentSale.invoiceUrl && currentSale.batchNumber) {
        await deleteInvoiceFromFirebase(currentSale.batchNumber);
      }

      // Prepare sold products data for invoice generation
      const soldProducts = currentSale.sales.map((sale) => ({
        kurti: sale.kurti,
        selledPrice: sale.selledPrice,
        quantity: sale.quantity || 1,
        kurtiSize: sale.kurtiSize,
        unitPrice: sale.selledPrice || 0,
      }));

      // Get shipping information from the order
      const shippingCharge = currentSale.order?.shippingCharge || 0;
      const trackingId = currentSale.order?.trackingId || "";

      // Generate PDF using the backend API
      const result = await generateInvoicePDF({
        saleData: currentSale,
        batchNumber: currentSale.batchNumber,
        customerName: currentSale.customerName,
        customerPhone: currentSale.customerPhone || "",
        selectedLocation: "", // No shop location for online sales
        billCreatedBy: currentSale.billCreatedBy,
        currentUser: { id: userId },
        soldProducts,
        totalAmount: currentSale.totalAmount,
        gstType: (currentSale.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
        invoiceNumber: currentSale.invoiceNumber?.toString() || "",
        sellType: currentSale.sellType,
        shippingCharge,
        trackingId
      });

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');

      // Upload PDF to Firebase
      const invoiceUrl = await uploadInvoicePDFToFirebase(
        pdfBuffer,
        currentSale.batchNumber
      );

      // Update sale with new invoice URL
      await db.onlineSellBatch.update({
        where: { id: saleId },
        data: {
          invoiceUrl: invoiceUrl,
        },
      });

      console.log(
        `Invoice regenerated and uploaded to Firebase: ${invoiceUrl}`
      );
    } catch (invoiceError) {
      console.error("Error regenerating invoice:", invoiceError);
      // Don't fail the payment completion if invoice regeneration fails
    }

    console.log(
      `Successfully completed pending order payment. Deducted ${newProductsTotal} from wallet for user ${userId}`
    );
    return { success: true, amountDeducted: newProductsTotal };
  } catch (error) {
    console.error("Error completing pending order payment:", error);
    return {
      success: false,
      amountDeducted: 0,
      error:
        error instanceof Error ? error.message : "Failed to complete payment",
    };
  }
};

// Function to regenerate invoice for an existing online sale
export const regenerateOnlineSaleInvoice = async (
  batchId: string,
  currentUser: any
) => {
  try {
    // Get the existing batch with all sales data and order information
    const existingBatch = await db.onlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        sales: {
          include: {
            kurti: true,
          },
        },
        order: {
          include: {
            shippingAddress: true,
          },
        },
      },
    });

    if (!existingBatch) {
      return { error: "Online sale batch not found" };
    }

    // Delete old invoice from Firebase if it exists
    if (existingBatch.invoiceUrl && existingBatch.batchNumber) {
      await deleteInvoiceFromFirebase(existingBatch.batchNumber);
    }

    // Prepare sold products data for invoice generation
    const soldProducts = existingBatch.sales.map((sale) => ({
      kurti: sale.kurti,
      selledPrice: sale.selledPrice,
      quantity: sale.quantity || 1,
      kurtiSize: sale.kurtiSize,
      unitPrice: sale.selledPrice || 0,
      totalPrice: sale.selledPrice ?? 0 * (sale.quantity || 1),
    }));
    console.log(
      "🚀 ~ regenerateOnlineSaleInvoice ~ soldProducts:",
      soldProducts
    );

    // Get shipping information from the order
    const shippingCharge = existingBatch.order?.shippingCharge || 0;
    const trackingId = existingBatch.order?.trackingId || "";

    // Generate PDF using the backend API
    const result = await generateInvoicePDF({
      saleData: existingBatch,
      batchNumber: existingBatch.batchNumber,
      customerName: existingBatch.customerName,
      customerPhone: existingBatch.customerPhone || "",
      selectedLocation: "", // No shop location for online sales
      billCreatedBy: existingBatch.billCreatedBy,
      currentUser,
      soldProducts,
      totalAmount: existingBatch.totalAmount,
      gstType: (existingBatch.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
      invoiceNumber: existingBatch.invoiceNumber?.toString() || "",
      sellType: existingBatch.sellType,
      shippingCharge,
      trackingId
    });

    if (!result.success || !result.pdfBase64) {
      throw new Error(result.error || "Failed to generate PDF");
    }

    const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');

    // Upload PDF to Firebase
    const invoiceUrl = await uploadInvoicePDFToFirebase(
      pdfBuffer,
      existingBatch.batchNumber
    );

    // Update batch with new invoice URL
    await db.onlineSellBatch.update({
      where: { id: batchId },
      data: {
        invoiceUrl: invoiceUrl,
      },
    });

    console.log(`Invoice regenerated and uploaded to Firebase: ${invoiceUrl}`);
    return { success: true, invoiceUrl };
  } catch (error) {
    console.error("Error regenerating online sale invoice:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to regenerate invoice 5",
    };
  }
};
