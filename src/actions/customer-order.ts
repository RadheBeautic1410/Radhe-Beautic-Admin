"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// Get all customer orders (with optional filters and pagination)
export const getPendingCustomerOrders = async (
  statusFilter?: OrderStatus | "ALL",
  orderIdFilter?: string,
  phoneFilter?: string,
  page: number = 1,
  pageSize: number = 20
) => {
  try {
    const curUser = await currentUser();
    if (!curUser) {
      return { error: "Unauthorized" };
    }

    // Build where clause based on filters
    const whereClause: any = {};
    
    // Status filter
    if (statusFilter && statusFilter !== "ALL") {
      whereClause.status = statusFilter;
    } else if (!statusFilter) {
      // Default: show PENDING and TRACKINGPENDING if no filter specified
      whereClause.status = {
        in: [OrderStatus.PENDING, OrderStatus.TRACKINGPENDING],
      };
    }
    // If statusFilter is "ALL", don't add status filter (show all orders)

    // Order ID filter
    if (orderIdFilter && orderIdFilter.trim()) {
      whereClause.orderId = {
        contains: orderIdFilter.trim(),
      };
    }

    // Phone number filter
    if (phoneFilter && phoneFilter.trim()) {
      whereClause.user = {
        phoneNumber: {
          contains: phoneFilter.trim(),
        },
      };
    }

    // Calculate skip and take for pagination
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Get total count and orders in parallel
    const [total, orders] = await Promise.all([
      db.customerOrder.count({ where: whereClause }),
      db.customerOrder.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              email: true,
            },
          },
          shippingAddress: true,
          cart: {
            include: {
              CartProduct: {
                include: {
                  kurti: {
                    include: {
                      prices: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      success: true,
      data: orders,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        pageSize,
      },
    };
  } catch (error: any) {
    console.error("Error fetching pending customer orders:", error);
    return {
      error: error.message || "Failed to fetch pending orders",
    };
  }
};

// Accept a customer order (change status from PENDING to PROCESSING)
export const acceptCustomerOrder = async (
  orderId: string,
  paymentData?: {
    paymentStatus?: PaymentStatus;
    paymentType?: string;
    note?: string;
  }
) => {
  try {
    const curUser = await currentUser();
    if (!curUser) {
      return { error: "Unauthorized" };
    }

    // Check if order exists and is pending
    const existingOrder = await db.customerOrder.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!existingOrder) {
      return { error: "Order not found" };
    }

    if (existingOrder.status !== OrderStatus.PENDING) {
      return { error: `Order is already ${existingOrder.status}` };
    }

    // Prepare update data - Set status to TRACKINGPENDING after accepting with payment
    const updateData: any = {
      status: OrderStatus.TRACKINGPENDING,
    };

    // Add payment information if provided
    if (paymentData) {
      if (paymentData.paymentStatus) {
        updateData.paymentStatus = paymentData.paymentStatus;
      }
      if (paymentData.paymentType) {
        updateData.paymentType = paymentData.paymentType;
      }
      if (paymentData.note !== undefined) {
        updateData.note = paymentData.note || null;
      }
    }

    // Update order status to PROCESSING
    const updatedOrder = await db.customerOrder.update({
      where: {
        id: orderId,
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
        shippingAddress: true,
        cart: {
          include: {
            CartProduct: {
              include: {
                kurti: {
                  include: {
                    prices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: updatedOrder,
      message: "Order accepted successfully",
    };
  } catch (error: any) {
    console.error("Error accepting customer order:", error);
    return {
      error: error.message || "Failed to accept order",
    };
  }
};

// Update order tracking information (courier and tracking ID)
export const updateOrderTracking = async (
  orderId: string,
  trackingData: {
    courier?: string;
    trackingId?: string;
  }
) => {
  try {
    const curUser = await currentUser();
    if (!curUser) {
      return { error: "Unauthorized" };
    }

    // Check if order exists
    const existingOrder = await db.customerOrder.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!existingOrder) {
      return { error: "Order not found" };
    }

    // Prepare update data
    const updateData: any = {};
    if (trackingData.courier !== undefined) {
      updateData.courier = trackingData.courier || null;
    }
    if (trackingData.trackingId !== undefined) {
      updateData.trackingId = trackingData.trackingId || null;
      // Update status to SHIPPED when tracking ID is added (from TRACKINGPENDING or PROCESSING)
      if (trackingData.trackingId && (existingOrder.status === OrderStatus.TRACKINGPENDING || existingOrder.status === OrderStatus.PROCESSING)) {
        updateData.status = OrderStatus.SHIPPED;
      }
    }

    // Update order tracking information
    const updatedOrder = await db.customerOrder.update({
      where: {
        id: orderId,
      },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
        shippingAddress: true,
        cart: {
          include: {
            CartProduct: {
              include: {
                kurti: {
                  include: {
                    prices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: updatedOrder,
      message: "Tracking information updated successfully",
    };
  } catch (error: any) {
    console.error("Error updating order tracking:", error);
    return {
      error: error.message || "Failed to update tracking information",
    };
  }
};

// Get a single customer order by ID with full details
export const getCustomerOrderById = async (orderId: string) => {
  try {
    const curUser = await currentUser();
    if (!curUser) {
      return { error: "Unauthorized" };
    }

    const order = await db.customerOrder.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            email: true,
          },
        },
        shippingAddress: true,
        cart: {
          include: {
            CartProduct: {
              include: {
                kurti: {
                  include: {
                    prices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { error: "Order not found" };
    }

    return {
      success: true,
      data: order,
    };
  } catch (error: any) {
    console.error("Error fetching customer order:", error);
    return {
      error: error.message || "Failed to fetch order",
    };
  }
};

