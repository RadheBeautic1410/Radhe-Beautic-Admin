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
import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { getShopList, getUserShop } from "@/src/actions/shop";
import { useEffect } from "react";
import InvoicePreview, { InvoicePayload } from "./invoice-preview/InvoicePreview";

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

const GST_RATE = 5;

const calculateGSTBreakdown = (totalPriceWithGST: number, gstType: GSTType) => {
  if (!totalPriceWithGST || Number.isNaN(totalPriceWithGST)) {
    return {
      basePrice: 0,
      igst: 0,
      sgst: 0,
      cgst: 0,
      totalGST: 0,
    };
  }

  const basePrice = totalPriceWithGST / (1 + GST_RATE / 100);
  const totalGSTAmount = totalPriceWithGST - basePrice;

  if (gstType === "IGST") {
    return {
      basePrice: parseFloat(basePrice.toFixed(2)),
      igst: parseFloat(totalGSTAmount.toFixed(2)),
      sgst: 0,
      cgst: 0,
      totalGST: parseFloat(totalGSTAmount.toFixed(2)),
    };
  }

  const sgst = totalGSTAmount / 2;
  const cgst = totalGSTAmount / 2;
  return {
    basePrice: parseFloat(basePrice.toFixed(2)),
    igst: 0,
    sgst: parseFloat(sgst.toFixed(2)),
    cgst: parseFloat(cgst.toFixed(2)),
    totalGST: parseFloat(totalGSTAmount.toFixed(2)),
  };
};
function SellPage() {
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePayload | null>(
    null
  );
  const shouldPrintAfterSaveRef = useRef(false);
  const [gstType, setGstType] = useState<GSTType>("SGST_CGST");
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

  const fetchNextDisplayBillNo = async (type: "RB" | "HS"): Promise<string> => {
    const res = await fetch(`/api/sales/next-bill-no?type=${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const json = await res.json();
    if (!res.ok || !json?.success || !json?.displayBillNo) {
      throw new Error(json?.error || "Failed to generate bill number");
    }
    return String(json.displayBillNo);
  };

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
            setSelectedShopId(userShopData.id);
          }
        }
      } catch (error) {
        console.error("Error loading shops:", error);
        toast.error("Failed to load shops");
      }
    };
    loadShopsAndUserShop();
  }, [currentUser]);

  const handleFind = async () => {
    try {
      setLoading(true);
      if (code.length < 6) {
        toast.error("Please enter correct code!!!");
        return;
      }
      if (code.length > 7) {
        setSelectedSize(code.slice(7).toUpperCase());
      }

      const res = await axios.post(`/api/kurti/find-kurti`, { code });
      const data = res.data.data;
      console.log("data", data);
      if (data.error) {
        toast.error(data.error);
        setKurti(null);
      } else {
        setKurti(data.kurti);
        // setSellingPrice("");
        // setSelectedSize("");
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

  const draftInvoiceRef = useRef(`DRAFT-${Date.now()}`);
  const [draftDisplayBillNo, setDraftDisplayBillNo] = useState<string>("");

  useEffect(() => {
    if (cart.length === 0) {
      setDraftDisplayBillNo("");
      return;
    }
    if (!draftDisplayBillNo && typeof window !== "undefined") {
      fetchNextDisplayBillNo("RB")
        .then((no) => {
          setDraftDisplayBillNo(no);
        })
        .catch(() => {
          setDraftDisplayBillNo("RB-00000000-00");
        });
    }
  }, [cart.length, draftDisplayBillNo]);

  const draftInvoicePreview = useMemo<InvoicePayload | null>(() => {
    if (cart.length === 0) return null;
    const displayNo =
      draftDisplayBillNo ||
      (typeof window !== "undefined" ? "RB-00000000-00" : draftInvoiceRef.current);
    return {
      batchNumber: draftInvoiceRef.current,
      invoiceNumber: draftInvoiceRef.current,
      displayBatchNumber: displayNo,
      displayInvoiceNumber: displayNo,
      customerName: customerName.trim() || "-",
      customerPhone: customerPhone.trim() || "-",
      billCreatedBy: billCreatedBy.trim() || "-",
      gstType,
      soldProducts: cart.map((item) => ({
        kurti: {
          code: item.kurti.code,
          hsnCode: item.kurti.hsnCode || "6204",
        },
        size: item.selectedSize,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * item.quantity,
      })),
      totalAmount: getTotalAmount(),
      shopName: userShop?.shopName || "Radhe Beautic",
      shopLocation: userShop?.shopLocation || "Surat, Gujarat",
    };
  }, [
    billCreatedBy,
    cart,
    customerName,
    customerPhone,
    gstType,
    userShop?.shopLocation,
    userShop?.shopName,
    draftDisplayBillNo,
  ]);

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
      // if (!shopName.trim()) {
      //   toast.error("Please enter shop name");
      //   return;
      // }

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
        sellType: "SHOP_SELL_OFFLINE",
      });

      const data = res.data.data;
      console.log("🚀 ~ handleSell ~ data:", data);

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Sale completed successfully!");
        // Generate invoice preview payload (for on-page preview / printing)
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
      const soldProducts = cart.map((item) => ({
        kurti: {
          code: item.kurti.code,
          hsnCode: item.kurti.hsnCode || "6204",
        },
        size: item.selectedSize,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * item.quantity,
      }));

      const displayNo =
        draftDisplayBillNo || (await fetchNextDisplayBillNo("RB"));

      const payload: InvoicePayload = {
        batchNumber: saleData.batchNumber || `OFFLINE-INV-${Date.now()}`,
        invoiceNumber:
          saleData.invoiceNumber ||
          saleData.batchNumber ||
          `OFFLINE-INV-${Date.now()}`,
        displayBatchNumber: displayNo,
        displayInvoiceNumber: displayNo,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        gstType,
        soldProducts,
        totalAmount: getTotalAmount(),
        shopName: userShop?.shopName || "Radhe Beautic",
        shopLocation: userShop?.shopLocation || "Surat, Gujarat",
      };

      const key = `invoice_preview_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payload));
      // Open invoice UI in the same page (no route change / no new tab).
      setInvoicePreview(payload);
      setDraftDisplayBillNo("");
    } catch (error) {
      console.error("Error opening invoice preview:", error);
      toast.error("Failed to open invoice preview");
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

  const clearAll = () => {
    resetForm();
    setInvoicePreview(null);
  };

  const handleSave = async (shouldPrint: boolean) => {
    shouldPrintAfterSaveRef.current = shouldPrint;
    await handleSell();
  };

  useEffect(() => {
    if (!invoicePreview) return;
    if (!shouldPrintAfterSaveRef.current) return;
    shouldPrintAfterSaveRef.current = false;
    // Give React a moment to paint the invoice before printing.
    setTimeout(() => {
      window.print();
    }, 150);
  }, [invoicePreview]);

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    console.log("kurti.sizes", kurti.sizes);

    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
  };

  const canCompleteSale =
    cart.length > 0 &&
    customerName.trim().length > 0 &&
    selectedShopId.trim().length > 0 &&
    billCreatedBy.trim().length > 0 &&
    paymentType.trim().length > 0 &&
    !selling;

  const missingCompleteSaleFields = useMemo(() => {
    const missing: string[] = [];
    if (cart.length === 0) missing.push("Add at least 1 item");
    if (!customerName.trim()) missing.push("Customer Name");
    if (!selectedShopId.trim()) missing.push("Shop");
    if (!paymentType.trim()) missing.push("Payment Type");
    if (!billCreatedBy.trim()) missing.push("Bill Created By");
    return missing;
  }, [billCreatedBy, cart.length, customerName, paymentType, selectedShopId]);

  return (
    <Card className="rounded-none w-full h-full">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-area,
          .print-area * {
            visibility: visible !important;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      <CardHeader>
        <p className="text-2xl font-semibold text-center">
          🛒 Offline Multi-Product Sale System
        </p>
      </CardHeader>
      <CardContent className="w-full flex flex-col space-evenly justify-center flex-wrap gap-4">
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">GST Configuration</h3>
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
                  className="w-full p-2 border rounded-md"
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
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
                className="w-full p-2 border rounded-md"
                value={paymentType}
                onChange={(e) => setpaymentType(e.target.value)}
              >
                <option value="">Select Payment Type</option>
                <option value="GPay">GPay</option>
                <option value="Cash">Cash</option>
                <option value="BankTransfer">Bank Transfer</option>
              </select>
            </div>

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

        {/* Add to Cart (no Product Details) */}
        {kurti && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3 text-yellow-800">Add to Cart</h4>
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
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
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
        )}

        {/* Invoice Preview (shown immediately after Add to Cart) */}
        {(invoicePreview || draftInvoicePreview) && (
          <div className="border rounded-lg p-3 bg-white print-area">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <div className="font-semibold">
                {invoicePreview ? "Invoice Preview" : "Draft Invoice Preview"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAll}
                  disabled={selling && cart.length === 0}
                >
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={!canCompleteSale}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {selling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={!canCompleteSale}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {selling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="mr-2 h-4 w-4" />
                  )}
                  Save & Print
                </Button>
              </div>
            </div>
            {!canCompleteSale && missingCompleteSaleFields.length > 0 && (
              <div className="text-sm text-gray-600 mb-2 print:hidden">
                To enable <span className="font-medium">Save</span>, fill:{" "}
                <span className="font-medium">
                  {missingCompleteSaleFields.join(", ")}
                </span>
              </div>
            )}
            <div className="h-px w-full bg-gray-200 mb-3 print:hidden" />
            <InvoicePreview
              embedded
              showPrintButton={false}
              invoice={(invoicePreview || draftInvoicePreview)!}
            />
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
