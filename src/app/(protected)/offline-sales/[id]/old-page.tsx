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
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { UserRole } from "@prisma/client";
import axios from "axios";
import {
  ArrowLeft,
  Download,
  User,
  Phone,
  Calendar,
  ShoppingBag,
  Building,
  FileText,
  CreditCard,
  Receipt,
  Package,
  MapPin,
  UserCheck,
  Loader2,
  Edit,
  Save,
  X,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { toast } from "sonner";

interface OfflineSaleDetail {
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

interface SaleDetailsPageProps {
  params: {
    id: string;
  };
}

function SaleDetailsPage({ params }: SaleDetailsPageProps) {
  const [sale, setSale] = useState<OfflineSaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: "",
    customerPhone: "",
    billCreatedBy: "",
    paymentType: "",
    gstType: "",
  });
  const router = useRouter();
  const currentUser = useCurrentUser();

  useEffect(() => {
    const loadSaleDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `/api/sell/offline-sales/${params.id}`
        );
        const saleData = response.data.data;
        setSale(saleData);
        
        // Populate edit form with current data
        setEditForm({
          customerName: saleData.customerName || "",
          customerPhone: saleData.customerPhone || "",
          billCreatedBy: saleData.billCreatedBy || "",
          paymentType: saleData.paymentType || "",
          gstType: saleData.gstType || "SGST_CGST",
        });
      } catch (error: any) {
        console.error("Error loading sale details:", error);
        if (error.response?.status === 404) {
          setError("Sale not found");
        } else if (error.response?.status === 403) {
          setError("Access denied");
        } else {
          setError("Failed to load sale details");
        }
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadSaleDetails();
    }
  }, [params.id]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reset form to original values
    if (sale) {
      setEditForm({
        customerName: sale.customerName || "",
        customerPhone: sale.customerPhone || "",
        billCreatedBy: sale.billCreatedBy || "",
        paymentType: sale.paymentType || "",
        gstType: sale.gstType || "SGST_CGST",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!sale) return;

    try {
      setSaving(true);
      const response = await axios.put(`/api/sell/offline-sales/${params.id}`, editForm);
      
      if (response.data.success) {
        setSale(response.data.data);
        setIsEditing(false);
        toast.success("Sale updated successfully!");
      } else {
        toast.error(response.data.error || "Failed to update sale");
      }
    } catch (error: any) {
      console.error("Error updating sale:", error);
      toast.error(error.response?.data?.error || "Failed to update sale");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading sale details...</span>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {error || "Sale not found"}
          </h3>
          <p className="text-gray-500 mb-4">
            The sale you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sales
          </Button>
          <div className="flex gap-2">
            <h1 className="text-2xl font-semibold">📋 Sale Details</h1>
            <p className="text-gray-600">
              Invoice:{" "}
              {sale.invoiceNumber
                ? `INV-${sale.invoiceNumber.toString().padStart(6, "0")}`
                : sale.batchNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sale.invoiceUrl && (
            <Button
              onClick={() =>
                downloadInvoice(
                  sale.invoiceUrl!,
                  sale.batchNumber,
                  sale.invoiceNumber
                )
              }
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Invoice
            </Button>
          )}
          
          {isEditing ? (
            <>
              <Button
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEdit}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Sale Information
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Invoice Number:</span>
                <Badge variant="outline">
                  {sale.invoiceNumber
                    ? `INV-${sale.invoiceNumber.toString().padStart(6, "0")}`
                    : sale.batchNumber}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Date:</span>
                <span>{formatDate(sale.saleTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Time:</span>
                <span>{formatTime(sale.saleTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Seller:</span>
                <span>{sale.sellerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Bill Created By:</span>
                <span>{sale.billCreatedBy}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              Customer Information
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Name:</span>
                {isEditing ? (
                  <Input
                    value={editForm.customerName}
                    onChange={(e) => handleInputChange("customerName", e.target.value)}
                    className="flex-1"
                    placeholder="Customer name"
                  />
                ) : (
                  <span>{sale.customerName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Phone:</span>
                {isEditing ? (
                  <Input
                    value={editForm.customerPhone}
                    onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    className="flex-1"
                    placeholder="Customer phone"
                  />
                ) : (
                  <span>{sale.customerPhone || "Not provided"}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Bill Created By:</span>
                {isEditing ? (
                  <Input
                    value={editForm.billCreatedBy}
                    onChange={(e) => handleInputChange("billCreatedBy", e.target.value)}
                    className="flex-1"
                    placeholder="Bill created by"
                  />
                ) : (
                  <span>{sale.billCreatedBy}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shop Information */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building className="h-5 w-5" />
              Shop Information
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {sale.shop ? (
                <>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Shop:</span>
                    <span>{sale.shop.shopName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Location:</span>
                    <span>{sale.shop.shopLocation}</span>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">
                  No shop information available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Information
          </h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total Amount:</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                ₹{sale.totalAmount.toLocaleString()}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Total Items:</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {sale.totalItems}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Payment Type:</span>
              </div>
              {isEditing ? (
                <Select
                  value={editForm.paymentType}
                  onValueChange={(value) => handleInputChange("paymentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-lg font-medium">
                  {sale.paymentType || "Not specified"}
                </div>
              )}
              <div className="text-sm text-gray-500">
                {isEditing ? (
                  <Select
                    value={editForm.gstType}
                    onValueChange={(value) => handleInputChange("gstType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SGST_CGST">SGST+CGST</SelectItem>
                      <SelectItem value="IGST">IGST</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span>GST: {sale.gstType || "SGST+CGST"}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Products Sold ({sale.sales.length} items)
          </h3>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Party</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Image</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.sales.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-medium">
                      {item.code}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.kurti.category}</Badge>
                    </TableCell>
                    <TableCell>{item.kurti.party}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.kurtiSize}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{item.selledPrice?.toLocaleString() || "N/A"}
                    </TableCell>
                    <TableCell>
                      {item.kurti.images && item.kurti.images.length > 0 ? (
                        <img
                          src={item.kurti.images[0].url}
                          alt={item.code}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            No Image
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
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