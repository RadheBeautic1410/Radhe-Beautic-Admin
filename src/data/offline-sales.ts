
import { db } from "@/src/lib/db";

export interface OfflineSalesFilters {
  page?: number;
  limit?: number;
  shopId?: string;
  search?: string;
  searchType?: string;
  startDate?: string;
  endDate?: string;
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
      startDate = "",
      endDate = "",
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
          const invoiceNum = parseInt(searchTerm);
          if (!isNaN(invoiceNum)) {
            whereClause.invoiceNumber = invoiceNum;
          }
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

export const getOfflineSalesReport = async (
  filters: OfflineSalesFilters
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      searchType = "customerName",
      startDate = "",
      endDate = "",
      // paymentStatus = "",
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
    // if (paymentStatus && paymentStatus !== "all") {
    //   whereClause.paymentStatus = paymentStatus.toUpperCase() as any;
    // }

    // 🔍 Search filters
    if (search.trim()) {
      const searchTerm = search.trim();
      switch (searchType) {
        case "customerName":
          whereClause.customerName = { contains: searchTerm, mode: "insensitive" };
          break;
        case "customerPhone":
          whereClause.customerPhone = { contains: searchTerm, mode: "insensitive" };
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
    const total = await db.offlineSellBatch.count({ where: whereClause });

    // 📦 Fetch sales
    const batches = await db.offlineSellBatch.findMany({
      where: whereClause,
      include: {
        sales: {
          include: {
            kurti: true, // brings sellingPrice
          },
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
        const difference = selledPrice - sellingPrice;

        return {
          kurtiCode: s.kurti.code,
          sellingPrice,
          selledPrice,
          difference,
          // shopLocation: batch.order?.address?.location ?? "N/A",
        };
      })
    );

    // 💰 Total profit (across all offline batches)
    const allSales = await db.offlineSellBatch.findMany({
      include: {
        sales: { include: { kurti: true } },
      },
    });

    const totalProfit = allSales.reduce((sum, batch) => {
      return (
        sum +
        batch.sales.reduce((sSum, s) => {
          const sellingPrice = parseFloat(s.kurti.sellingPrice);
          const selledPrice = s.selledPrice ?? 0;
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
    console.error("Error generating offline sales report:", error);
    throw new Error("Failed to generate report");
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


