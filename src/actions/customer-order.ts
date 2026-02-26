"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { OrderStatus, PaymentStatus } from "@prisma/client";

// Helper type for size quantity objects
type SizeQuantity = { [size: string]: number };

// Helper function to convert size array to object
const getSizeObjectFromArray = (array: any[]): SizeQuantity => {
  let obj: SizeQuantity = {};
  for (let i = 0; i < (array.length || 0); i++) {
    if (array[i]?.size) {
      obj[array[i].size] = (obj[array[i].size] || 0) + (array[i].quantity || 0);
    }
  }
  return obj;
};

// Helper function to update size quantities in array
const updateSizeQuantity = (sizes: any[], size: string, change: number): any[] => {
  const updatedSizes = [...sizes];
  const existingSizeIndex = updatedSizes.findIndex((s: any) => s.size === size);
  
  if (existingSizeIndex !== -1) {
    // Size exists, update quantity
    const existingSize = updatedSizes[existingSizeIndex] as any;
    existingSize.quantity += change;
    
    if (existingSize.quantity === 0) {
      // Remove size if quantity becomes 0
      return updatedSizes.filter((s: any) => s.size !== size);
    } else if (existingSize.quantity < 0) {
      throw new Error(`Size-${size} is not available (quantity would go negative)`);
    }
  } else if (change > 0) {
    // Size doesn't exist, add new size entry (only if adding)
    updatedSizes.push({ size, quantity: change });
  } else if (change < 0) {
    // Size doesn't exist but trying to deduct - this is an error
    throw new Error(`Size-${size} not found for quantity deduction`);
  }
  
  return updatedSizes;
};

// Helper function to safely update reserved sizes (doesn't throw error if size doesn't exist)
const updateReservedSizeQuantity = (sizes: any[], size: string, change: number): any[] => {
  const updatedSizes = [...sizes];
  const existingSizeIndex = updatedSizes.findIndex((s: any) => s.size === size);
  
  if (existingSizeIndex !== -1) {
    // Size exists, update quantity
    const existingSize = updatedSizes[existingSizeIndex] as any;
    existingSize.quantity += change;
    
    if (existingSize.quantity === 0) {
      // Remove size if quantity becomes 0
      return updatedSizes.filter((s: any) => s.size !== size);
    } else if (existingSize.quantity < 0) {
      // If quantity goes negative, set to 0 (don't throw error)
      existingSize.quantity = 0;
      return updatedSizes.filter((s: any) => s.size !== size);
    }
  } else if (change > 0) {
    // Size doesn't exist, add new size entry (only if adding)
    updatedSizes.push({ size, quantity: change });
  }
  // If size doesn't exist and we're trying to deduct, just return unchanged (don't throw error)
  
  return updatedSizes;
};

// Helper function to get current time
const getCurrTime = (): Date => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  return new Date(currentTime.getTime() + ISTOffset);
};

// Helper function to release reserved quantities from kurti
const releaseReservedQuantities = async (
  cartProducts: Array<{
    kurti: { code: string };
    adminSideSizes: any[];
  }>
) => {
  // Group by kurti code to handle multiple cart products for same kurti
  const kurtiMap = new Map<string, SizeQuantity>();
  
  for (const cartProduct of cartProducts) {
    const code = cartProduct.kurti.code;
    const adminSizes = getSizeObjectFromArray(cartProduct.adminSideSizes || []);
    
    if (!kurtiMap.has(code)) {
      kurtiMap.set(code, {});
    }
    
    const existing = kurtiMap.get(code)!;
    for (const size in adminSizes) {
      existing[size] = (existing[size] || 0) + adminSizes[size];
    }
  }
  
  // Update each kurti's reservedSizes
  for (const [code, sizesToRelease] of kurtiMap.entries()) {
    const kurti = await db.kurti.findUnique({
      where: { code },
      select: { id: true, reservedSizes: true },
    });
    
    if (!kurti) {
      console.warn(`Kurti not found for code: ${code}`);
      continue;
    }
    
    const currentReserved = getSizeObjectFromArray(kurti.reservedSizes || []);
    
    // Subtract released quantities
    for (const size in sizesToRelease) {
      currentReserved[size] = (currentReserved[size] || 0) - sizesToRelease[size];
      if (currentReserved[size] < 0) {
        console.warn(`Warning: Reserved quantity for ${code}-${size} went negative, setting to 0`);
        currentReserved[size] = 0;
      }
    }
    
    // Convert back to array format
    const finalArray: any[] = [];
    for (const [size, quantity] of Object.entries(currentReserved)) {
      if (quantity > 0) {
        finalArray.push({ size, quantity });
      }
    }
    
    // Update kurti
    await db.kurti.update({
      where: { code },
      data: {
        reservedSizes: finalArray,
        lastUpdatedTime: getCurrTime(),
      },
    });
  }
};

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

    // Get cart products with adminSideSizes to release reserved quantities
    const orderWithCart = await db.customerOrder.findUnique({
      where: { id: orderId },
      include: {
        cart: {
          include: {
            CartProduct: {
              select: {
                id: true,
                adminSideSizes: true,
                kurti: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!orderWithCart) {
      return { error: "Order not found" };
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Release reserved quantities from kurti reservedSizes
      const cartProducts = orderWithCart.cart.CartProduct;
      if (cartProducts && cartProducts.length > 0) {
        // Group by kurti code to handle multiple cart products for same kurti
        const kurtiMap = new Map<string, SizeQuantity>();
        
        for (const cartProduct of cartProducts) {
          const code = cartProduct.kurti.code;
          const adminSizes = getSizeObjectFromArray(cartProduct.adminSideSizes || []);
          
          if (!kurtiMap.has(code)) {
            kurtiMap.set(code, {});
          }
          
          const existing = kurtiMap.get(code)!;
          for (const size in adminSizes) {
            existing[size] = (existing[size] || 0) + adminSizes[size];
          }
        }
        
        // Update each kurti's sizes and reservedSizes
        for (const [code, sizesToDeduct] of kurtiMap.entries()) {
          const kurti = await tx.kurti.findUnique({
            where: { code },
            select: { id: true, sizes: true, reservedSizes: true, countOfPiece: true },
          });
          
          if (!kurti) {
            console.warn(`Kurti not found for code: ${code}`);
            continue;
          }
          
          // Deduct from actual sizes (stock) and reservedSizes
          let updatedSizes = [...(kurti.sizes || [])];
          let updatedReservedSizes = [...(kurti.reservedSizes || [])];
          
          // Calculate total quantity to deduct for countOfPiece
          let totalQuantityDeducted = 0;
          
          for (const size in sizesToDeduct) {
            const quantity = sizesToDeduct[size];
            
            // First, check if size is available in actual stock (sizes)
            const sizeInStock = updatedSizes.find((s: any) => s.size === size);
            const availableInStock = sizeInStock ? sizeInStock?.quantity : 0;
            
            if (availableInStock < quantity) {
              // Not enough in actual stock - throw error
              throw new Error(`Size-${size} is not available (only ${availableInStock} available, need ${quantity})`);
            }
            
            totalQuantityDeducted += quantity;
            
            // Deduct from actual sizes (stock) - this will throw error if not available
            updatedSizes = updateSizeQuantity(updatedSizes, size, -quantity);
            
            // Deduct from reservedSizes (release reserved quantities) - safe function that doesn't throw if size doesn't exist
            updatedReservedSizes = updateReservedSizeQuantity(updatedReservedSizes, size, -quantity);
          }
          
          // Update kurti with deducted quantities
          await tx.kurti.update({
            where: { code },
            data: {
              sizes: updatedSizes as any,
              reservedSizes: updatedReservedSizes as any,
              countOfPiece: Math.max(0, (kurti.countOfPiece || 0) - totalQuantityDeducted),
              lastUpdatedTime: getCurrTime(),
            },
          });
        }
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

      // Update order status (minimal include to reduce transaction time)
      const updatedOrder = await tx.customerOrder.update({
        where: {
          id: orderId,
        },
        data: updateData,
        select: {
          id: true,
        },
      });

      return updatedOrder;
    }, {
      maxWait: 20000, // Maximum time to wait for a transaction slot (20 seconds)
      timeout: 20000, // Maximum time the transaction can run (20 seconds)
    });

    // Fetch the full order data after transaction completes (to avoid heavy includes in transaction)
    const fullOrder = await db.customerOrder.findUnique({
      where: { id: orderId },
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
      data: fullOrder || result,
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

// Cancel/Reject a customer order and release reserved quantities
export const cancelCustomerOrder = async (orderId: string) => {
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
      include: {
        cart: {
          include: {
            CartProduct: {
              select: {
                id: true,
                adminSideSizes: true,
                kurti: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      return { error: "Order not found" };
    }

    // Only allow cancelling orders that are not already cancelled or delivered
    if (existingOrder.status === OrderStatus.CANCELLED) {
      return { error: "Order is already cancelled" };
    }

    if (existingOrder.status === OrderStatus.DELIVERED) {
      return { error: "Cannot cancel a delivered order" };
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Release reserved quantities from kurti reservedSizes
      const cartProducts = existingOrder.cart.CartProduct;
      if (cartProducts && cartProducts.length > 0) {
        // Group by kurti code to handle multiple cart products for same kurti
        const kurtiMap = new Map<string, SizeQuantity>();
        
        for (const cartProduct of cartProducts) {
          const code = cartProduct.kurti.code;
          const adminSizes = getSizeObjectFromArray(cartProduct.adminSideSizes || []);
          
          if (!kurtiMap.has(code)) {
            kurtiMap.set(code, {});
          }
          
          const existing = kurtiMap.get(code)!;
          for (const size in adminSizes) {
            existing[size] = (existing[size] || 0) + adminSizes[size];
          }
        }
        
        // Update each kurti's reservedSizes
        for (const [code, sizesToRelease] of kurtiMap.entries()) {
          const kurti = await tx.kurti.findUnique({
            where: { code },
            select: { id: true, reservedSizes: true },
          });
          
          if (!kurti) {
            console.warn(`Kurti not found for code: ${code}`);
            continue;
          }
          
          const currentReserved = getSizeObjectFromArray(kurti.reservedSizes || []);
          
          // Subtract released quantities
          for (const size in sizesToRelease) {
            currentReserved[size] = (currentReserved[size] || 0) - sizesToRelease[size];
            if (currentReserved[size] < 0) {
              console.warn(`Warning: Reserved quantity for ${code}-${size} went negative, setting to 0`);
              currentReserved[size] = 0;
            }
          }
          
          // Convert back to array format
          const finalArray: any[] = [];
          for (const [size, quantity] of Object.entries(currentReserved)) {
            if (quantity > 0) {
              finalArray.push({ size, quantity });
            }
          }
          
          // Update kurti
          await tx.kurti.update({
            where: { code },
            data: {
              reservedSizes: finalArray,
              lastUpdatedTime: getCurrTime(),
            },
          });
        }
      }

      // Update order status to CANCELLED
      const updatedOrder = await tx.customerOrder.update({
        where: {
          id: orderId,
        },
        data: {
          status: OrderStatus.CANCELLED,
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

      return updatedOrder;
    });

    return {
      success: true,
      data: result,
      message: "Order cancelled successfully",
    };
  } catch (error: any) {
    console.error("Error cancelling customer order:", error);
    return {
      error: error.message || "Failed to cancel order",
    };
  }
};

