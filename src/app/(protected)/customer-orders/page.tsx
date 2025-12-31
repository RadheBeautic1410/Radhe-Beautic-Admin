"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { toast } from "sonner";
import { useTransition, useEffect, useState } from "react";
import {
  getPendingCustomerOrders,
  acceptCustomerOrder,
  updateOrderTracking,
  getCustomerOrderById,
} from "@/src/actions/customer-order";
import { Badge } from "@/src/components/ui/badge";
import { Eye, CheckCircle2, Truck, Search, X, Download } from "lucide-react";
import { DialogDemo } from "@/src/components/dialog-demo";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { generateAddressInfo } from "@/src/actions/generate-pdf";

interface CartProduct {
  id: string;
  kurti: {
    id: string;
    code: string;
    category: string;
    images: Array<{ url: string }>;
    prices: any;
  };
  sizes: Array<{
    size: string;
    quantity: number;
    isLowerSize?: boolean;
    actualSize?: string;
  }>;
}

interface CustomerOrder {
  id: string;
  orderId: string;
  status: OrderStatus;
  total: number;
  shippingCharge: number;
  paymentStatus?: PaymentStatus | null;
  paymentType?: string | null;
  note?: string | null;
  courier?: string | null;
  trackingId?: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  };
  shippingAddress: {
    fullName: string | null;
    phoneNumber: string | null;
    address: string;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    landmark: string | null;
  };
  cart: {
    CartProduct: CartProduct[];
  };
}

const courierServices = [
  { key: "indianpost", value: "Indian Post" },
  { key: "dtdc", value: "DTDC" },
  { key: "delivery", value: "Delivery" },
  { key: "tirupati", value: "Tirupati" },
];

const paymentTypes = [
  { value: "GPay", label: "GPay" },
  { value: "Phone Pay", label: "Phone Pay" },
  { value: "Cash", label: "Cash" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "Card", label: "Card" },
  { value: "Cheque", label: "Cheque" },
];

const CustomerOrdersPage = () => {
  const [isPending, startTransition] = useTransition();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [orderForTracking, setOrderForTracking] = useState<CustomerOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [orderIdFilter, setOrderIdFilter] = useState<string>("");
  const [phoneFilter, setPhoneFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  // Payment form state (for accepting orders)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(PaymentStatus.PENDING);
  const [paymentType, setPaymentType] = useState<string>("");
  const [note, setNote] = useState<string>("");

  // Tracking form state (for updating tracking)
  const [courier, setCourier] = useState<string>("");
  const [trackingId, setTrackingId] = useState<string>("");
  const [updatingTracking, setUpdatingTracking] = useState(false);

  // Fetch orders based on filters and pagination
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const result = await getPendingCustomerOrders(
        statusFilter,
        orderIdFilter.trim() || undefined,
        phoneFilter.trim() || undefined,
        page,
        pageSize
      );
      if (result.success && result.data) {
        setOrders(result.data as unknown as CustomerOrder[]);
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
          setTotal(result.pagination.total);
        }
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders when filters or pagination change (with debounce for text inputs)
  useEffect(() => {
    // Reset to page 1 when filters change
    if (page !== 1) {
      setPage(1);
      return;
    }
    const timeoutId = setTimeout(() => {
      fetchOrders();
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [statusFilter, orderIdFilter, phoneFilter, page, pageSize]);


  // Handle view order details
  const handleViewOrder = async (order: CustomerOrder) => {
    // Fetch fresh order data
    const result = await getCustomerOrderById(order.id);
    if (result.success && result.data) {
      const freshOrder = result.data as unknown as CustomerOrder;
      setSelectedOrder(freshOrder);
      setPaymentStatus(freshOrder.paymentStatus || PaymentStatus.PENDING);
      setPaymentType(freshOrder.paymentType || "");
      setNote(freshOrder.note || "");
      setCourier(freshOrder.courier || "");
      setTrackingId(freshOrder.trackingId || "");
      setViewDialogOpen(true);
    } else {
      setSelectedOrder(order);
      setPaymentStatus(order.paymentStatus || PaymentStatus.PENDING);
      setPaymentType(order.paymentType || "");
      setNote(order.note || "");
      setCourier(order.courier || "");
      setTrackingId(order.trackingId || "");
      setViewDialogOpen(true);
    }
  };

  // Handle accept order with payment details
  const handleAcceptOrder = (orderId: string) => {
    if (!paymentType.trim()) {
      toast.error("Please select a payment type");
      return;
    }

    startTransition(async () => {
      try {
        const result = await acceptCustomerOrder(orderId, {
          paymentStatus,
          paymentType: paymentType.trim(),
          note: note.trim() || undefined,
        });
        if (result.success) {
          toast.success(result.message || "Order accepted successfully");
          // Close the dialog immediately after saving payment
          setViewDialogOpen(false);
          setSelectedOrder(null);
          // Reset form fields
          setPaymentType("");
          setNote("");
          fetchOrders(); // Refresh the list
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error accepting order:", error);
        toast.error("Failed to accept order");
      }
    });
  };

  // Handle open tracking dialog
  const handleOpenTrackingDialog = async (order: CustomerOrder) => {
    // Fetch fresh order data
    const result = await getCustomerOrderById(order.id);
    if (result.success && result.data) {
      const freshOrder = result.data as unknown as CustomerOrder;
      setOrderForTracking(freshOrder);
      setCourier(freshOrder.courier || "");
      setTrackingId(freshOrder.trackingId || "");
      setTrackingDialogOpen(true);
    } else {
      setOrderForTracking(order);
      setCourier(order.courier || "");
      setTrackingId(order.trackingId || "");
      setTrackingDialogOpen(true);
    }
  };

  // Handle update tracking
  const handleUpdateTracking = async (orderId: string) => {
    if (!courier.trim()) {
      toast.error("Please select a courier");
      return;
    }
    if (!trackingId.trim()) {
      toast.error("Please enter tracking ID");
      return;
    }

    setUpdatingTracking(true);
    try {
      const result = await updateOrderTracking(orderId, {
        courier: courier.trim(),
        trackingId: trackingId.trim(),
      });
      if (result.success) {
        toast.success(result.message || "Tracking information updated successfully");
        // Close the tracking dialog
        setTrackingDialogOpen(false);
        setOrderForTracking(null);
        setCourier("");
        setTrackingId("");
        fetchOrders(); // Refresh the list
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast.error("Failed to update tracking information");
    } finally {
      setUpdatingTracking(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle download address PDF
  const handleDownloadAddressPDF = async (order: CustomerOrder) => {
    try {
      // Calculate total quantity from cart products
      const totalQuantity = order.cart.CartProduct.reduce((total, cartProduct) => {
        const productQuantity = cartProduct.sizes.reduce((sum, size) => sum + size.quantity, 0);
        return total + productQuantity;
      }, 0);

      // Combine name, mobile number, and address into a single string
      // Format: Name, Mobile Number, Address (newline separated for parsing)
      const name = order.shippingAddress.fullName || order.user.name || "";
      const mobileNo = order.shippingAddress.phoneNumber || order.user.phoneNumber || "";
      
      const addressParts: string[] = [];
      if (name) {
        addressParts.push(name);
      }
      if (mobileNo) {
        addressParts.push(mobileNo);
      }
      if (order.shippingAddress.address) {
        addressParts.push(order.shippingAddress.address);
      }
      if (order.shippingAddress.city && order.shippingAddress.state) {
        addressParts.push(`${order.shippingAddress.city}, ${order.shippingAddress.state}`);
      } else if (order.shippingAddress.city) {
        addressParts.push(order.shippingAddress.city);
      } else if (order.shippingAddress.state) {
        addressParts.push(order.shippingAddress.state);
      }
      if (order.shippingAddress.zipCode) {
        addressParts.push(order.shippingAddress.zipCode);
      }
      if (order.shippingAddress.landmark) {
        addressParts.push(order.shippingAddress.landmark);
      }
      const combinedAddress = addressParts.join("\n");

      // Format date
      const currentDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      // Prepare request data - only pass address (name, mobile, address combined)
      const reqData = {
        orderId: order.orderId,
        date: currentDate,
        quantity: totalQuantity,
        group: "radhe beautic",
        address: combinedAddress,
      };

      // Call the generate address PDF API
      const result = await generateAddressInfo(reqData);

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
      link.download = `Address-${order.orderId}-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Address PDF downloaded successfully");
    } catch (error) {
      console.error("Error generating address PDF:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download address PDF");
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-500" },
      PROCESSING: { label: "Processing", className: "bg-blue-500" },
      SHIPPED: { label: "Shipped", className: "bg-purple-500" },
      TRACKINGPENDING: { label: "Tracking Pending", className: "bg-orange-500" },
      DELIVERED: { label: "Delivered", className: "bg-green-500" },
      CANCELLED: { label: "Cancelled", className: "bg-red-500" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status?: PaymentStatus | null) => {
    if (!status) return null;
    const statusConfig = {
      PENDING: { label: "Pending", className: "bg-yellow-500" },
      COMPLETED: { label: "Completed", className: "bg-green-500" },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  const isOrderPending = selectedOrder?.status === OrderStatus.PENDING;
  const isOrderTrackingPending = selectedOrder?.status === OrderStatus.TRACKINGPENDING;
  const isOrderAccepted = selectedOrder?.status === OrderStatus.PROCESSING || selectedOrder?.status === OrderStatus.SHIPPED;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Customer Orders</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="status-filter">Status:</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Orders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Orders</SelectItem>
                    <SelectItem value={OrderStatus.PENDING}>Pending</SelectItem>
                    <SelectItem value={OrderStatus.TRACKINGPENDING}>Tracking Pending</SelectItem>
                    <SelectItem value={OrderStatus.PROCESSING}>Processing</SelectItem>
                    <SelectItem value={OrderStatus.SHIPPED}>Shipped</SelectItem>
                    <SelectItem value={OrderStatus.DELIVERED}>Delivered</SelectItem>
                    <SelectItem value={OrderStatus.CANCELLED}>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="order-id-filter">Order ID:</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="order-id-filter"
                    placeholder="Search Order ID"
                    value={orderIdFilter}
                    onChange={(e) => setOrderIdFilter(e.target.value)}
                    className="w-[200px] pl-8"
                  />
                  {orderIdFilter && (
                    <button
                      onClick={() => setOrderIdFilter("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="phone-filter">Phone:</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone-filter"
                    placeholder="Search Phone Number"
                    value={phoneFilter}
                    onChange={(e) => setPhoneFilter(e.target.value)}
                    className="w-[200px] pl-8"
                  />
                  {phoneFilter && (
                    <button
                      onClick={() => setPhoneFilter("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {(orderIdFilter || phoneFilter || statusFilter !== "ALL") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("ALL");
                    setOrderIdFilter("");
                    setPhoneFilter("");
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {statusFilter === "ALL" 
                  ? "No orders found" 
                  : `No ${statusFilter.toLowerCase()} orders found`}
              </p>
            </div>
          ) : (
            <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Shipping Charge</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderId}
                      </TableCell>
                      <TableCell>
                        {order.user.name || "N/A"}
                      </TableCell>
                      <TableCell>{order.user.phoneNumber}</TableCell>
                      <TableCell>₹{order.total.toFixed(2)}</TableCell>
                      <TableCell>₹{order.shippingCharge.toFixed(2)}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadAddressPDF(order)}
                            title="Download Address PDF"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                          {order.status === OrderStatus.PENDING && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              disabled={isPending}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                          )}
                          {order.status === OrderStatus.TRACKINGPENDING && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenTrackingDialog(order)}
                              disabled={updatingTracking}
                            >
                              <Truck className="h-4 w-4 mr-1" />
                              Assign Tracking
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4 mt-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <span className="text-sm text-gray-700">Rows per page</span>
                  <Select
                    value={`${pageSize}`}
                    onValueChange={(value) => {
                      setPageSize(parseInt(value));
                      setPage(1); // Reset to first page when page size changes
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      {`${pageSize}`}
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 30, 40, 50].map((size) => (
                        <SelectItem key={size} value={`${size}`}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-700">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} orders
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                    >
                      {"<<"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      {"<"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      {">"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages}
                    >
                      {">>"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Order Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.orderId}</DialogTitle>
            <DialogDescription>
              {isOrderPending
                ? "Review order details and add payment information before accepting"
                : "Order details and tracking information"}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">
                        {selectedOrder.user.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{selectedOrder.user.phoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">
                        {selectedOrder.user.email || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-medium">
                      {selectedOrder.shippingAddress.fullName || "N/A"}
                    </p>
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>
                      {selectedOrder.shippingAddress.city && selectedOrder.shippingAddress.state
                        ? `${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state}`
                        : selectedOrder.shippingAddress.city || selectedOrder.shippingAddress.state || ""}
                      {selectedOrder.shippingAddress.zipCode
                        ? ` - ${selectedOrder.shippingAddress.zipCode}`
                        : ""}
                    </p>
                    {selectedOrder.shippingAddress.landmark && (
                      <p className="text-sm text-gray-500">
                        Landmark: {selectedOrder.shippingAddress.landmark}
                      </p>
                    )}
                    {selectedOrder.shippingAddress.phoneNumber && (
                      <p className="text-sm text-gray-500">
                        Phone: {selectedOrder.shippingAddress.phoneNumber}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Sizes</TableHead>
                          <TableHead>Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.cart.CartProduct.map((cartProduct) => (
                          <TableRow key={cartProduct.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {cartProduct.kurti.images?.[0]?.url && (
                                  <img
                                    src={cartProduct.kurti.images[0].url}
                                    alt={cartProduct.kurti.code}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold">
                                    {cartProduct.kurti.code.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{cartProduct.kurti.category}</TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {Array.isArray(cartProduct.sizes) && cartProduct.sizes.length > 0 ? (
                                  cartProduct.sizes.map((sizeItem: any, idx: number) => (
                                    <div key={idx} className="text-sm">
                                      <span className="font-medium">
                                        {sizeItem.size?.toUpperCase() || "N/A"}
                                      </span>
                                      {sizeItem.isLowerSize && sizeItem.actualSize && (
                                        <span className="text-xs text-orange-600 ml-1">
                                          (Ordered: {sizeItem.actualSize.toUpperCase()})
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-400">No sizes</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {Array.isArray(cartProduct.sizes) && cartProduct.sizes.length > 0
                                ? cartProduct.sizes.reduce(
                                    (sum: number, sizeItem: any) =>
                                      sum + (sizeItem.quantity || 0),
                                    0
                                  )
                                : 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information - Only show for pending orders */}
              {isOrderPending && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information *</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="payment-status">Payment Status *</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={(value) => setPaymentStatus(value as PaymentStatus)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentStatus.PENDING}>Pending</SelectItem>
                          <SelectItem value={PaymentStatus.COMPLETED}>Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-type">Payment Type *</Label>
                      <Select
                        value={paymentType}
                        onValueChange={setPaymentType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note (Optional)</Label>
                      <Textarea
                        id="note"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Add any notes about this order..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information Display - For orders with payment info (TRACKINGPENDING, PROCESSING, SHIPPED) */}
              {(isOrderTrackingPending || isOrderAccepted) && selectedOrder.paymentStatus && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Payment Status:</span>
                      {getPaymentStatusBadge(selectedOrder.paymentStatus)}
                    </div>
                    {selectedOrder.paymentType && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Payment Type:</span>
                        <span className="font-medium">{selectedOrder.paymentType}</span>
                      </div>
                    )}
                    {selectedOrder.note && (
                      <div>
                        <span className="text-sm text-gray-500">Note:</span>
                        <p className="mt-1 text-sm">{selectedOrder.note}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Tracking Information Display - Only show if tracking already exists */}
              {(isOrderAccepted || (isOrderTrackingPending && selectedOrder.trackingId)) && selectedOrder.trackingId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tracking Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Courier:</span>
                      <span className="font-medium">
                        {courierServices.find((c) => c.key === selectedOrder.courier)?.value || selectedOrder.courier || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Tracking ID:</span>
                      <span className="font-medium">{selectedOrder.trackingId}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>₹{selectedOrder.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping Charge:</span>
                      <span>₹{selectedOrder.shippingCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>₹{(selectedOrder.total + selectedOrder.shippingCharge).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setPaymentType("");
                    setNote("");
                  }}
                >
                  Close
                </Button>
                {isOrderPending && (
                  <Button
                    onClick={() => handleAcceptOrder(selectedOrder.id)}
                    disabled={isPending || !paymentType.trim()}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Accept Order
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tracking Assignment Dialog */}
      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Tracking - {orderForTracking?.orderId}</DialogTitle>
            <DialogDescription>
              Enter courier and tracking ID for this order
            </DialogDescription>
          </DialogHeader>

          {orderForTracking && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">
                        {orderForTracking.user.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-medium">₹{orderForTracking.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tracking Information *</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tracking-courier">Courier *</Label>
                    <Select value={courier} onValueChange={setCourier}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select courier" />
                      </SelectTrigger>
                      <SelectContent>
                        {courierServices.map((service) => (
                          <SelectItem key={service.key} value={service.key}>
                            {service.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tracking-id-input">Tracking ID *</Label>
                    <Input
                      id="tracking-id-input"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="Enter tracking ID"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setTrackingDialogOpen(false);
                    setOrderForTracking(null);
                    setCourier("");
                    setTrackingId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdateTracking(orderForTracking.id)}
                  disabled={updatingTracking || !courier.trim() || !trackingId.trim()}
                >
                  <Truck className="h-4 w-4 mr-2" />
                  {updatingTracking ? "Saving..." : "Save Tracking"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerOrdersPage;
