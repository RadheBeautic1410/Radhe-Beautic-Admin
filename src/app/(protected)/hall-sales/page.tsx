"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { PaymentStatus, UserRole } from "@prisma/client";
import axios from "axios";
import {
  Loader2,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { getUserShop, getHallSaleShops } from "@/src/actions/shop";
import InvoicePreview, {
  InvoicePayload,
} from "@/src/app/(protected)/sellRetailer/invoice-preview/InvoicePreview";

const getCurrTime = () => {
  const currentTime = new Date();
  const ISTOffset = 5.5 * 60 * 60 * 1000;
  const ISTTime = new Date(currentTime.getTime() + ISTOffset);
  return ISTTime;
};

const fetchNextHallDisplayBillNo = async (): Promise<string> => {
  const res = await fetch("/api/sales/next-bill-no?type=HS", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "HS" }),
  });
  const json = await res.json();
  if (!res.ok || !json?.success || !json?.displayBillNo) {
    throw new Error(json?.error || "Failed to generate bill number");
  }
  return String(json.displayBillNo);
};

interface CartItem {
  id: string;
  lineType: "TRACKED" | "UNTRACKED";
  kurti?: any;
  category: string;
  selectedSize: string;
  quantity: number;
  sellingPrice: number;
  availableStock: number | null;
  hsnCode?: string;
}
type GSTType = "IGST" | "SGST_CGST";
function HallSalesPage() {
  const [code, setCode] = useState("");
  const [kurti, setKurti] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  // Cart pagination (UI-only; totals/invoice still use full cart)
  const [cartPage, setCartPage] = useState(1);
  const [cartPageSize, setCartPageSize] = useState(25);
  const [gstType, setGstType] = useState<GSTType>("SGST_CGST");
  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  const [selectedShopId, setSelectedShopId] = useState("");
  const [shops, setShops] = useState<any[]>([]);
  const [paymentType, setpaymentType] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    PaymentStatus.PENDING
  );
  const [userShop, setUserShop] = useState<any>(null);
  const [invoicePreview, setInvoicePreview] = useState<InvoicePayload | null>(
    null
  );
  const shouldPrintAfterSaveRef = useRef(false);

  // Current product selection
  const [selectedSize, setSelectedSize] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [untrackedCategory, setUntrackedCategory] = useState("");
  const [untrackedSize, setUntrackedSize] = useState("");
  const [untrackedQuantity, setUntrackedQuantity] = useState<string>("1");
  const [untrackedPrice, setUntrackedPrice] = useState<string>("");

  // Bulk add sizes modal state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelectedSizes, setBulkSelectedSizes] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const selectAllSizesRef = useRef<HTMLInputElement | null>(null);

  const currentUser = useCurrentUser();
  const selectedShop = useMemo(() => {
    if (currentUser?.role !== UserRole.ADMIN) return userShop;
    return shops.find((s) => s.id === selectedShopId) || null;
  }, [currentUser?.role, selectedShopId, shops, userShop]);

  // Load shops and user's shop on component mount
  useEffect(() => {
    const loadShopsAndUserShop = async () => {
      try {
        // For admin users, get only shops with isHallSell = true
        // For seller managers, get their associated shop
        if (currentUser?.role === UserRole.ADMIN) {
          const hallSaleShops = await getHallSaleShops();
          setShops(hallSaleShops);
        } else if (
          currentUser?.id &&
          (currentUser.role === UserRole.SELLER ||
            currentUser.role === UserRole.SELLER_MANAGER ||
            currentUser.role === UserRole.SHOP_SELLER)
        ) {
          const userShopData = await getUserShop(currentUser.id);
          if (userShopData) {
            setUserShop(userShopData);
            setSelectedShopId(userShopData.id);
            // For non-admin users, only show their shop in the list if it's a hall sale shop
            if (userShopData.isHallSell) {
              setShops([userShopData]);
            } else {
              setShops([]);
              toast.warning("Your associated shop is not configured for hall sales");
            }
          }
        }
        const categoryRes = await axios.get("/api/category?limit=500");
        const categoryData = Array.isArray(categoryRes?.data?.data)
          ? categoryRes.data.data
          : [];
        setCategories(
          categoryData
            .map((c: any) => String(c?.name || "").trim())
            .filter((name: string) => !!name)
        );
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

    addToCartBySize({
      size: selectedSize,
      qty: quantity,
      price: parseInt(sellingPrice),
      sizeInfoQuantity: sizeInfo.quantity,
    });

    // Reset current product selection
    setCode("");
    setKurti(null);
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);

    toast.success("Product added to cart!");
  };

  const addToCartBySize = ({
    size,
    qty,
    price,
    sizeInfoQuantity,
  }: {
    size: string;
    qty: number;
    price: number;
    sizeInfoQuantity: number;
  }) => {
    if (!kurti) return;

    const normalizedSize = String(size).toUpperCase();

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.lineType === "TRACKED" &&
          item.kurti.code === kurti.code && item.selectedSize === normalizedSize
      );

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const totalQuantity = existing.quantity + qty;
        if (totalQuantity > sizeInfoQuantity) {
          toast.error(
            `Total quantity exceeds available stock for size ${normalizedSize}`
          );
          return prev;
        }
        const next = [...prev];
        next[existingIndex] = {
          ...existing,
          quantity: totalQuantity,
          sellingPrice: price,
          availableStock: sizeInfoQuantity,
        };
        return next;
      }

      return [
        ...prev,
        {
          id: `${kurti.code}-${normalizedSize}-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          lineType: "TRACKED",
          kurti,
          category: kurti.category || "-",
          selectedSize: normalizedSize,
          quantity: qty,
          sellingPrice: price,
          availableStock: sizeInfoQuantity,
        } satisfies CartItem,
      ];
    });
  };

  const handleBulkAdd = () => {
    if (!kurti) {
      toast.error("Please find a product first");
      return;
    }

    const price = parseInt(bulkPrice);
    if (!bulkPrice || Number.isNaN(price) || price <= 0) {
      toast.error("Please enter valid price");
      return;
    }

    if (bulkSelectedSizes.length === 0) {
      toast.error("Please select at least one size");
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    // Build nextCart once to avoid React state overwrite during loops
    const nextCart: CartItem[] = [...cart];

    bulkSelectedSizes.forEach((size) => {
      const normalizedSize = String(size).toUpperCase();
      const sizeInfo = kurti.sizes.find(
        (sz: any) => String(sz.size).toUpperCase() === normalizedSize
      );

      if (!sizeInfo || (sizeInfo.quantity ?? 0) <= 0) {
        skippedCount++;
        return;
      }

      const existingIndex = nextCart.findIndex(
        (item) =>
          item.lineType === "TRACKED" &&
          item.kurti.code === kurti.code && item.selectedSize === normalizedSize
      );

      if (existingIndex >= 0) {
        const existing = nextCart[existingIndex];
        const totalQuantity = existing.quantity + 1;
        if (totalQuantity > sizeInfo.quantity) {
          skippedCount++;
          return;
        }
        nextCart[existingIndex] = {
          ...existing,
          quantity: totalQuantity,
          sellingPrice: price,
          availableStock: sizeInfo.quantity,
        };
        addedCount++;
        return;
      }

      nextCart.push({
        id: `${kurti.code}-${normalizedSize}-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`,
        lineType: "TRACKED",
        kurti,
        category: kurti.category || "-",
        selectedSize: normalizedSize,
        quantity: 1,
        sellingPrice: price,
        availableStock: sizeInfo.quantity,
      });
      addedCount++;
    });

    setCart(nextCart);

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} size(s) to cart`);
    }
    if (skippedCount > 0) {
      toast.warning(`Skipped ${skippedCount} size(s) due to no stock`);
    }

    setBulkOpen(false);
    setBulkSelectedSizes([]);
    setBulkPrice("");
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
        if (
          item.lineType === "TRACKED" &&
          item.availableStock !== null &&
          newQuantity > item.availableStock
        ) {
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

  const addUntrackedToCart = () => {
    const category = untrackedCategory.trim();
    const size = untrackedSize.trim().toUpperCase();
    const quantity = Number(untrackedQuantity || 0);
    const price = Number(untrackedPrice || 0);
    if (!category) {
      toast.error("Please select category for untracked kurti");
      return;
    }
    if (quantity <= 0) {
      toast.error("Please enter valid quantity");
      return;
    }
    if (price <= 0) {
      toast.error("Please enter valid unit price");
      return;
    }

    const existingItemIndex = cart.findIndex(
      (item) =>
        item.lineType === "UNTRACKED" &&
        item.category.toUpperCase() === category.toUpperCase() &&
        item.selectedSize.toUpperCase() === size &&
        item.sellingPrice === price
    );
    if (existingItemIndex >= 0) {
      const updated = [...cart];
      updated[existingItemIndex] = {
        ...updated[existingItemIndex],
        quantity: updated[existingItemIndex].quantity + quantity,
      };
      setCart(updated);
    } else {
      setCart((prev) => [
        ...prev,
        {
          id: `UNTRACKED-${category}-${size}-${Date.now()}`,
          lineType: "UNTRACKED",
          category,
          selectedSize: size,
          quantity,
          sellingPrice: price,
          availableStock: null,
          hsnCode: "6204",
        },
      ]);
    }
    setUntrackedCategory("");
    setUntrackedSize("");
    setUntrackedQuantity("1");
    setUntrackedPrice("");
    toast.success("Untracked kurti added");
  };

  const cartTotalPages = useMemo(() => {
    const size = Math.max(1, cartPageSize);
    return Math.max(1, Math.ceil(cart.length / size));
  }, [cart.length, cartPageSize]);

  useEffect(() => {
    // Keep page in range when cart changes or page size changes
    setCartPage((p) => Math.min(Math.max(1, p), cartTotalPages));
  }, [cartTotalPages, cart.length]);

  const paginatedCart = useMemo(() => {
    const size = Math.max(1, cartPageSize);
    const page = Math.min(Math.max(1, cartPage), cartTotalPages);
    const start = (page - 1) * size;
    return cart.slice(start, start + size);
  }, [cart, cartPage, cartPageSize, cartTotalPages]);

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

  const draftInvoiceRef = useRef(`DRAFT-${Date.now()}`);
  const [draftDisplayBillNo, setDraftDisplayBillNo] = useState<string>("");

  useEffect(() => {
    // Create a stable draft display bill no only once per draft (avoids increment on re-render)
    if (cart.length === 0) {
      setDraftDisplayBillNo("");
      return;
    }
    if (!draftDisplayBillNo && typeof window !== "undefined") {
      fetchNextHallDisplayBillNo()
        .then((no) => {
          setDraftDisplayBillNo(no);
        })
        .catch((e) => {
          console.error(e);
          // fallback (still allows saving, but without short number)
          setDraftDisplayBillNo("HS-00000000-00");
        });
    }
  }, [cart.length, draftDisplayBillNo]);

  const draftInvoicePreview = useMemo<InvoicePayload | null>(() => {
    if (cart.length === 0) return null;
    const displayNo =
      draftDisplayBillNo ||
      (typeof window !== "undefined" ? "HS-00000000-00" : draftInvoiceRef.current);
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
          code:
            item.lineType === "TRACKED" ? item.kurti.code : item.category,
          hsnCode: item.hsnCode || "6204",
        },
        size: item.selectedSize,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * item.quantity,
      })),
      totalAmount: getTotalAmount(),
      shopName: selectedShop?.shopName || "Radhe Beautic",
      shopLocation: selectedShop?.shopLocation || "Surat, Gujarat",
    };
  }, [
    billCreatedBy,
    cart,
    customerName,
    customerPhone,
    gstType,
    selectedShop?.shopLocation,
    selectedShop?.shopName,
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
      if (!paymentStatus) {
        toast.error("Please select payment status");
        return;
      }
      // if (!shopName.trim()) {
      //   toast.error("Please enter shop name");
      //   return;
      // }

      const currentTime = getCurrTime();

      // Prepare products data for API
      const trackedProducts = cart
        .filter((item) => item.lineType === "TRACKED")
        .map((item) => ({
          code: item.kurti.code.toUpperCase() + item.selectedSize.toUpperCase(),
          kurti: item.kurti,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
        }));
      const untrackedProducts = cart
        .filter((item) => item.lineType === "UNTRACKED")
        .map((item) => ({
          category: item.category,
          selectedSize: item.selectedSize || null,
          quantity: item.quantity,
          sellingPrice: item.sellingPrice,
          hsnCode: item.hsnCode || "6204",
        }));

      const res = await axios.post(`/api/sell/offline-retailer`, {
        trackedProducts,
        untrackedProducts,
        currentUser,
        currentTime: currentTime,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        paymentType: paymentType.trim(),
        paymentStatus,
        gstType: gstType,
        shopId: selectedShopId.trim(),
        sellType: "HALL_SELL_OFFLINE", // Mark this as a hall sale
      });

      const data = res.data.data;
      console.log("🚀 ~ handleSell ~ data:", data);

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Sale completed successfully!");
        // Open invoice preview UI (like /sellRetailer). No PDF generation here.
        openInvoicePreview(data);
      }
    } catch (error) {
      console.error("Error selling products:", error);
      toast.error("Error processing sale");
    } finally {
      setSelling(false);
    }
  };

  const openInvoicePreview = async (saleData: any) => {
    try {
      const soldProducts = cart.map((item) => ({
        kurti: {
          code:
            item.lineType === "TRACKED" ? item.kurti.code : item.category,
          hsnCode: item.hsnCode || "6204",
        },
        size: item.selectedSize,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        totalPrice: item.sellingPrice * item.quantity,
      }));

      // Prefer the already-reserved draft number if present; otherwise request one.
      const displayNo =
        draftDisplayBillNo || (await fetchNextHallDisplayBillNo());
      const payload: InvoicePayload = {
        batchNumber: saleData.batchNumber || `HALL-INV-${Date.now()}`,
        invoiceNumber:
          saleData.invoiceNumber ||
          saleData.batchNumber ||
          `HALL-INV-${Date.now()}`,
        displayBatchNumber: displayNo,
        displayInvoiceNumber: displayNo,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        billCreatedBy: billCreatedBy.trim(),
        gstType,
        soldProducts,
        totalAmount: getTotalAmount(),
        shopName: selectedShop?.shopName || "Radhe Beautic",
        shopLocation: selectedShop?.shopLocation || "Surat, Gujarat",
      };

      // Persist the generated bill number as the batchNumber in DB
      if (saleData?.batchNumber) {
        try {
          await fetch("/api/sales/update-batch-number", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              oldBatchNumber: saleData.batchNumber,
              newBatchNumber: displayNo,
            }),
          });
          // Also reflect it in the local payload
          payload.batchNumber = displayNo;
          payload.invoiceNumber = displayNo;
        } catch (e) {
          console.error("Failed to persist batch number", e);
        }
      }

      const key = `invoice_preview_${Date.now()}`;
      localStorage.setItem(key, JSON.stringify(payload));
      setInvoicePreview(payload);

      if (saleData.batchNumber) {
        toast.success(`Invoice saved with batch number: ${saleData.batchNumber}`);
      }

      // Reset inputs + cart after a successful sale, but keep the preview visible.
      resetForm();
      // Reset draft reserved number for next sale.
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
    setPaymentStatus(PaymentStatus.PENDING);
    setGstType("SGST_CGST");
    setSelectedSize("");
    setSellingPrice("");
    setQuantity(1);
    setUntrackedCategory("");
    setUntrackedSize("");
    setUntrackedQuantity("1");
    setUntrackedPrice("");
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
    setTimeout(() => {
      window.print();
    }, 150);
  }, [invoicePreview]);

  const getAvailableSizes = () => {
    if (!kurti?.sizes) return [];
    return kurti.sizes.filter((sz: any) => sz.quantity > 0);
  };

  const bulkAvailableSizes = useMemo(() => {
    return getAvailableSizes().map((sz: any) => String(sz.size).toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurti]);

  const allBulkSelected =
    bulkAvailableSizes.length > 0 &&
    bulkAvailableSizes.every((s: string) => bulkSelectedSizes.includes(s));
  const someBulkSelected =
    bulkSelectedSizes.length > 0 && !allBulkSelected;

  useEffect(() => {
    if (!selectAllSizesRef.current) return;
    selectAllSizesRef.current.indeterminate = someBulkSelected;
  }, [someBulkSelected]);

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
          🛒 Offline Hall Sale System
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
                {currentUser?.role === UserRole.ADMIN
                  ? "Select Hall Sale Shop *"
                  : "Hall Sale Shop"}
              </Label>
              {currentUser?.role === UserRole.ADMIN ? (
                <select
                  id="shop-select"
                  name="shop-select"
                  aria-label="Select shop"
                  className="w-full p-2 border rounded-md"
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                >
                  <option value="">Select Hall Sale Shop</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.shopName} - {shop.shopLocation}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full p-2 border rounded-md bg-gray-50">
                  {userShop && userShop.isHallSell ? (
                    <span className="text-gray-700 font-medium">
                      {userShop.shopName} - {userShop.shopLocation}
                    </span>
                  ) : userShop ? (
                    <span className="text-red-500">
                      Shop not configured for hall sales
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
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <Label htmlFor="payment-status">Payment Status *</Label>
              <select
                id="payment-status"
                name="payment-status"
                aria-label="Select payment status"
                className="w-full p-2 border rounded-md"
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as PaymentStatus)
                }
              >
                <option value={PaymentStatus.PENDING}>Pending</option>
                <option value={PaymentStatus.COMPLETED}>Complete</option>
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

        <div className="bg-amber-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Add Untracked Kurti</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-end">
            <div>
              <Label htmlFor="untracked-category">Category *</Label>
              <select
                id="untracked-category"
                className="w-full p-2 border rounded-md"
                value={untrackedCategory}
                onChange={(e) => setUntrackedCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="untracked-size">Size (Optional)</Label>
              <Input
                id="untracked-size"
                placeholder="e.g. M"
                value={untrackedSize}
                onChange={(e) => setUntrackedSize(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="untracked-qty">Quantity *</Label>
              <Input
                id="untracked-qty"
                type="number"
                min="1"
                value={untrackedQuantity}
                onChange={(e) => setUntrackedQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="untracked-price">Unit Price *</Label>
              <Input
                id="untracked-price"
                type="number"
                min="1"
                value={untrackedPrice}
                onChange={(e) => setUntrackedPrice(e.target.value)}
              />
            </div>
            <Button type="button" onClick={addUntrackedToCart}>
              Add Untracked
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xl font-bold">
                    Code: {kurti.code.toUpperCase()}
                  </p>

                  <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Add multiple sizes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Add multiple sizes</DialogTitle>
                        <DialogDescription>
                          Select sizes and enter a price. Each selected size will
                          be added with quantity = 1.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="bulk-price">Selling Price *</Label>
                          <Input
                            id="bulk-price"
                            type="number"
                            min="1"
                            placeholder="Enter selling price"
                            value={bulkPrice}
                            onChange={(e) => setBulkPrice(e.target.value)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <Label>Select Sizes *</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setBulkSelectedSizes([])}
                              disabled={bulkSelectedSizes.length === 0}
                            >
                              Clear
                            </Button>
                          </div>

                          <label className="mt-2 flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50">
                            <input
                              ref={selectAllSizesRef}
                              type="checkbox"
                              checked={allBulkSelected}
                              onChange={(e) => {
                                const next = e.target.checked;
                                setBulkSelectedSizes(
                                  next ? bulkAvailableSizes : []
                                );
                              }}
                              disabled={bulkAvailableSizes.length === 0}
                            />
                            <span className="text-sm font-medium">
                              Select all sizes
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              {bulkSelectedSizes.length}/{bulkAvailableSizes.length}
                            </span>
                          </label>

                          <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {getAvailableSizes().map((sz: any) => {
                              const size = String(sz.size).toUpperCase();
                              const checked = bulkSelectedSizes.includes(size);
                              return (
                                <label
                                  key={size}
                                  className="flex items-center gap-2 rounded-md border px-2 py-2 cursor-pointer hover:bg-gray-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = e.target.checked;
                                      setBulkSelectedSizes((prev) => {
                                        const set = new Set(prev);
                                        if (next) set.add(size);
                                        else set.delete(size);
                                        return Array.from(set);
                                      });
                                    }}
                                  />
                                  <span className="text-sm font-medium">
                                    {size}
                                  </span>
                                  <span className="ml-auto text-xs text-gray-500">
                                    {sz.quantity}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBulkOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="button" onClick={handleBulkAdd}>
                            Add sizes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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
              Shopping Cart ({cart.length} items)
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {(cartPage - 1) * cartPageSize + 1}
                </span>
                {" "}to{" "}
                <span className="font-medium">
                  {Math.min(cartPage * cartPageSize, cart.length)}
                </span>{" "}
                of <span className="font-medium">{cart.length}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Label className="text-sm">Rows</Label>
                <select
                  aria-label="Cart rows per page"
                  className="p-2 border rounded-md bg-white text-sm"
                  value={cartPageSize}
                  onChange={(e) => {
                    const next = parseInt(e.target.value) || 25;
                    setCartPageSize(next);
                    setCartPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCartPage((p) => Math.max(1, p - 1))}
                  disabled={cartPage <= 1}
                >
                  Prev
                </Button>
                <div className="text-sm text-gray-700 min-w-[90px] text-center">
                  Page <span className="font-medium">{cartPage}</span> /{" "}
                  <span className="font-medium">{cartTotalPages}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCartPage((p) => Math.min(cartTotalPages, p + 1))
                  }
                  disabled={cartPage >= cartTotalPages}
                >
                  Next
                </Button>
              </div>
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
                  {paginatedCart.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="border">
                        <div className="flex items-center gap-3">
                          {item.lineType === "TRACKED" &&
                          item.kurti?.images?.[0]?.url ? (
                            <img
                              src={item.kurti.images[0].url}
                              alt={item.kurti.code}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                              N/A
                            </div>
                          )}
                          <div>
                            <div className="font-semibold">
                              {item.lineType === "TRACKED"
                                ? item.kurti.code.toUpperCase()
                                : item.category.toUpperCase()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.category}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="border">
                        {item.selectedSize ? item.selectedSize.toUpperCase() : "-"}
                      </TableCell>
                      <TableCell className="border">
                        <Input
                          type="number"
                          min="1"
                          max={item.availableStock || undefined}
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
                Total Amount: ₹{getTotalAmount()}
              </div>
              <div className="flex gap-3">
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearAll}
                  disabled={selling}
                >
                  Clear All
                </Button>
              </div>
            </div>
            {!canCompleteSale && missingCompleteSaleFields.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                To enable <span className="font-medium">Save</span>, fill:{" "}
                <span className="font-medium">
                  {missingCompleteSaleFields.join(", ")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Invoice Preview (like /sellRetailer). Shows draft when cart exists; final after save. */}
        {(invoicePreview || draftInvoicePreview) && (
          <div className="border rounded-lg p-3 bg-white print-area">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <div className="font-semibold">
                {invoicePreview ? "Invoice Preview" : "Draft Invoice Preview"}
              </div>
            </div>
            <div className="h-px w-full bg-gray-200 mb-3 print:hidden" />
            <InvoicePreview
              embedded
              showPrintButton={false}
              groupByCode
              invoice={(invoicePreview || draftInvoicePreview)!}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const HallSalesPageWrapper = () => {
  return (
    <>
      <RoleGateForComponent
        allowedRole={[
          UserRole.ADMIN,
          // UserRole.SELLER,
          // UserRole.SHOP_SELLER,
          UserRole.SELLER_MANAGER,
        ]}
      >
        <HallSalesPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default HallSalesPageWrapper;
