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
import { OfflineSellType, UserRole } from "@prisma/client";
import axios from "axios";
import {
  Loader2,
  Search,
  ShoppingCart,
  FileText,
  Trash2,
  Plus,
  Edit,
  Save,
  X,
  Eye,
  ChevronLeft,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { useParams, useRouter } from "next/navigation";
import { PasswordDialog } from "@/src/app/(protected)/_components/PasswordDialog";
import Link from "next/link";

interface CartItem {
  id: string;
  kurti: any;
  selectedSize: string;
  quantity: number;
  sellingPrice: number;
  availableStock: number;
}

type GSTType = "IGST" | "SGST_CGST";

interface SaleDetailsPageProps {
  params: {
    id: string;
  };
}
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
];

function SaleDetailsPage({ params }: SaleDetailsPageProps) {
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [originalSaleData, setOriginalSaleData] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [regeneratingInvoice, setRegeneratingInvoice] = useState(false);

  // Product search and cart states
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"COMPLETED" | "PENDING">(
    "PENDING"
  );
  const [gstType, setGstType] = useState<"IGST" | "SGST_CGST">("SGST_CGST");
  const [sellType, setSellType] = useState<OfflineSellType>("HALL_SELL_ONLINE");

  // Wallet information
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Shipping editing states
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingTrackingId, setShippingTrackingId] = useState("");
  const [shippingCharge, setShippingCharge] = useState(0);
  const [changeReason, setChangeReason] = useState("");
  const [updatingShipping, setUpdatingShipping] = useState(false);
  const [shippingHistory, setShippingHistory] = useState<any[]>([]);
  const [showShippingHistory, setShowShippingHistory] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("indianpost");

  const currentUser = useCurrentUser();
  const router = useRouter();

  // Fetch user wallet balance
  const fetchUserBalance = async (userId: string) => {
    try {
      setLoadingBalance(true);
      const response = await axios.post("/api/wallet/get-balance", { userId });
      if (response.data.success) {
        setUserBalance(response.data.data.balance);
      }
    } catch (error) {
      console.error("Error fetching user balance:", error);
      // Don't show error toast for balance fetch - it's optional information
    } finally {
      setLoadingBalance(false);
    }
  };

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/sell/online-sales/${params.id}`);

      const saleData = response.data.data;
      setOriginalSaleData(saleData);

      // Populate form fields with existing data
      setCustomerName(saleData.customerName || "");
      setCustomerPhone(saleData.customerPhone || "");
      setBillCreatedBy(saleData.billCreatedBy || "");
      setPaymentStatus(saleData.paymentStatus || "PENDING");
      setGstType(saleData.gstType || "SGST_CGST");
      setSellType(saleData.sellType || "HALL_SELL_ONLINE");

      // Load shipping information
      if (saleData.order) {
        setShippingTrackingId(saleData.order.trackingId || "");
        setShippingCharge(saleData.order.shippingCharge || 0);
      }

      // Load existing cart items
      const existingCartItems = saleData.sales.map((sale: any) => ({
        id: sale.id,
        kurti: sale.kurti,
        selectedSize: sale.kurtiSize,
        quantity: sale.quantity,
        sellingPrice: sale.selledPrice,
        availableStock: sale.availableStock,
      }));
      setCart(existingCartItems);

      // Fetch user wallet balance if order ID exists
      if (saleData.orderId && saleData.order.user) {
        fetchUserBalance(saleData.order.user.id);
      }
    } catch (error: any) {
      console.error("Error loading sale details:", error);
      toast.error("Failed to load sale details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadSaleDetails();
    }
  }, [params.id]);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Cancel edit mode - restore original data
      if (originalSaleData) {
        setCustomerName(originalSaleData.customerName || "");
        setCustomerPhone(originalSaleData.customerPhone || "");
        setBillCreatedBy(originalSaleData.billCreatedBy || "");
        setPaymentStatus(originalSaleData.paymentStatus || "PENDING");
        setGstType(originalSaleData.gstType || "SGST_CGST");
        setSellType(originalSaleData.sellType || "HALL_SELL_ONLINE");

        // Restore original cart items
        const originalCartItems = originalSaleData.sales.map((sale: any) => ({
          id: sale.id,
          kurti: sale.kurti,
          selectedSize: sale.kurtiSize,
          quantity: sale.quantity,
          sellingPrice: sale.selledPrice,
          availableStock: sale.availableStock,
        }));
        setCart(originalCartItems);
        setRemovedItems([]);
      }
    } else {
      // Enter edit mode - clear removed items
      setRemovedItems([]);
    }
    setIsEditMode(!isEditMode);
  };

  // Save changes
  const handleSaveChanges = async () => {
    try {
      setUpdating(true);

      // Validate required fields
      if (!customerName.trim()) {
        toast.error("Customer name is required");
        return;
      }

      if (!billCreatedBy.trim()) {
        toast.error("Bill created by is required");
        return;
      }

      if (!paymentStatus) {
        toast.error("Payment status is required");
        return;
      }

      // Prepare data for API call
      const updateData: any = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        paymentStatus: paymentStatus,
        gstType: gstType,
        sellType: sellType,
        orderId: originalSaleData.orderId,
      };

      // Add new products if any are in the cart that weren't in the original data
      const originalSaleIds =
        originalSaleData?.sales?.map((sale: any) => sale.id) || [];
      const newProducts = cart
        .filter((item) => !originalSaleIds.includes(item.id))
        .map((item) => ({
          kurtiId: item.kurti.id,
          kurtiCode: item.kurti.code,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          code: item.kurti.code,
        }));

      if (newProducts.length > 0) {
        updateData.newProducts = newProducts;
      }

      // Add updated items (existing items that have been modified)
      const updatedItems = cart
        .filter((item) => originalSaleIds.includes(item.id))
        .map((item) => ({
          id: item.id,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
        }));

      if (updatedItems.length > 0) {
        updateData.updatedItems = updatedItems;
      }

      // Add removed items if any
      if (removedItems.length > 0) {
        updateData.removedItems = removedItems;
      }

      const response = await axios.put(
        `/api/sell/online-sales/${params.id}`,
        updateData
      );

      if (response.data.success) {
        toast.success("Sale updated successfully!");
        setOriginalSaleData(response.data.data);

        // Download the updated invoice
        try {
          const link = document.createElement("a");
          link.href = response.data.data.invoiceUrl;
          link.download = `invoice-${response.data.batchNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("New invoice downloaded!");
        } catch (error) {
          console.error("Error downloading invoice:", error);
          toast.error("Failed to download invoice");
        }

        // Send updated invoice to WhatsApp
        try {
          // First, fetch the updated PDF file from the URL
          const pdfResponse = await fetch(response.data.data.invoiceUrl);

          if (!pdfResponse.ok) {
            throw new Error("Failed to fetch updated PDF from server");
          }

          // Convert response to blob
          const pdfBlob = await pdfResponse.blob();

          // Create a File object from the blob
          const pdfFile = new File(
            [pdfBlob],
            `invoice-${response.data.batchNumber}.pdf`,
            {
              type: "application/pdf",
            }
          );

          // Prepare FormData for WhatsApp API
          const formData = new FormData();
          formData.append("type", "media");
          formData.append("to", customerPhone.trim()); // Use the updated customer phone
          formData.append("file", pdfFile);
          formData.append("caption", "Here is your updated invoice PDF");

          // Send to WhatsApp API
          // const whatsappResponse = await fetch(
          //   "http://localhost:3000/api/whatsapp",
          //   {
          //     method: "POST",
          //     body: formData,
          //   }
          // );

          // const whatsappResult = await whatsappResponse.json();

          // if (!whatsappResponse.ok) {
          //   throw new Error(
          //     whatsappResult.error ||
          //       "Failed to send updated invoice to WhatsApp"
          //   );
          // }

       //   toast.success("Updated invoice sent via WhatsApp!");
        } catch (whatsappError) {
          console.error(
            "Error sending updated invoice to WhatsApp:",
            whatsappError
          );
          toast.error("Failed to send updated invoice via WhatsApp");
          // Don't throw here - we still want the update to be considered successful
        }

        // Update cart with the new data from server
        const updatedCartItems = response.data.data.sales.map((sale: any) => ({
          id: sale.id,
          kurti: sale.kurti,
          selectedSize: sale.kurtiSize,
          quantity: sale.quantity,
          sellingPrice: sale.selledPrice,
          availableStock: sale.availableStock,
        }));
        setCart(updatedCartItems);

        await loadSaleDetails();

        // Reset removed items and exit edit mode
        setRemovedItems([]);
        setIsEditMode(false);
      } else {
        toast.error("Failed to update sale");
      }
    } catch (error: any) {
      console.error("Error updating sale:", error);
      toast.error(error.response?.data?.error || "Failed to update sale");
    } finally {
      setUpdating(false);
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

  const handleEditClick = () => {
    setShowPasswordDialog(true);
  };

  const handlePasswordSuccess = () => {
    toggleEditMode();
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

    // Create a unique temporary ID for new items (will be replaced with real ID after save)
    const tempId = `temp-${kurti.code}-${selectedSize}-${Date.now()}`;

    const newItem: CartItem = {
      id: tempId,
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

  const removeFromCart = async (itemId: string) => {
    const updatedCart = cart.filter((item) => item.id !== itemId);
    setCart(updatedCart);

    // For new items (temp IDs), just remove from cart
    // For existing items, track them for removal on save
    if (!itemId.startsWith("temp-")) {
      // This is an existing item that was removed
      setRemovedItems((prev) => [...prev, itemId]);
    }

    toast.success("Item removed from cart");
  };

  const updateCartItemQuantity = async (
    itemId: string,
    newQuantity: number
  ) => {
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

  const updateCartItemPrice = async (itemId: string, newPrice: number) => {
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

  const getAmountToDeduct = () => {
    // Calculate amount for new items (temp items) that will be charged
    const newItemsAmount = cart
      .filter((item) => item.id.includes("temp"))
      .reduce((total, item) => total + item.sellingPrice * item.quantity, 0);

    // Calculate amount for removed items that will be refunded
    // Only consider refunds if payment status is COMPLETED
    const removedItemsAmount =
      originalSaleData?.paymentStatus === "COMPLETED"
        ? removedItems.reduce((total, removedItemId) => {
            // Find the original item data from originalSaleData
            const originalItem = originalSaleData?.sales?.find(
              (sale: any) => sale.id === removedItemId
            );
            if (originalItem) {
              return (
                total +
                (originalItem.selledPrice || 0) * (originalItem.quantity || 1)
              );
            }
            return total;
          }, 0)
        : 0;

    // Net amount to deduct = new items - removed items
    return newItemsAmount - removedItemsAmount;
  };

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
  };

  const regenerateInvoice = async () => {
    try {
      setRegeneratingInvoice(true);

      const response = await axios.post(
        `/api/sell/online-sales/${params.id}/regenerate-invoice`
      );

      if (response.data.success) {
        toast.success("Invoice regenerated successfully!");

        // Update the original sale data with new invoice URL
        if (originalSaleData) {
          setOriginalSaleData({
            ...originalSaleData,
            invoiceUrl: response.data.invoiceUrl,
          });
        }

        // Download the new invoice
        try {
          const link = document.createElement("a");
          link.href = response.data.data.invoiceUrl;
          console.log("🚀 ~ regenerateInvoice ~ link:", link);
          link.download = `invoice-${response.data.batchNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("New invoice downloaded!");
        } catch (error) {
          console.error("Error downloading invoice:", error);
          toast.error("Failed to download invoice");
        }

        // Send PDF to WhatsApp
        try {
          // First, fetch the PDF file from the URL
          const pdfResponse = await fetch(response.data.data.invoiceUrl);

          if (!pdfResponse.ok) {
            throw new Error("Failed to fetch PDF from server");
          }

          // Convert response to blob
          const pdfBlob = await pdfResponse.blob();

          // Create a File object from the blob
          const pdfFile = new File(
            [pdfBlob],
            `invoice-${response.data.batchNumber}.pdf`,
            {
              type: "application/pdf",
            }
          );

          // Prepare FormData for WhatsApp API
          const formData = new FormData();
          formData.append("type", "media");
          formData.append("to", customerPhone); // Make sure this variable is available
          formData.append("file", pdfFile);
          formData.append("caption", "Here is your regenerated invoice PDF");

          // Send to WhatsApp API
          // const whatsappResponse = await fetch(
          //   "http://localhost:3000/api/whatsapp",
          //   {
          //     method: "POST",
          //     body: formData,
          //   }
          // );

          // const whatsappResult = await whatsappResponse.json();

          // if (!whatsappResponse.ok) {
          //   throw new Error(
          //     whatsappResult.error || "Failed to send invoice to WhatsApp"
          //   );
          // }

          // toast.success("Invoice PDF sent via WhatsApp!");
        } catch (whatsappError) {
          console.error("Error sending invoice to WhatsApp:", whatsappError);
          toast.error("Failed to send invoice via WhatsApp");
          // Don't throw here - we still want the regeneration to be considered successful
        }
      } else {
        toast.error(response.data.error || "Failed to regenerate invoice");
      }
    } catch (error: any) {
      console.error("Error regenerating invoice:", error);
      toast.error(
        error.response?.data?.error || "Failed to regenerate invoice"
      );
    } finally {
      setRegeneratingInvoice(false);
    }
  };

  const updateShippingInformation = async () => {
    try {
      setUpdatingShipping(true);

      const response = await axios.put(
        `/api/sell/online-sales/${params.id}/update-shipping`,
        {
          trackingId: shippingTrackingId,
          shippingCharge: shippingCharge,
          changeReason: changeReason,
          selectedCourier: selectedCourier,
        }
      );

      if (response.data.success) {
        toast.success("Shipping information updated successfully!");

        // Update the original sale data
        if (originalSaleData) {
          setOriginalSaleData({
            ...originalSaleData,
            order: {
              ...originalSaleData.order,
              trackingId: response.data.data.trackingId,
              shippingCharge: response.data.data.shippingCharge,
            },
          });
        }

        // Reset form
        setEditingShipping(false);
        setChangeReason("");
      } else {
        toast.error(
          response.data.error || "Failed to update shipping information"
        );
      }
    } catch (error: any) {
      console.error("Error updating shipping information:", error);
      toast.error(
        error.response?.data?.error || "Failed to update shipping information"
      );
    } finally {
      setUpdatingShipping(false);
    }
  };

  const fetchShippingHistory = async () => {
    try {
      const response = await axios.get(
        `/api/sell/online-sales/${params.id}/shipping-history`
      );

      if (response.data.success) {
        setShippingHistory(response.data.data);
        setShowShippingHistory(true);
      } else {
        toast.error(response.data.error || "Failed to fetch shipping history");
      }
    } catch (error: any) {
      console.error("Error fetching shipping history:", error);
      toast.error(
        error.response?.data?.error || "Failed to fetch shipping history"
      );
    }
  };

  if (loading) {
    return (
      <Card className="rounded-none w-full h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading sale details...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-none w-full h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <Link href="/online-sales" className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </Link>
          <div className="flex gap-2">
            {!isEditMode ? (
              <>
                <Button
                  onClick={handleEditClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Sale
                </Button>
                <Button
                  onClick={regenerateInvoice}
                  disabled={regeneratingInvoice}
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  {regeneratingInvoice ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Regenerate Invoice
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveChanges}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={toggleEditMode}
                  variant="outline"
                  disabled={updating}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="w-full flex flex-col space-evenly justify-center flex-wrap gap-4">
        <div
          className={`p-4 rounded-lg ${
            isEditMode
              ? "bg-yellow-50 border-2 border-yellow-200"
              : "bg-blue-50"
          }`}
        >
          <h3 className="text-lg font-semibold mb-3">
            {isEditMode ? "🔄 Edit Mode Active" : "📋 Online Sale Information"}
          </h3>
          {isEditMode && (
            <p className="text-sm text-yellow-700 mb-3">
              You are currently editing this online sale. Make your changes and
              click "Save Changes" to update.
            </p>
          )}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="SGST_CGST"
                checked={gstType === "SGST_CGST"}
                onChange={(e) =>
                  setGstType(e.target.value as "IGST" | "SGST_CGST")
                }
                disabled={!isEditMode}
              />
              <span>SGST + CGST (2.5% + 2.5%)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="IGST"
                checked={gstType === "IGST"}
                onChange={(e) =>
                  setGstType(e.target.value as "IGST" | "SGST_CGST")
                }
                disabled={!isEditMode}
              />
              <span>IGST (5%)</span>
            </label>
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="p-4 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={!isEditMode}
                className={!isEditMode ? "bg-gray-50" : ""}
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
                  if (/^\d*$/.test(input)) {
                    setCustomerPhone(input);
                  }
                }}
                disabled={!isEditMode}
                className={!isEditMode ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label htmlFor="payment-status">Payment Status *</Label>
              <select
                id="payment-status"
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as "COMPLETED" | "PENDING")
                }
                disabled={!isEditMode}
                aria-label="Select payment status"
                className={`w-full p-2 border rounded-md ${
                  !isEditMode ? "bg-gray-50" : ""
                }`}
              >
                <option value="PENDING">⏳ Pending</option>
                <option value="COMPLETED">✅ Completed</option>
              </select>
            </div>
            <div>
              <Label htmlFor="bill-by">Bill Created By *</Label>
              <Input
                id="bill-by"
                placeholder="Enter person name"
                value={billCreatedBy}
                onChange={(e) => setBillCreatedBy(e.target.value)}
                disabled={!isEditMode}
                className={!isEditMode ? "bg-gray-50" : ""}
              />
            </div>

            {/* Wallet Balance Display */}
            {originalSaleData?.orderId && (
              <div>
                <Label className="text-sm font-medium mb-1 block">
                  💰 Customer Wallet Balance
                </Label>
                <div className="p-2 bg-gray-50 border rounded-md">
                  {loadingBalance ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">
                        Loading balance...
                      </span>
                    </div>
                  ) : userBalance !== null ? (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-blue-900">
                        Current Balance:{" "}
                        <span className="font-bold">₹{userBalance}</span>
                      </p>
                      <p className="text-xs text-blue-700">
                        Order Total: ₹{getTotalAmount()} | Amount to Deduct: ₹
                        {getAmountToDeduct()}
                        {originalSaleData?.paymentStatus === "PENDING" && (
                          <span className="text-orange-600">
                            {" "}
                            ⚠️ Payment Pending
                          </span>
                        )}
                        {originalSaleData?.paymentStatus === "COMPLETED" &&
                          (userBalance >= getAmountToDeduct() ? (
                            <span className="text-green-600">
                              {" "}
                              ✅ Sufficient Balance
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {" "}
                              ❌ Insufficient Balance
                            </span>
                          ))}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Unable to fetch balance
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Search Section - Only show in edit mode */}
        {isEditMode && (
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Find Product</h3>
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
        )}

        {/* Product Details - Only show in edit mode */}
        {isEditMode && kurti && (
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
            <h3 className="text-lg font-semibold mb-4 text-green-800">
              {isEditMode ? "Edit Cart Items" : "Sale Items"} ({cart.length}{" "}
              items)
            </h3>

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
                    {isEditMode && (
                      <TableHead className="font-bold border text-white">
                        Actions
                      </TableHead>
                    )}
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
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="1"
                            max={item.availableStock}
                            value={item.quantity}
                            onChange={async (e) => {
                              await updateCartItemQuantity(
                                item.id,
                                parseInt(e.target.value) || 1
                              );
                            }}
                            className="w-20"
                          />
                        ) : (
                          <span>{item.quantity}</span>
                        )}
                      </TableCell>
                      <TableCell className="border">
                        {isEditMode ? (
                          <Input
                            type="number"
                            min="1"
                            value={item.sellingPrice}
                            onChange={async (e) => {
                              await updateCartItemPrice(
                                item.id,
                                parseInt(e.target.value) || 1
                              );
                            }}
                            className="w-24"
                          />
                        ) : (
                          <span>₹{item.sellingPrice}</span>
                        )}
                      </TableCell>
                      <TableCell className="border font-semibold">
                        ₹{item.sellingPrice * item.quantity}
                      </TableCell>
                      {isEditMode && (
                        <TableCell className="border">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              await removeFromCart(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-green-300">
              <div className="text-xl font-bold text-green-800">
                Total Amount: ₹{getTotalAmount()}
              </div>
              {isEditMode && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCart([]);
                      setCode("");
                      setKurti(null);
                      setSelectedSize("");
                      setSellingPrice("");
                      setQuantity(1);
                    }}
                    disabled={updating}
                  >
                    Clear Cart
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Shipping Information */}
        {originalSaleData?.order && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-blue-800">
                🚚 Shipping Information
              </h3>
              {currentUser?.role === "ADMIN" && (
                <div className="flex gap-2">
                  <Button
                    onClick={fetchShippingHistory}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    📋 History
                  </Button>
                  <Button
                    onClick={() => setEditingShipping(!editingShipping)}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    {editingShipping ? "❌ Cancel" : "✏️ Edit"}
                  </Button>
                </div>
              )}
            </div>

            {editingShipping && currentUser?.role === "ADMIN" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tracking-id">Tracking ID</Label>
                    <Input
                      id="tracking-id"
                      placeholder="Enter tracking ID"
                      value={shippingTrackingId}
                      onChange={(e) => setShippingTrackingId(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shipping-charge">Shipping Charge (₹)</Label>
                    <Input
                      id="shipping-charge"
                      type="number"
                      placeholder="Enter shipping charge"
                      value={shippingCharge}
                      onChange={(e) =>
                        setShippingCharge(parseInt(e.target.value) || 0)
                      }
                      className="mt-1"
                    />
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
                <div>
                  <Label htmlFor="change-reason">
                    Reason for Change (Optional)
                  </Label>
                  <Input
                    id="change-reason"
                    placeholder="Enter reason for change"
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={updateShippingInformation}
                    disabled={updatingShipping}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updatingShipping ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Update Shipping
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingShipping(false);
                      setChangeReason("");
                    }}
                    variant="outline"
                    disabled={updatingShipping}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 space-y-2">
                {originalSaleData.order.shippingCharge > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Shipping Charge:</span>
                    <span className="font-bold text-blue-700">
                      ₹{originalSaleData.order.shippingCharge}
                    </span>
                  </div>
                )}
                {originalSaleData.order.trackingId && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tracking ID:</span>
                    <span className="font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                      {originalSaleData.order.trackingId}
                    </span>
                  </div>
                )}
                {originalSaleData.order.shippingAddress && (
                  <div className="mt-3">
                    <span className="font-medium">Shipping Address:</span>
                    <div className="mt-1 p-2 bg-blue-100 rounded text-blue-800">
                      <p>{originalSaleData.order.shippingAddress.address}</p>
                      {originalSaleData.order.shippingAddress.zipCode && (
                        <p>
                          ZIP: {originalSaleData.order.shippingAddress.zipCode}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {!originalSaleData.order.shippingCharge &&
                  !originalSaleData.order.trackingId && (
                    <p className="text-gray-500 italic">
                      No shipping information available
                    </p>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Payment Information */}
        {originalSaleData && (
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
            <h3 className="text-lg font-semibold mb-3 text-purple-800">
              💰 Payment Information
            </h3>
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Payment Status:</span>
                {originalSaleData.paymentStatus === "COMPLETED" ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Completed
                  </span>
                ) : originalSaleData.paymentStatus === "PENDING" ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    ⚠️ Pending
                  </span>
                ) : (
                  <span className="text-gray-500">Not specified</span>
                )}
              </div>
              {originalSaleData.paymentStatus === "COMPLETED" && (
                <div className="text-green-700">
                  <p>💳 Payment completed via wallet</p>
                  <p>💰 Amount deducted: ₹{originalSaleData.totalAmount}</p>
                  {originalSaleData.order?.shippingCharge > 0 && (
                    <p>
                      🚚 Shipping charge: ₹
                      {originalSaleData.order.shippingCharge}
                    </p>
                  )}
                </div>
              )}
              {originalSaleData.paymentStatus === "PENDING" && (
                <div className="text-orange-700">
                  <p>⚠️ Payment is pending</p>
                  <p>💰 Amount to be paid: ₹{originalSaleData.totalAmount}</p>
                  {originalSaleData.order?.shippingCharge > 0 && (
                    <p>
                      🚚 Shipping charge: ₹
                      {originalSaleData.order.shippingCharge}
                    </p>
                  )}
                  <p className="text-xs mt-1">
                    This order was completed but payment could not be processed
                    due to insufficient wallet balance.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {originalSaleData && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <h3 className="text-lg font-semibold mb-3 text-green-800">
              Sale Items ({originalSaleData.sales?.length || 0} items)
            </h3>
            <div className="text-sm text-gray-600">
              <p>Subtotal: ₹{originalSaleData.totalAmount}</p>
              {originalSaleData.order?.shippingCharge > 0 && (
                <p>Shipping Charge: ₹{originalSaleData.order.shippingCharge}</p>
              )}
              <p className="font-bold text-green-700">
                Total Amount: ₹
                {originalSaleData.totalAmount +
                  (originalSaleData.order?.shippingCharge || 0)}
              </p>
              <p>Total Items: {originalSaleData.totalItems}</p>
              <p>
                Sale Time:{" "}
                {new Date(originalSaleData.saleTime).toLocaleString()}
              </p>
              <p>Batch Number: {originalSaleData.batchNumber}</p>
              {originalSaleData.invoiceNumber && (
                <p>
                  Invoice Number: INV-
                  {originalSaleData.invoiceNumber.toString().padStart(6, "0")}
                </p>
              )}
              {originalSaleData.invoiceUrl && (
                <div className="mt-2">
                  <p className="font-medium text-green-700">📄 Invoice:</p>
                  <a
                    href={originalSaleData.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Invoice
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wallet Transaction History */}
        {originalSaleData && originalSaleData.paymentStatus === "COMPLETED" && (
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">
              🏦 Wallet Transaction Details
            </h3>
            <div className="text-sm text-blue-700 space-y-2">
              <p>
                <strong>Transaction Type:</strong> DEBIT (Payment for order)
              </p>
              <p>
                <strong>Payment Method:</strong> Wallet
              </p>
              <p>
                <strong>Amount:</strong> ₹{originalSaleData.totalAmount}
              </p>
              <p>
                <strong>Order Reference:</strong> {originalSaleData.batchNumber}
              </p>
              <p>
                <strong>Transaction Date:</strong>{" "}
                {new Date(originalSaleData.saleTime).toLocaleString()}
              </p>
              <div className="mt-3 p-2 bg-blue-100 rounded">
                <p className="text-xs text-blue-800">
                  💡 This transaction was automatically processed when the order
                  was confirmed. The amount was deducted from the customer's
                  wallet balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Payment Information */}
        {originalSaleData && originalSaleData.paymentStatus === "PENDING" && (
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
            <h3 className="text-lg font-semibold mb-3 text-orange-800">
              ⚠️ Pending Payment Information
            </h3>
            <div className="text-sm text-orange-700 space-y-2">
              <p>
                <strong>Payment Status:</strong> PENDING
              </p>
              <p>
                <strong>Reason:</strong> Insufficient wallet balance at time of
                order completion
              </p>
              <p>
                <strong>Amount Due:</strong> ₹{originalSaleData.totalAmount}
              </p>
              <p>
                <strong>Order Reference:</strong> {originalSaleData.batchNumber}
              </p>
              <div className="mt-3 p-2 bg-orange-100 rounded">
                <p className="text-xs text-orange-800">
                  💡 This order was completed successfully but payment could not
                  be processed due to insufficient wallet balance. The customer
                  needs to add funds to their wallet to complete the payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Password Dialog */}
        <PasswordDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
          onSuccess={handlePasswordSuccess}
          title="Enable Edit Mode"
          description="Please enter the password to enable edit mode for this online sale."
        />

        {/* Shipping History Dialog */}
        {showShippingHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  📋 Shipping Change History
                </h3>
                <Button
                  onClick={() => setShowShippingHistory(false)}
                  variant="outline"
                  size="sm"
                >
                  ✕ Close
                </Button>
              </div>

              {shippingHistory.length > 0 ? (
                <div className="space-y-4">
                  {shippingHistory.map((change, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 bg-gray-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">
                            Tracking ID Changes
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">From:</span>
                              <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                                {change.previousTrackingId || "None"}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">To:</span>
                              <span className="ml-2 px-2 py-1 bg-blue-100 rounded text-xs">
                                {change.newTrackingId || "None"}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">
                            Shipping Charge Changes
                          </h4>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium">From:</span>
                              <span className="ml-2 font-semibold">
                                ₹{change.previousShippingCharge || 0}
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">To:</span>
                              <span className="ml-2 font-semibold text-green-600">
                                ₹{change.newShippingCharge || 0}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <div>
                            <p>
                              <span className="font-medium">Changed by:</span>{" "}
                              {change.changedByUser?.name ||
                                change.changedByUser?.phoneNumber}{" "}
                              ({change.changedByUser?.role})
                            </p>
                            <p>
                              <span className="font-medium">Date:</span>{" "}
                              {new Date(change.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {change.changeReason && (
                          <div className="mt-2">
                            <p className="text-xs">
                              <span className="font-medium">Reason:</span>{" "}
                              {change.changeReason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No shipping changes recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SaleDetailsPageWrapper = () => {
  const params = useParams();
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
        <SaleDetailsPage
          params={{
            id: params.id as string,
          }}
        />
      </RoleGateForComponent>
    </>
  );
};

export default SaleDetailsPageWrapper;
