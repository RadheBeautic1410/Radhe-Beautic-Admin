"use server"

import { db } from "@/src/lib/db";

export interface OfflineSalesFilters {
  page?: number;
  limit?: number;
  shopId?: string;
  search?: string;
  searchType?: string;
  userId?: string;
  userRole?: string;
}

export interface OfflineSalesResult {
  sales: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export const getOfflineSales = async (filters: OfflineSalesFilters): Promise<OfflineSalesResult> => {
  try {
    const {
      page = 1,
      limit = 20,
      shopId = "",
      search = "",
      searchType = "customerName",
      userId,
      userRole
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause based on user role and shop filter
    let whereClause: any = {};
    
    // If admin and shopId is provided (and not "all"), filter by that shop
    if (userRole === 'ADMIN' && shopId && shopId !== 'all') {
      whereClause.shopId = shopId;
    }
    // If not admin, only show sales from user's shop
    else if (userRole !== 'ADMIN' && userId) {
      const userShop = await db.user.findUnique({
        where: { id: userId },
        include: { shop: true }
      });
      
      if (userShop?.shop?.id) {
        whereClause.shopId = userShop.shop.id;
      } else {
        // User has no shop, return empty results
        return {
          sales: [],
          total: 0,
          totalPages: 0,
          currentPage: page
        };
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
        case 'shopName':
          whereClause.shop = {
            shopName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          };
          break;
        case 'amount':
          const amount = parseInt(searchTerm);
          if (!isNaN(amount)) {
            whereClause.totalAmount = +amount;
          }
          break;
      }
    }

    // Get total count for pagination
    const total = await db.offlineSellBatch.count({
      where: whereClause
    });

    // Get sales data with pagination
    const sales = await db.offlineSellBatch.findMany({
      where: whereClause,
      include: {
        shop: true,
        sales: {
          include: {
            kurti: true
          }
        }
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
    console.error('Error fetching offline sales:', error);
    throw new Error('Failed to fetch offline sales');
  }
};

export const getOfflineSaleById = async (batchId: string) => {
  try {
    const sale = await db.offlineSellBatch.findUnique({
      where: { id: batchId },
      include: {
        shop: true,
        sales: {
          include: {
            kurti: true
          }
        }
      }
    });

    return sale;
  } catch (error) {
    console.error('Error fetching offline sale by ID:', error);
    throw new Error('Failed to fetch offline sale');
  }
};

export const getOfflineSalesStats = async (userId?: string, userRole?: string) => {
  try {
    let whereClause: any = {};
    
    if (userRole !== 'ADMIN' && userId) {
      const userShop = await db.user.findUnique({
        where: { id: userId },
        include: { shop: true }
      });
      
      if (userShop?.shop?.id) {
        whereClause.shopId = userShop.shop.id;
      }
    }

    const totalSales = await db.offlineSellBatch.count({
      where: whereClause
    });

    const totalAmount = await db.offlineSellBatch.aggregate({
      where: whereClause,
      _sum: {
        totalAmount: true
      }
    });

    const totalItems = await db.offlineSellBatch.aggregate({
      where: whereClause,
      _sum: {
        totalItems: true
      }
    });

    return {
      totalSales,
      totalAmount: totalAmount._sum.totalAmount || 0,
      totalItems: totalItems._sum.totalItems || 0
    };
  } catch (error) {
    console.error('Error fetching offline sales stats:', error);
    throw new Error('Failed to fetch offline sales statistics');
  }
}; 