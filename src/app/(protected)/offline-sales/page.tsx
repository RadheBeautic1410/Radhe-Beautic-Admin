"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { UserRole } from "@prisma/client";
import axios from "axios";
import {
  Loader2,
  Download,
  Eye,
  Calendar as CalendarIcon,
  ShoppingBag,
  User,
  Phone,
  Building,
  FileText,
  Search,
  X,
  Filter,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import NotAllowedPage from "@/src/app/(protected)/_components/errorPages/NotAllowedPage";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { getShopList } from "@/src/actions/shop";
import { useDebounce } from "@/src/hooks/useDebounce";
import { DateRange } from "react-day-picker";
import { format, addDays } from "date-fns";
import { cn } from "@/src/lib/utils";

interface OfflineSale {
  id: string;
  batchNumber: string;
  invoiceNumber?: number;
  customerName: string;
  customerPhone?: string;
  billCreatedBy: string;
  totalAmount: number;
  totalItems: number;
  saleTime: string;
  sellerName: string;
  paymentType?: string;
  gstType?: string;
  invoiceUrl?: string;
  isHallSell?: boolean;
  shop?: {
    id: string;
    shopName: string;
    shopLocation: string;
  };
  sales: Array<{
    id: string;
    code: string;
    kurtiSize: string;
    selledPrice?: number;
    kurti: {
      code: string;
      category: string;
      party: string;
      images: Array<{ url: string }>;
    };
  }>;
}

interface SalesData {
  sales: OfflineSale[];
  total: number;
  totalPages: number;
  currentPage: number;
}

function OfflineSalesPage() {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedShopId, setSelectedShopId] = useState("all");
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("customerName");

  // Date range filter states
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Debounced search query for API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const currentUser = useCurrentUser();
  const router = useRouter();

  // Load shops for admin
  useEffect(() => {
    const loadShops = async () => {
      if (currentUser?.role === UserRole.ADMIN) {
        try {
          setShopsLoading(true);
          const shopList = await getShopList();
          setShops(shopList);
        } catch (error) {
          console.error("Error loading shops:", error);
          toast.error("Failed to load shops");
        } finally {
          setShopsLoading(false);
        }
      }
    };
    loadShops();
  }, [currentUser]);

  // Load sales data
  const loadSales = async (
    page: number = 1,
    shopId: string = "all",
    search: string = "",
    searchType: string = "customerName",
    startDate?: string,
    endDate?: string
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (shopId && shopId !== "all") {
        params.append("shopId", shopId);
      }

      if (search.trim()) {
        params.append("search", search.trim());
        params.append("searchType", searchType);
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      const response = await axios.get(`/api/sell/offline-sales?${params}`);
      const data: SalesData = response.data.data;

      setSales(data.sales);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCurrentPage(data.currentPage);
    } catch (error) {
      console.error("Error loading sales:", error);
      toast.error("Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const startDate = dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined;
    const endDate = dateRange?.to
      ? format(dateRange.to, "yyyy-MM-dd")
      : undefined;
    loadSales(
      currentPage,
      selectedShopId,
      debouncedSearchQuery,
      searchType,
      startDate,
      endDate
    );
  }, [
    currentPage,
    selectedShopId,
    debouncedSearchQuery,
    searchType,
    dateRange,
  ]);

  const handleShopChange = (shopId: string) => {
    setSelectedShopId(shopId);
    setCurrentPage(1); // Reset to first page when changing shop
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchType("customerName");
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const handleSearchTypeChange = (type: string) => {
    setSearchType(type);
    setCurrentPage(1);
  };

  const handleDateFilterToggle = () => {
    setShowDateFilter(!showDateFilter);
  };

  const handleDateFilterApply = () => {
    setCurrentPage(1);
  };

  const handleDateFilterClear = () => {
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const downloadInvoice = async (
    invoiceUrl: string,
    batchNumber: string,
    invoiceNumber?: number
  ) => {
    try {
      const response = await fetch(invoiceUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = invoiceNumber
        ? `invoice-INV-${invoiceNumber.toString().padStart(6, "0")}.pdf`
        : `invoice-${batchNumber}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
    } catch (error) {
      console.error("Error downloading invoice:", error);
      toast.error("Failed to download invoice");
    }
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </Button>

        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    );
  };

  return (
    <Card className="rounded-none w-full h-full">
      <CardHeader>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold">
                📊 Offline Sales History
              </h1>
              <p className="text-gray-600 mt-1">
                Total Sales: {total} | Page {currentPage} of {totalPages}
                {debouncedSearchQuery.trim() && (
                  <span className="ml-2 text-blue-600">
                    | Searching: "{debouncedSearchQuery}" ({searchType})
                  </span>
                )}
                {(dateRange?.from || dateRange?.to) && (
                  <span className="ml-2 text-green-600">
                    | Date Filter:{" "}
                    {dateRange?.from
                      ? format(dateRange.from, "LLL dd, y")
                      : "Any"}{" "}
                    -{" "}
                    {dateRange?.to ? format(dateRange.to, "LLL dd, y") : "Any"}
                  </span>
                )}
              </p>
            </div>

            {/* Shop Filter for Admin */}
            {currentUser?.role === UserRole.ADMIN && shops.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Filter by Shop:</label>
                <Select
                  value={selectedShopId}
                  onValueChange={handleShopChange}
                  disabled={shopsLoading}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="All Shops" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shops</SelectItem>
                    {shops.map((shop) => (
                      <SelectItem key={shop.id} value={shop.id}>
                        {shop.shopName} - {shop.shopLocation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Search Section */}
          <div className="flex flex-col gap-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 flex gap-2">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Search Type:
                  </label>
                  <Select
                    value={searchType}
                    onValueChange={handleSearchTypeChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customerName">
                        Customer Name
                      </SelectItem>
                      <SelectItem value="customerPhone">
                        Customer Phone
                      </SelectItem>
                      <SelectItem value="invoiceNumber">
                        Invoice Number
                      </SelectItem>
                      <SelectItem value="shopName">Shop Name</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Search:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Search by ${
                        searchType === "customerName"
                          ? "customer name"
                          : searchType === "customerPhone"
                          ? "customer phone"
                          : searchType === "invoiceNumber"
                          ? "invoice number"
                          : searchType === "shopName"
                          ? "shop name"
                          : "amount"
                      }...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        title="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleDateFilterToggle}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Date Filter
                </Button>
                {(searchQuery || dateRange?.from || dateRange?.to) && (
                  <Button onClick={handleClearSearch} variant="outline">
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Date Filter Section */}
            {showDateFilter && (
              <div className="flex flex-col sm:flex-row gap-4 items-end p-4 bg-gray-50 rounded-lg border">
                <div className="flex-1">
                  <label
                    htmlFor="dateRange"
                    className="text-sm font-medium mb-1 block"
                  >
                    Date Range:
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleDateFilterClear}
                    variant="outline"
                    size="sm"
                  >
                    Clear Range
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading sales data...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No sales found
            </h3>
            <p className="text-gray-500">
              {debouncedSearchQuery.trim()
                ? `No sales found matching "${debouncedSearchQuery}" for ${
                    searchType === "customerName"
                      ? "customer name"
                      : searchType === "customerPhone"
                      ? "customer phone"
                      : searchType === "invoiceNumber"
                      ? "invoice number"
                      : searchType === "shopName"
                      ? "shop name"
                      : "amount"
                  }.`
                : dateRange?.from || dateRange?.to
                ? "No sales found for the selected date range."
                : selectedShopId && selectedShopId !== "all"
                ? "No sales found for the selected shop."
                : "No offline sales have been recorded yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Sale Details</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className={
                      sale.isHallSell ? "bg-blue-50 hover:bg-blue-100" : ""
                    }
                  >
                    <TableCell className="font-mono font-medium">
                      {sale.invoiceNumber
                        ? `INV-${sale.invoiceNumber
                            .toString()
                            .padStart(6, "0")}`
                        : sale.batchNumber}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {sale.customerName}
                          </span>
                        </div>
                        {sale.customerPhone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="h-3 w-3" />
                            {sale.customerPhone}
                          </div>
                        )}
                        <div className="text-sm text-gray-500">
                          Bill by: {sale.billCreatedBy}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {sale.shop ? (
                        <div className="space-y-1">
                          {sale.isHallSell && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Hall Sale
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">
                              {sale.shop.shopName}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {sale.shop.shopLocation}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">No shop assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <ShoppingBag className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            ₹{sale.totalAmount}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {sale.totalItems} items
                        </div>
                        <div className="text-xs text-gray-500">
                          {sale.sales.length} products
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {sale.paymentType || "Not specified"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sale.gstType || "SGST+CGST"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">
                          {formatDate(sale.saleTime)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {sale.invoiceUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              downloadInvoice(
                                sale.invoiceUrl!,
                                sale.batchNumber,
                                sale.invoiceNumber
                              )
                            }
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            router.push(`/offline-sales/${sale.id}`);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && renderPagination()}
      </CardContent>
    </Card>
  );
}

const OfflineSalesPageWrapper = () => {
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
        <OfflineSalesPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default OfflineSalesPageWrapper;
