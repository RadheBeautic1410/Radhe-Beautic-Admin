
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
  Edit,
  Save,
  X,
  Eye,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { generateInvoicePDF } from "@/src/actions/generate-pdf";
import { getShopList, getUserShop } from "@/src/actions/shop";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

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

interface SaleDetailsPageProps {
  params: {
    id: string;
  };
}

function SaleDetailsPage({ params }: SaleDetailsPageProps){
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [gstType, setGstType] = useState<GSTType>("SGST_CGST");
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [originalSaleData, setOriginalSaleData] = useState<any>(null);
  const [removedItems, setRemovedItems] = useState<string[]>([]);
  const [regeneratingInvoice, setRegeneratingInvoice] = useState(false);
  
  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  const [selectedShopId, setSelectedShopId] = useState("");
  const [shops, setShops] = useState<any[]>([]);
  const [paymentType, setpaymentType] = useState("");
  const [userShop, setUserShop] = useState<any>(null);

  // Current product selection
  const [selectedSize, setSelectedSize] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState(1);

  const currentUser = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
    const loadSaleDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `/api/sell/offline-sales/${params.id}`
        );
        
        const saleData = response.data.data;
        setOriginalSaleData(saleData);
        
        // Populate form fields with existing data
        setCustomerName(saleData.customerName || "");
        setCustomerPhone(saleData.customerPhone || "");
        setBillCreatedBy(saleData.billCreatedBy || "");
        setpaymentType(saleData.paymentType || "");
        setGstType(saleData.gstType || "SGST_CGST");
        setSelectedShopId(saleData.shopId || "");

        console.log("response", response);
        console.log("saleData.sales", response.data.data);
        
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
        
      } catch (error: any) {
        console.error("Error loading sale details:", error);
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadSaleDetails();
    }
  }, [params.id]);

  // Load shops and user's shop on component mount
  useEffect(() => {
    const loadShopsAndUserShop = async () => {
      try {
        const shopList = await getShopList();
        setShops(shopList);

        // If user is SELLER or SELLER_MANAGER, get their associated shop
        if (
          currentUser?.id &&
          (currentUser.role === UserRole.SELLER ||
            currentUser.role === UserRole.SELLER_MANAGER ||
            currentUser.role === UserRole.SHOP_SELLER)
        ) {
          const userShopData = await getUserShop(currentUser.id);
          if (userShopData) {
            setUserShop(userShopData);
            // Only set shop if not already set from sale data
            if (!selectedShopId) {
              setSelectedShopId(userShopData.id);
            }
          }
        }
      } catch (error) {
        console.error("Error loading shops:", error);
        toast.error("Failed to load shops");
      }
    };
    loadShopsAndUserShop();
  }, [currentUser, selectedShopId]);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditMode) {
      // Cancel edit mode - restore original data
      if (originalSaleData) {
        setCustomerName(originalSaleData.customerName || "");
        setCustomerPhone(originalSaleData.customerPhone || "");
        setBillCreatedBy(originalSaleData.billCreatedBy || "");
        setpaymentType(originalSaleData.paymentType || "");
        setGstType(originalSaleData.gstType || "SGST_CGST");
        setSelectedShopId(originalSaleData.shopId || "");
        
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

      if (!paymentType.trim()) {
        toast.error("Payment type is required");
        return;
      }

      // Prepare data for API call
      const updateData: any = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        paymentType: paymentType.trim(),
        gstType: gstType,
      };

      // Add new products if any are in the cart that weren't in the original data
      const originalSaleIds = originalSaleData?.sales?.map((sale: any) => sale.id) || [];
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
        `/api/sell/offline-sales/${params.id}`,
        updateData
      );

      if (response.data.success) {
        toast.success("Sale updated successfully!");
        setOriginalSaleData(response.data.data);
        
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
        
        // Handle invoice regeneration
        if (response.data.invoiceRegenerated && response.data.newInvoiceUrl) {
          toast.success("Invoice regenerated successfully!");
          
          // Download the new invoice
          try {
            const link = document.createElement("a");
            link.href = response.data.newInvoiceUrl;
            link.download = `invoice-${response.data.data.batchNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("New invoice downloaded!");
          } catch (error) {
            console.error("Error downloading invoice:", error);
            toast.error("Failed to download invoice");
          }
        }
        
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
  console.log("🚀 ~ SaleDetailsPage ~ cart:", cart);

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
    if (!itemId.startsWith('temp-')) {
      // This is an existing item that was removed
      setRemovedItems(prev => [...prev, itemId]);
    }
    
    toast.success("Item removed from cart");
  };

  const updateCartItemQuantity = async (itemId: string, newQuantity: number) => {
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

      if (!selectedShopId.trim()) {
        if (currentUser?.role === UserRole.ADMIN) {
          toast.error("Please select a shop");
        } else {
          toast.error("No shop associated with your account");
        }
        return;
      }

      if (!billCreatedBy.trim()) {
        toast.error("Please enter bill created by");
        return;
      }
      if (!paymentType.trim()) {
        toast.error("Please select payment type");
        return;
      }

      const currentTime = getCurrTime();

      // Prepare products data for API
      const products = cart.map((item) => ({
        code: item.kurti.code.toUpperCase() + item.selectedSize.toUpperCase(),
        kurti: item.kurti,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      }));

      const res = await axios.post(`/api/sell/offline-retailer`, {
        products,
        currentUser,
        currentTime: currentTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        paymentType: paymentType.trim(),
        gstType: gstType,
        shopId: selectedShopId.trim(),
      });

      const data = res.data.data;
      console.log("🚀 ~ handleSell ~ data:", data)

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Sale completed successfully!");
        // Generate invoice
        await generateInvoice(data);

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
      // Convert cart items to the format expected by the shared utility
      const soldProducts = cart.map((item) => ({
        kurti: item.kurti,
        size: item.selectedSize,
        quantity: item.quantity,
        selledPrice: item.sellingPrice,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * item.quantity,
      }));

      // Call the server action for PDF generation
      const result = await generateInvoicePDF({
        saleData,
        batchNumber: saleData.batchNumber || `OFFLINE-INV-${Date.now()}`,
        customerName,
        customerPhone,
        selectedLocation: userShop?.shopLocation || "",
        billCreatedBy,
        currentUser,
        soldProducts,
        totalAmount: getTotalAmount(),
        gstType,
        invoiceNumber: saleData.invoiceNumber || "",
      });

      if (!result.success || !result.pdfBase64) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      // Convert base64 string to Blob and trigger download
      const binaryString = atob(result.pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${
        saleData.batchNumber || `OFFLINE-INV-${Date.now()}`
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Invoice PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF invoice");
    }
  };

  const resetForm = () => {
    setCode("");
    setKurti(null);
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    // Reset shop based on user role
    if (currentUser?.role === UserRole.ADMIN) {
      setSelectedShopId("");
    } else if (userShop) {
      setSelectedShopId(userShop.id);
    }
    setBillCreatedBy("");
    setpaymentType("");
    setGstType("SGST_CGST");
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);
  };

  const regenerateInvoice = async () => {
    try {
      setRegeneratingInvoice(true);
      
      const response = await axios.post(`/api/sell/offline-sales/${params.id}/regenerate-invoice`);
      
      if (response.data.success) {
        toast.success("Invoice regenerated successfully!");
        
        // Download the new invoice
        try {
          const link = document.createElement("a");
          link.href = response.data.invoiceUrl;
          link.download = `invoice-${originalSaleData.batchNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success("New invoice downloaded!");
        } catch (error) {
          console.error("Error downloading invoice:", error);
          toast.error("Failed to download invoice");
        }
      } else {
        toast.error(response.data.error || "Failed to regenerate invoice");
      }
    } catch (error: any) {
      console.error("Error regenerating invoice:", error);
      toast.error(error.response?.data?.error || "Failed to regenerate invoice");
    } finally {
      setRegeneratingInvoice(false);
    }
  };

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
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
          <p className="text-2xl font-semibold text-center">
            {isEditMode ? "✏️ Edit Offline Sale" : "👁️ View Offline Sale"}
          </p>
          <div className="flex gap-2">
            {!isEditMode ? (
              <>
                <Button
                  onClick={toggleEditMode}
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
        <div className={`p-4 rounded-lg ${isEditMode ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-blue-50'}`}>
          <h3 className="text-lg font-semibold mb-3">
            {isEditMode ? "🔄 Edit Mode Active" : "📋 Sale Information"}
          </h3>
          {isEditMode && (
            <p className="text-sm text-yellow-700 mb-3">
              You are currently editing this sale. Make your changes and click "Save Changes" to update.
            </p>
          )}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="gstType"
                value="SGST_CGST"
                checked={gstType === "SGST_CGST"}
                onChange={(e) => setGstType(e.target.value as GSTType)}
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
                onChange={(e) => setGstType(e.target.value as GSTType)}
                disabled={!isEditMode}
              />
              <span>IGST (5%)</span>
            </label>
          </div>
        </div>
        
        {/* Customer Details Section */}
        <div className="bg-blue-50 p-4 rounded-lg">
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
                  // Only allow digits
                  if (/^\d*$/.test(input)) {
                    setCustomerPhone(input);
                  }
                }}
                disabled={!isEditMode}
                className={!isEditMode ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label htmlFor="shop-select">
                {currentUser?.role === (UserRole.ADMIN || UserRole.SELLER)
                  ? "Select Shop *"
                  : "Shop"}
              </Label>
              {currentUser?.role === (UserRole.ADMIN || UserRole.SELLER) ? (
                <select
                  id="shop-select"
                  name="shop-select"
                  aria-label="Select shop"
                  className={`w-full p-2 border rounded-md ${!isEditMode ? "bg-gray-50" : ""}`}
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  disabled={!isEditMode}
                >
                  <option value="">Select Shop</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.shopName} - {shop.shopLocation}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full p-2 border rounded-md bg-gray-50">
                  {userShop ? (
                    <span className="text-gray-700 font-medium">
                      {userShop.shopName} - {userShop.shopLocation}
                    </span>
                  ) : (
                    <span className="text-gray-500">No shop associated</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="payment-type">Payment Type *</Label>
              <select
                id="payment-type"
                name="payment-type"
                aria-label="Select payment type"
                className={`w-full p-2 border rounded-md ${!isEditMode ? "bg-gray-50" : ""}`}
                value={paymentType}
                onChange={(e) => setpaymentType(e.target.value)}
                disabled={!isEditMode}
              >
                <option value="">Select Payment Type</option>
                <option value="GPay">GPay</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
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
              {isEditMode ? "Edit Cart Items" : "Sale Items"} ({cart.length} items)
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
                    disabled={selling}
                  >
                    Clear Cart
                  </Button>
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

