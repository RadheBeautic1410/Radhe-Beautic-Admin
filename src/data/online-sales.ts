"use server";

import { db } from "@/src/lib/db";
import { generateInvoicePDF } from "@/src/actions/generate-pdf";
import { uploadInvoicePDFToFirebase, deleteInvoiceFromFirebase } from "@/src/lib/firebase/firebase";
import { generatePDFFromHTML } from "@/src/lib/puppeteer";
import { generateInvoiceHTML } from "@/src/lib/utils";

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
        order: true,
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
  updateData: any,
  currentUser: any
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

        // Calculate final total
        const finalTotal = updatedTotal + newProductsTotal + unchangedTotal;

        // Check if user has sufficient balance for new products
        let hasSufficientBalance = true;
        let finalPaymentStatus = paymentStatus;

        if (newProductsTotal > 0 && currentUser) {
          const user = await tx.user.findUnique({
            where: { id: currentUser.id },
            select: { balance: true },
          });

          console.log(
            `User balance check: User ID: ${currentUser.id}, Balance: ${user?.balance}, Required: ${newProductsTotal}`
          );

          if (!user || user.balance < newProductsTotal) {
            hasSufficientBalance = false;
            finalPaymentStatus = "PENDING";
            console.log(
              `Insufficient balance. User balance: ${user?.balance}, Required: ${newProductsTotal}`
            );
          } else {
            // If balance is sufficient and current status is PENDING, update to COMPLETED
            if (currentSale.paymentStatus === "PENDING") {
              finalPaymentStatus = "COMPLETED";
              console.log(
                `Updating status from PENDING to COMPLETED for user ${currentUser.id}`
              );
            }
            console.log(
              `Sufficient balance. Will deduct ${newProductsTotal} from wallet.`
            );
          }
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
        const newSaleItems = [];
        if (newProducts.length > 0) {
          for (const product of newProducts) {
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

          // Deduct from wallet if balance is sufficient and new products were added
          if (hasSufficientBalance && currentUser && newProductsTotal > 0) {
            console.log(
              `Deducting ${newProductsTotal} from wallet for user ${currentUser.id}`
            );

            // Deduct from wallet within the transaction
            await tx.user.update({
              where: { id: currentUser.id },
              data: {
                balance: {
                  decrement: newProductsTotal,
                },
              },
            });

            // Create wallet history entry within the transaction
            await tx.walletHistory.create({
              data: {
                userId: currentUser.id,
                amount: newProductsTotal,
                type: "DEBIT",
                paymentMethod: "wallet",
                onlineSellBatchId: id,
              },
            });

            console.log(
              `Successfully deducted ${newProductsTotal} from wallet`
            );

            // Verify the deduction by checking updated balance
            const updatedUser = await tx.user.findUnique({
              where: { id: currentUser.id },
              select: { balance: true },
            });
            console.log(`Updated user balance: ${updatedUser?.balance}`);

            // If deduction was successful and status was PENDING, update to COMPLETED
            if (currentSale.paymentStatus === "PENDING") {
              await tx.onlineSellBatch.update({
                where: { id },
                data: {
                  paymentStatus: "COMPLETED",
                },
              });
              console.log(`Updated payment status to COMPLETED for sale ${id}`);
            }
          }
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
        }));

        // Generate invoice HTML
        const invoiceHTML = generateInvoiceHTML(
          result,
          result.batchNumber,
          result.customerName,
          result.customerPhone || "",
          "", // No shop location for online sales
          result.billCreatedBy,
          currentUser,
          soldProducts,
          result.totalAmount,
          (result.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
          result.invoiceNumber?.toString() || "",
          result.sellType
        );

        // Generate PDF from HTML
        const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

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

        console.log(`Invoice uploaded to Firebase: ${invoiceUrl}`);
      } catch (error) {
        console.error("Error generating or uploading invoice to Firebase:", error);
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

      // Generate invoice HTML
      const invoiceHTML = generateInvoiceHTML(
        currentSale,
        currentSale.batchNumber,
        currentSale.customerName,
        currentSale.customerPhone || "",
        "", // No shop location for online sales
        currentSale.billCreatedBy,
        { id: userId }, // currentUser
        soldProducts,
        currentSale.totalAmount,
        (currentSale.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
        currentSale.invoiceNumber?.toString() || "",
        currentSale.sellType
      );

      // Generate PDF from HTML
      const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

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

      console.log(`Invoice regenerated and uploaded to Firebase: ${invoiceUrl}`);
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
    // Get the existing batch with all sales data
    const existingBatch = await db.onlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        sales: {
          include: {
            kurti: true,
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
    }));

    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(
      existingBatch,
      existingBatch.batchNumber,
      existingBatch.customerName,
      existingBatch.customerPhone || "",
      "", // No shop location for online sales
      existingBatch.billCreatedBy,
      currentUser,
      soldProducts,
      existingBatch.totalAmount,
      (existingBatch.gstType as "IGST" | "SGST_CGST") || "SGST_CGST",
      existingBatch.invoiceNumber?.toString() || "",
      existingBatch.sellType
    );

    // Generate PDF from HTML
    const pdfBuffer = await generatePDFFromHTML(invoiceHTML);

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
      error: error instanceof Error ? error.message : "Failed to regenerate invoice",
    };
  }
};
