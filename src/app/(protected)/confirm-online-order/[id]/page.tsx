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
  FileText,
  Trash2,
  Plus,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { generateInvoicePDF } from "@/src/actions/generate-pdf";
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
  selectedSize: string;
  quantity: number;
  sellingPrice: number;
  availableStock: number;
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
  const [shippingCharge, setShippingCharge] = useState<number>(0);

  const currentUser = useCurrentUser();

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
              // Find the corresponding size in kurti.sizes to get current stock
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
                });
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

      if (trackingId.trim().length === 0 || shippingCharge <= 0) {
        toast.error("Enter valid tracking id and shipping charge");
        return;
      }

      // Prepare products data for API
      const products = cart.map((item) => ({
        code: item.kurti.code.toUpperCase() + item.selectedSize.toUpperCase(),
        kurti: item.kurti,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      }));

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
          toast.success("Sale completed successfully! Payment processed via wallet.");
        } else {
          toast.success("Sale completed successfully! Order marked as PENDING due to insufficient wallet balance.");
        }
        
        // Mark order shipped with tracking and shipping charge
        try {
          const shipRes: any = await shippedOrder(orderId, trackingId, shippingCharge);
          if (shipRes?.error) {
            toast.error(shipRes.error);
          } else {
            toast.success("Order marked as SHIPPED");
          }
        } catch (e) {
          console.error(e);
          toast.error("Failed to mark order as shipped");
        }

        // Generate invoice including shipping details
        await generateInvoice({ ...data, trackingId, shippingCharge });

        // Show invoice URL if available
        if (data.batchNumber) {
          toast.success(`Invoice saved with batch number: ${data.batchNumber}`);
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

const generateInvoice = async (saleData: any) => {
  try {
    const soldProducts = cart.map((item) => ({
      kurti: item.kurti,
      size: item.selectedSize,
      quantity: item.quantity,
      selledPrice: item.sellingPrice
        ? parseFloat(item.sellingPrice?.toString())
        : 0,
      unitPrice: item.sellingPrice
        ? parseFloat(item.sellingPrice?.toString())
        : 0,
      totalPrice: item.sellingPrice
        ? parseFloat(item.sellingPrice?.toString()) * item.quantity
        : 0,
    }));

    const result = await generateInvoicePDF({
      saleData,
      batchNumber: saleData.batchNumber || `OFFLINE-INV-${Date.now()}`,
      customerName,
      customerPhone,
      selectedLocation: "",
      billCreatedBy,
      currentUser,
      soldProducts,
      totalAmount: getTotalAmount() + (saleData?.shippingCharge || 0),
      gstType,
      invoiceNumber: saleData.invoiceNumber || "",
      sellType: "HALL_SELL_ONLINE",
      shippingCharge: saleData?.shippingCharge || 0,
      trackingId: saleData?.trackingId || trackingId,
    } as any);

    if (!result.success || !result.pdfBase64) {
      throw new Error(result.error || "Failed to generate PDF");
    }

    // Convert base64 string to Blob (PDF)
    const binaryString = atob(result.pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });

    // Trigger download
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoice-${
      saleData.batchNumber || `ONLINE-INV-${Date.now()}`
    }.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success("Invoice PDF downloaded successfully!");

    // Send to WhatsApp API
    // Create a File object from the Blob to simulate file upload
    const pdfFile = new File(
      [blob],
      `invoice-${saleData.batchNumber || `ONLINE-INV-${Date.now()}`}.pdf`,
      {
        type: "application/pdf",
      }
    );

    const formData = new FormData();
    formData.append("type", "media"); // as per your API example
    formData.append("to", customerPhone); // or the target WhatsApp number
    formData.append("file", pdfFile);
    formData.append("caption", "Here is your PDF document");

    // Call your WhatsApp send API endpoint
    const response = await fetch("http://localhost:3000/api/whatsapp", {
      method: "POST",
      body: formData,
    });

    const whatsappResult = await response.json();

    if (!response.ok) {
      throw new Error(
        whatsappResult.error || "Failed to send invoice to WhatsApp"
      );
    }

    toast.success("Invoice PDF sent via WhatsApp!");

  } catch (error) {
    console.error("Error generating PDF or sending WhatsApp message:", error);
    toast.error("Failed to generate or send invoice PDF");
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
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💳 <strong>Payment Method:</strong> Orders will be automatically paid using the customer's wallet balance.
              <br />
              📊 <strong>Balance Check:</strong> The system will verify sufficient funds before confirming the order.
            </p>
            {userBalance !== null && (
              <div className="mt-3 p-2 bg-white border border-blue-300 rounded">
                <p className="text-sm font-medium text-blue-900">
                  💰 Customer Wallet Balance: <span className="font-bold">₹{userBalance}</span>
                </p>
                {cart.length > 0 && (
                  <p className="text-xs text-blue-700 mt-1">
                    Order Total: ₹{getTotalAmount()} | 
                    {userBalance >= getTotalAmount() ? (
                      <span className="text-green-600"> ✅ Sufficient Balance - Payment will be completed</span>
                    ) : (
                      <span className="text-orange-600"> ⚠️ Insufficient Balance - Order will be marked as PENDING</span>
                    )}
                  </p>
                )}
              </div>
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
              <div>
                <Label className="text-sm font-medium text-green-700">
                  Total Amount
                </Label>
                <div className="text-lg font-semibold text-green-800">
                  ₹{getTotalAmount()}
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
                    <Label className="text-sm font-medium text-green-700">Tracking ID *</Label>
                    <Input
                      placeholder="Enter tracking id"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-green-700">Shipping Charge *</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="Enter shipping charge"
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(parseInt(e.target.value || "0"))}
                    />
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
                        {item.selectedSize.toUpperCase()}
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
              <div className="text-xl font-bold text-green-800">
                Total Amount: ₹{getTotalAmount()} {shippingCharge > 0 ? `+ Shipping ₹${shippingCharge}` : ""}
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
                  Complete Sale & Generate Invoice
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
                  {userBalance >= getTotalAmount() ? (
                    <p>✅ <strong>Sufficient Balance:</strong> Payment will be automatically completed and amount deducted from wallet.</p>
                  ) : (
                    <p>⚠️ <strong>Insufficient Balance:</strong> Order will be completed but marked as PENDING. No amount will be deducted from wallet.</p>
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
