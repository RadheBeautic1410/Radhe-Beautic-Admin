"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { UserRole } from "@prisma/client";
import axios from "axios";
import {
  Loader2,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { shippedOrder } from "@/src/actions/order";
import { getShopList, getUserShop } from "@/src/actions/shop";
import { useEffect } from "react";
import { useParams } from "next/navigation";

const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

interface CartItem {
  id: string;
  kurti: any;
  selectedSize: string; // This will be the actual size for stock deduction
  orderedSize?: string; // The lower size that customer ordered (for PDF display)
  quantity: number;
  sellingPrice: number;
  availableStock: number;
  isLowerSize?: boolean; // Flag to indicate if this is a lower size replacement
}
type GSTType = "IGST" | "SGST_CGST";
function SellPage() {
  const params = useParams();

  const { id: orderId } = params;

  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [gstType, setGstType] = useState<GSTType>("SGST_CGST");
  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  // Payment type removed - now handled automatically through wallet

  // Current product selection
  const [selectedSize, setSelectedSize] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Order data state
  const [orderData, setOrderData] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [trackingId, setTrackingId] = useState("");

  const currentUser = useCurrentUser();
  const [selectedCourier, setSelectedCourier] = useState<string>("indianpost");
  const courierServices = [
    {
      key: "indianpost",
      value: "Indian Post",
    },
    {
      key: "dtdc",
      value: "Dtdc",
    },
    {
      key: "delivery",
      value: "Delivery",
    },
    {
      key: "tirupati",
      value: "Tirupati",
    },
        {
      key: "shreeMahavir",
      value: "Shree Mahavir",
    },
  ];
  // Fetch order data function
  const fetchOrderData = async () => {
    if (!orderId) return;

    try {
      setOrderLoading(true);
      // Try to fetch order with different statuses
      const statuses = [
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "TRACKINGPENDING",
        "DELIVERED",
      ];
      let orderFound = false;

      for (const status of statuses) {
        try {
          const response = await axios.post("/api/orders/getOrderById", {
            orderId: orderId,
            status: status,
          });

          if (response.data.success && response.data.data) {
            setOrderData(response.data.data);
            populateFormWithOrderData(response.data.data);
            orderFound = true;
            break;
          }
        } catch (error) {
          console.log(`Order not found with status: ${status}`);
        }
      }

      if (!orderFound) {
        setOrderData(null);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Failed to fetch order details");
      setOrderData(null);
    } finally {
      setOrderLoading(false);
    }
  };

  // Fetch order data when component mounts
  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  // Fetch user balance when order data is available
  useEffect(() => {
    if (orderData?.user?.id) {
      fetchUserBalance(orderData.user.id);
    }
  }, [orderData]);

  const fetchUserBalance = async (userId: string) => {
    try {
      const response = await axios.post("/api/wallet/get-balance", { userId });
      if (response.data.success) {
        setUserBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error("Error fetching user balance:", error);
    }
  };

  // Populate form fields with order data
  const populateFormWithOrderData = (order: any) => {
    if (!order) return;

    // Set customer details
    if (order.user?.name) setCustomerName(order.user.name);
    if (order.user?.phoneNumber) setCustomerPhone(order.user.phoneNumber);

    // Set bill created by (you might want to set this to current user or leave empty)
    if (currentUser?.name) setBillCreatedBy(currentUser.name);

    // Payment type is now handled automatically through wallet

    // Populate cart with order items
    if (order.cart?.CartProduct) {
      const orderItems: CartItem[] = order.cart.CartProduct.map(
        (cartProduct: any) => {
          const kurti = cartProduct.kurti;

          // Get sizes from the cart product (these are the sizes that were ordered)
          const orderedSizes = cartProduct.sizes || [];

          // Create cart items for each ordered size
          const items: CartItem[] = [];

          orderedSizes.forEach((sizeInfo: any) => {
            if (sizeInfo.quantity > 0) {
              // Check if this is a lower size replacement
              if (sizeInfo.isLowerSize && sizeInfo.actualSize) {
                // For lower sizes, use actualSize for stock deduction
                const actualSizeStock = kurti.sizes?.find(
                  (sz: any) => sz.size === sizeInfo.actualSize
                );

                if (actualSizeStock && actualSizeStock.quantity > 0) {
                  items.push({
                    id: `${kurti.code}-${
                      sizeInfo.actualSize
                    }-${Date.now()}-${Math.random()}`,
                    kurti: kurti,
                    selectedSize: sizeInfo.actualSize, // Use actual size for stock deduction
                    orderedSize: sizeInfo.size, // Keep ordered size for PDF
                    quantity: sizeInfo.quantity,
                    sellingPrice: kurti.sellingPrice || 0,
                    availableStock: actualSizeStock.quantity,
                    isLowerSize: true,
                  });
                }
              } else {
                // Normal size - no replacement needed
                const currentSize = kurti.sizes?.find(
                  (sz: any) => sz.size === sizeInfo.size
                );

                if (currentSize && currentSize.quantity > 0) {
                  items.push({
                    id: `${kurti.code}-${
                      sizeInfo.size
                    }-${Date.now()}-${Math.random()}`,
                    kurti: kurti,
                    selectedSize: sizeInfo.size,
                    quantity: sizeInfo.quantity,
                    sellingPrice: kurti.sellingPrice || 0,
                    availableStock: currentSize.quantity,
                    isLowerSize: false,
                  });
                }
              }
            }
          });

          return items;
        }
      )
        .flat()
        .filter(Boolean);

      setCart(orderItems);
    }
  };

  const handleFind = async () => {
    try {
      setLoading(true);
      if (code.length < 6) {
        toast.error("Please enter correct code!!!");
        return;
      }

      const res = await axios.post(`/api/kurti/find-kurti`, { code });
      const data = res.data.data;

      if (data.error) {
        toast.error(data.error);
        setKurti(null);
      } else {
        setKurti(data.kurti);
        setSellingPrice("");
        setSelectedSize("");
        setQuantity(1);
        toast.success("Product found!");
      }
    } catch (error) {
      console.error("Error finding product:", error);
      toast.error("Error finding product");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = () => {
    if (!kurti) {
      toast.error("Please find a product first");
      return;
    }

    if (!selectedSize) {
      toast.error("Please select size");
      return;
    }

    if (!sellingPrice || parseInt(sellingPrice) <= 0) {
      toast.error("Please enter valid selling price");
      return;
    }

    if (quantity <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }

    const sizeInfo = kurti.sizes.find((sz: any) => sz.size === selectedSize);
    if (!sizeInfo || sizeInfo.quantity < quantity) {
      toast.error("Insufficient stock for selected quantity");
      return;
    }

    // Check if same product+size already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) =>
        item.kurti.code === kurti.code && item.selectedSize === selectedSize
    );

    const newItem: CartItem = {
      id: `${kurti.code}-${selectedSize}-${Date.now()}`,
      kurti,
      selectedSize,
      quantity,
      sellingPrice: parseInt(sellingPrice),
      availableStock: sizeInfo.quantity,
    };

    if (existingItemIndex >= 0) {
      // Update existing item
      const updatedCart = [...cart];
      const existingItem = updatedCart[existingItemIndex];
      const totalQuantity = existingItem.quantity + quantity;

      if (totalQuantity > sizeInfo.quantity) {
        toast.error("Total quantity exceeds available stock");
        return;
      }

      updatedCart[existingItemIndex] = {
        ...existingItem,
        quantity: totalQuantity,
        sellingPrice: parseInt(sellingPrice), // Update price if changed
      };
      setCart(updatedCart);
    } else {
      // Add new item
      setCart([...cart, newItem]);
    }

    // Reset current product selection
    setCode("");
    setKurti(null);
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);

    toast.success("Product added to cart!");
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
    toast.success("Item removed from cart");
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updatedCart = cart.map((item) => {
      if (item.id === itemId) {
        if (newQuantity > item.availableStock) {
          toast.error("Quantity exceeds available stock");
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const updateCartItemPrice = (itemId: string, newPrice: number) => {
    if (newPrice <= 0) {
      toast.error("Please enter valid price");
      return;
    }

    const updatedCart = cart.map((item) => {
      if (item.id === itemId) {
        return { ...item, sellingPrice: newPrice };
      }
      return item;
    });
    setCart(updatedCart);
  };

  const getTotalAmount = () => {
    return cart.reduce(
      (total, item) => total + item.sellingPrice * item.quantity,
      0
    );
  };

  /** Shipping from the order record (set at checkout); not editable on this screen. */
  const getOrderShippingCharge = () => {
    if (!orderData || orderData.shippingCharge == null) return 0;
    return Number(orderData.shippingCharge) || 0;
  };

  const getGrandTotalWithShipping = () =>
    getTotalAmount() + getOrderShippingCharge();

  const handleSell = async () => {
    try {
      setSelling(true);

      if (cart.length === 0) {
        toast.error("Please add products to cart");
        return;
      }

      if (!customerName.trim()) {
        toast.error("Please enter customer name");
        return;
      }

      if (!billCreatedBy.trim()) {
        toast.error("Please enter bill created by");
        return;
      }
      // Payment type validation removed - now handled automatically through wallet
      // if (!shopName.trim()) {
      //   toast.error("Please enter shop name");
      //   return;
      // }

      const currentTime = getCurrTime();

      if (trackingId.trim().length === 0) {
        toast.error("Enter valid tracking id");
        return;
      }
      const shipCharge = getOrderShippingCharge();

      // Prepare products data for API
      const products = cart.map((item) => {
        const product: any = {
          code: item.kurti.code.toUpperCase() + item.selectedSize.toUpperCase(),
          kurti: item.kurti,
          selectedSize: item.selectedSize, // Actual size for stock deduction
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
        };
        // Only include orderedSize if it exists (for lower sizes)
        if (item.orderedSize) {
          product.orderedSize = item.orderedSize; // Lower size for PDF
        }
        return product;
      });

      const res = await axios.post(`/api/sell/confirm-offline-order`, {
        products,
        currentUser,
        currentTime: currentTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        // paymentType removed - now handled automatically through wallet
        gstType: gstType,
        orderId: orderId,
        sellType: "HALL_SELL_ONLINE",
      });

      const data = res.data.data;
      console.log("🚀 ~ handleSell ~ data:", data);

      if (data.error) {
        toast.error(data.error);
      } else {
        // Check payment status and show appropriate message
        if (data.paymentStatus === "COMPLETED") {
          toast.success(
            "Sale completed successfully! Payment processed via wallet."
          );
        } else if (orderData?.paymentType === "credit_limit") {
          toast.success(
            "Sale recorded on credit (udhhar). Reseller payment stays pending until they pay or you settle from their wallet on the request page."
          );
        } else {
          toast.success(
            "Sale completed. Order payment is still pending (insufficient wallet balance at billing)."
          );
        }

        // Mark order shipped with tracking and shipping charge
        try {
          const shipRes: any = await shippedOrder(
            orderId,
            trackingId,
            shipCharge,
            selectedCourier
          );
          if (shipRes?.error) {
            toast.error(shipRes.error);
          } else {
            toast.success("Order marked as SHIPPED");
          }
        } catch (e) {
          console.error(e);
          toast.error("Failed to mark order as shipped");
        }

        resetForm();
      }
    } catch (error) {
      console.error("Error selling products:", error);
      toast.error("Error processing sale");
    } finally {
      setSelling(false);
    }
  };

  const resetForm = () => {
    setCode("");
    setKurti(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setBillCreatedBy("");
    // Payment type reset removed
    setGstType("SGST_CGST");
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);
  };

  const clearOrderData = () => {
    setOrderData(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setBillCreatedBy("");
    // Payment type reset removed
    toast.success("Order data cleared. You can now start fresh.");
  };

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
  };

  // Show loading state while fetching order
  if (orderLoading) {
    return (
      <Card className="rounded-none w-full h-full">
        <CardHeader>
          <p className="text-2xl font-semibold text-center">
            🛒 Confirm Online Order
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading order details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isCreditLimitOrder = orderData?.paymentType === "credit_limit";
  const resellerCreditLine =
    orderData?.user?.creditLimit != null
      ? Number(orderData.user.creditLimit)
      : null;

  // Show error state if order not found
  if (!orderData) {
    return (
      <Card className="rounded-none w-full h-full">
        <CardHeader>
          <p className="text-2xl font-semibold text-center">
            🛒 Confirm Online Order
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">❌ Order Not Found</div>
            <div className="text-gray-600 mb-4">
              The order with ID <strong>{orderId}</strong> could not be found.
            </div>
            <div className="text-sm text-gray-500 mb-6">
              Please check the order ID and try again.
            </div>
            <Button
              onClick={fetchOrderData}
              disabled={orderLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {orderLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none w-full h-full">
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
          🛒 Confirm Online Order
        </p>
        {orderData && (
          <div className="text-center text-sm text-gray-600">
            Order ID: {orderData.orderId} | Status: {orderData.status} | Date:{" "}
            {new Date(orderData.date).toLocaleDateString()}
          </div>
        )}
      </CardHeader>
      <CardContent className="w-full flex flex-col space-evenly justify-center flex-wrap gap-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">GST Configuration</h3>
          <div
            className={`mb-4 p-3 border rounded-lg ${
              isCreditLimitOrder
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            {isCreditLimitOrder ? (
              <>
                <p className="text-sm text-amber-900">
                  💳 <strong>Payment:</strong> This order was placed on the
                  reseller&apos;s <strong>admin credit line</strong> (udhhar).
                  Confirming the sale keeps <strong>payment pending</strong> until
                  they pay or you settle from wallet — but their{" "}
                  <strong>credit limit is reduced</strong> by this bill so they
                  cannot exceed the udhhar cap. Settle later on{" "}
                  <strong>/request/customer/[their user id]</strong> or via an
                  approved wallet request.
                </p>
                {resellerCreditLine !== null && (
                  <div className="mt-3 p-2 bg-white border border-amber-300 rounded">
                    <p className="text-sm font-medium text-amber-950">
                      📎 Current credit line:{" "}
                      <span className="font-bold">
                        ₹{resellerCreditLine.toFixed(2)}
                      </span>
                    </p>
                    {cart.length > 0 && (
                      <p className="text-xs text-amber-900 mt-1">
                        Bill total (incl. shipping ₹
                        {getOrderShippingCharge().toFixed(2)}): ₹
                        {getGrandTotalWithShipping().toFixed(2)}
                        {resellerCreditLine < getGrandTotalWithShipping() ? (
                          <span className="text-red-700 font-medium">
                            {" "}
                            — Not enough credit line for this bill; sale will be
                            rejected.
                          </span>
                        ) : (
                          <span className="text-green-700">
                            {" "}
                            — OK to settle on credit
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-blue-800">
                  💳 <strong>Payment Method:</strong> Orders will be
                  automatically paid using the customer&apos;s wallet balance.
                  <br />
                  📊 <strong>Balance Check:</strong> The system will verify
                  sufficient funds before confirming the order.
                </p>
                {userBalance !== null && (
                  <div className="mt-3 p-2 bg-white border border-blue-300 rounded">
                    <p className="text-sm font-medium text-blue-900">
                      💰 Customer Wallet Balance:{" "}
                      <span className="font-bold">₹{userBalance}</span>
                    </p>
                    {cart.length > 0 && (
                      <p className="text-xs text-blue-700 mt-1">
                        Order total (incl. shipping ₹
                        {getOrderShippingCharge().toFixed(2)}): ₹
                        {getGrandTotalWithShipping().toFixed(2)} |
                        {userBalance >= getGrandTotalWithShipping() ? (
                          <span className="text-green-600">
                            {" "}
                            ✅ Sufficient Balance - Payment will be completed
                          </span>
                        ) : (
                          <span className="text-orange-600">
                            {" "}
                            ⚠️ Insufficient Balance - Order will be marked as
                            PENDING
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="SGST_CGST"
                checked={gstType === "SGST_CGST"}
                onChange={(e) => setGstType(e.target.value as GSTType)}
              />
              <span>SGST + CGST (2.5% + 2.5%)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="IGST"
                checked={gstType === "IGST"}
                onChange={(e) => setGstType(e.target.value as GSTType)}
              />
              <span>IGST (5%)</span>
            </label>
          </div>
        </div>

        {/* Order Details Section */}
        {orderData && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-green-800">
                Order Information
              </h3>
              <Button
                onClick={clearOrderData}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear Order Data
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-green-700">
                  Order ID
                </Label>
                <div className="text-lg font-semibold text-green-800">
                  {orderData.orderId}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-green-700">
                  Order Status
                </Label>
                <div className="text-lg font-semibold text-green-800">
                  {orderData.status}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-green-700">
                  Order Date
                </Label>
                <div className="text-lg font-semibold text-green-800">
                  {new Date(orderData.date).toLocaleDateString()}
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-sm font-medium text-green-700">
                  Order totals
                </Label>
                <div className="mt-1 space-y-0.5 text-sm text-green-800">
                  <div className="flex justify-between gap-4">
                    <span>Subtotal</span>
                    <span>₹{getTotalAmount().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Shipping</span>
                    <span>₹{getOrderShippingCharge().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4 font-semibold border-t border-green-200 pt-1 mt-1">
                    <span>Grand total</span>
                    <span>₹{getGrandTotalWithShipping().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            {orderData.shippingAddress && (
              <div className="mt-4">
                <Label className="text-sm font-medium text-green-700">
                  Shipping Address
                </Label>
                <div className="text-sm text-green-800 mt-1">
                  {orderData.shippingAddress.address}
                  {orderData.shippingAddress.zipCode &&
                    `, ${orderData.shippingAddress.zipCode}`}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label className="text-sm font-medium text-green-700">
                      Tracking ID *
                    </Label>
                    <Input
                      placeholder="Enter tracking id"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-green-700">
                      Shipping charge
                    </Label>
                    <div className="mt-1 rounded-md border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-900">
                      ₹{getOrderShippingCharge().toFixed(2)}
                      <span className="ml-2 font-normal text-green-700">
                        (from order)
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label
                      htmlFor="courier-select"
                      className="text-sm font-medium text-green-700"
                    >
                      Courier services *
                    </Label>
                    <select
                      id="courier-select"
                      name="courier-select"
                      aria-label="Select courier services"
                      className="w-full p-2 border rounded-md"
                      value={selectedCourier}
                      onChange={(e) => {
                        console.log("e.target.value", e.target.value);
                        setSelectedCourier(e.target.value);
                      }}
                    >
                      <option value="">Select Courier Services</option>
                      {courierServices.map((sz: any, i: number) => (
                        <option key={i} value={sz.key}>
                          {sz.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Customer Details Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Customer Details</h3>
            {orderData && (
              <div className="text-sm text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                👤 Pre-filled from order
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="customer-phone">Customer Phone (Optional)</Label>
              <Input
                id="customer-phone"
                placeholder="Enter customer phone"
                value={customerPhone}
                maxLength={10}
                onChange={(e) => {
                  const input = e.target.value;
                  // Only allow digits
                  if (/^\d*$/.test(input)) {
                    setCustomerPhone(input);
                  }
                }}
              />
            </div>
            {/* Payment Type removed - now handled automatically through wallet */}

            <div>
              <Label htmlFor="bill-by">Bill Created By *</Label>
              <Input
                id="bill-by"
                placeholder="Enter person name"
                value={billCreatedBy}
                onChange={(e) => setBillCreatedBy(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold">Find Product</h3>
            {orderData && cart.length > 0 && (
              <div className="text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-full">
                🛒 Cart pre-populated from order
              </div>
            )}
          </div>
          <div className="flex flex-row flex-wrap gap-2 items-end">
            <div className="flex flex-col flex-wrap">
              <Label htmlFor="product-code" className="mb-[10px]">
                Product Code
              </Label>
              <Input
                id="product-code"
                className="w-[250px] p-2"
                placeholder="Enter product code (without size)"
                value={code}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    handleFind();
                  }
                }}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleFind}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Find Product
            </Button>
          </div>
        </div>

        {/* Product Details */}
        {kurti && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Product Details</h3>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-shrink-0">
                <img
                  src={kurti.images[0]?.url}
                  alt={kurti.code}
                  className="w-64 h-64 object-cover rounded-lg border"
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xl font-bold">
                  Code: {kurti.code.toUpperCase()}
                </p>
                <p className="text-lg">Category: {kurti.category}</p>
                <p className="text-lg">Party: {kurti.party}</p>
                <p className="text-lg font-semibold text-green-600">
                  SP: RB{kurti.sellingPrice}
                </p>
                {kurti?.isBigPrice && (
                  <p className="text-lg font-semibold text-green-600">
                    BSP: RB
                    {parseInt(kurti.sellingPrice) +
                      (kurti?.isBigPrice ? kurti?.bigPrice : 0)}
                  </p>
                )}

                {/* Size Table */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Available Sizes:</h4>
                  <div className="flex flex-wrap gap-4">
                    <Table className="border border-collapse max-w-md">
                      <TableHeader>
                        <TableRow className="bg-slate-800">
                          <TableHead className="font-bold border text-white">
                            SIZE
                          </TableHead>
                          <TableHead className="font-bold border text-white">
                            STOCK
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {kurti.sizes.map((sz: any, i: number) => (
                          <TableRow
                            key={i}
                            className={sz.quantity === 0 ? "opacity-50" : ""}
                          >
                            <TableCell className="border">
                              {sz.size.toUpperCase()}
                            </TableCell>
                            <TableCell
                              className={`border ${
                                sz.quantity === 0
                                  ? "text-red-500"
                                  : "text-green-600"
                              }`}
                            >
                              {sz.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Add to Cart Form */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold mb-3 text-yellow-800">
                    Add to Cart
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <Label htmlFor="size-select">Select Size *</Label>
                      <select
                        id="size-select"
                        name="size-select"
                        aria-label="Select size"
                        className="w-full p-2 border rounded-md"
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                      >
                        <option value="">Select Size</option>
                        {getAvailableSizes().map((sz: any, i: number) => (
                          <option key={i} value={sz.size}>
                            {sz.size.toUpperCase()} (Stock: {sz.quantity})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(parseInt(e.target.value) || 1)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="selling-price">Selling Price *</Label>
                      <Input
                        id="selling-price"
                        type="number"
                        placeholder="Enter selling price"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={addToCart}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shopping Cart */}
        {cart.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-green-800">
                Shopping Cart ({cart.length} items)
              </h3>
              {orderData && (
                <div className="text-sm text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  📋 Pre-populated from order
                </div>
              )}
            </div>

            {/* Lower Size Notice */}
            {cart.some((item) => item.isLowerSize) && (
              <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚠️ Lower Level Size Notice
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Some items have lower level sizes ordered. Stock will be deducted from the actual size being sent, but the bill will show the ordered (lower) size for the customer.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table className="border border-collapse">
                <TableHeader>
                  <TableRow className="bg-green-800">
                    <TableHead className="font-bold border text-white">
                      Product
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Size
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Quantity
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Unit Price
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Total
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="border">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.kurti.images[0]?.url}
                            alt={item.kurti.code}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <div className="font-semibold">
                              {item.kurti.code.toUpperCase()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.kurti.category}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="border">
                        {item.isLowerSize && item.orderedSize ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-blue-600">
                              {item.selectedSize.toUpperCase()} (Sending)
                            </span>
                            <span className="text-xs text-orange-600 font-medium">
                              Ordered: {item.orderedSize.toUpperCase()}
                            </span>
                          </div>
                        ) : (
                          <span>{item.selectedSize.toUpperCase()}</span>
                        )}
                      </TableCell>
                      <TableCell className="border">
                        <Input
                          type="number"
                          min="1"
                          max={item.availableStock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItemQuantity(
                              item.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="border">
                        <Input
                          type="number"
                          min="1"
                          value={item.sellingPrice}
                          onChange={(e) =>
                            updateCartItemPrice(
                              item.id,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="border font-semibold">
                        ₹{item.sellingPrice * item.quantity}
                      </TableCell>
                      <TableCell className="border">
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-300">
              <div className="text-sm font-bold text-green-800 space-y-0.5">
                <div>
                  Subtotal: ₹{getTotalAmount().toFixed(2)} · Shipping: ₹
                  {getOrderShippingCharge().toFixed(2)}
                </div>
                <div className="text-xl">
                  Grand total: ₹{getGrandTotalWithShipping().toFixed(2)}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleSell}
                  disabled={selling || cart.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title=""
                >
                  {selling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  Complete sale & ship
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={selling}
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Payment Status Information */}
            {cart.length > 0 && userBalance !== null && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">💡 Payment Information:</p>
                  {userBalance >= getGrandTotalWithShipping() ? (
                    <p>
                      ✅ <strong>Sufficient Balance:</strong> Payment will be
                      automatically completed and amount deducted from wallet.
                    </p>
                  ) : (
                    <p>
                      ⚠️ <strong>Insufficient Balance:</strong> Order will be
                      completed but marked as PENDING. No amount will be
                      deducted from wallet.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SellerHelp = () => {
  return (
    <>
      <RoleGateForComponent
        allowedRole={[
          UserRole.ADMIN,
          UserRole.SELLER,
          UserRole.SHOP_SELLER,
          UserRole.SELLER_MANAGER,
        ]}
      >
        <SellPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default SellerHelp;
