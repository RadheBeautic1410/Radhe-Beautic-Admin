"use server"

import { db } from "@/src/lib/db";

export interface OnlineSalesFilters {
  page?: number;
  limit?: number;
  search?: string;
  searchType?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  userRole?: string;
}

export interface OnlineSalesResult {
  sales: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const getOnlineSales = async (filters: OnlineSalesFilters): Promise<OnlineSalesResult> => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      searchType = "customerName",
      startDate = "",
      endDate = "",
      userId,
      userRole
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

    // Add search filters
    if (search.trim()) {
      const searchTerm = search.trim();
      
      switch (searchType) {
        case 'customerName':
          whereClause.customerName = {
            contains: searchTerm,
            mode: 'insensitive'
          };
          break;
        case 'customerPhone':
          whereClause.customerPhone = {
            contains: searchTerm,
            mode: 'insensitive'
          };
          break;
        case 'invoiceNumber':
          whereClause.invoiceNumber = parseInt(searchTerm) || 0;
          break;
        case 'orderId':
          whereClause.orderId = {
            contains: searchTerm,
            mode: 'insensitive'
          };
          break;
        case 'amount':
          whereClause.totalAmount = parseInt(searchTerm) || 0;
          break;
        default:
          whereClause.customerName = {
            contains: searchTerm,
            mode: 'insensitive'
          };
      }
    }

    // Get total count
    const total = await db.onlineSellBatch.count({
      where: whereClause
    });

    // Get sales data with pagination
    const sales = await db.onlineSellBatch.findMany({
      where: whereClause,
      include: {
        sales: {
          include: {
            kurti: true
          }
        },
        order: true
      },
      orderBy: {
        saleTime: 'desc'
      },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return {
      sales,
      total,
      totalPages,
      currentPage: page
    };

  } catch (error) {
    console.error('Error fetching online sales:', error);
    throw new Error('Failed to fetch online sales');
  }
};

export const getOnlineSaleById = async (id: string) => {
  try {
    const sale = await db.onlineSellBatch.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            kurti: true
          }
        },
        order: true
      }
    });

    if (!sale) {
      throw new Error('Online sale not found');
    }

    return sale;
  } catch (error) {
    console.error('Error fetching online sale by ID:', error);
    throw error;
  }
};

export const updateOnlineSale = async (id: string, updateData: any) => {
  try {
    const {
      customerName,
      customerPhone,
      billCreatedBy,
      paymentType,
      gstType,
      sellType,
      newProducts = [],
      updatedItems = [],
      removedItems = []
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
          paymentType,
          gstType,
          sellType
        }
      });

      // Remove items if any
      if (removedItems.length > 0) {
        await tx.onlineSell.deleteMany({
          where: {
            id: { in: removedItems }
          }
        });
      }

      // Update existing items if any
      for (const item of updatedItems) {
        await tx.onlineSell.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            selledPrice: item.sellingPrice
          }
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
              sellTime: new Date()
            }
          });
        }
      }

      // Return the updated sale with all sales items
      return await tx.onlineSellBatch.findUnique({
        where: { id },
        include: {
          sales: {
            include: {
              kurti: true
            }
          },
          order: true
        }
      });
    });

    return result;
  } catch (error) {
    console.error('Error updating online sale:', error);
    throw error;
  }
};
