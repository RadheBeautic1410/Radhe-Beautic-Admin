"use client";

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { OfflineSellType, UserRole } from "@prisma/client";
import axios from "axios";
import { Loader2, Edit, Save, X, ChevronLeft, FileText } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { useParams, useRouter } from "next/navigation";
import { PasswordDialog } from "@/src/app/(protected)/_components/PasswordDialog";
import Link from "next/link";

interface SaleDetailsPageProps {
  params: {
    id: string;
  };
}

function SaleDetailsPage({ params }: SaleDetailsPageProps) {
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [originalSaleData, setOriginalSaleData] = useState<any>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Sale details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [billCreatedBy, setBillCreatedBy] = useState("");
  const [paymentType, setpaymentType] = useState("");
  const [gstType, setGstType] = useState<"IGST" | "SGST_CGST">("SGST_CGST");
  const [sellType, setSellType] = useState<OfflineSellType>("HALL_SELL_ONLINE");

  const currentUser = useCurrentUser();
  const router = useRouter();

  useEffect(() => {
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
        setpaymentType(saleData.paymentType || "");
        setGstType(saleData.gstType || "SGST_CGST");
        setSellType(saleData.sellType || "HALL_SELL_ONLINE");
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
        setSellType(originalSaleData.sellType || "HALL_SELL_ONLINE");
      }
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
        sellType: sellType,
      };

      const response = await axios.put(
        `/api/sell/online-sales/${params.id}`,
        updateData
      );

      if (response.data.success) {
        toast.success("Sale updated successfully!");
        setOriginalSaleData(response.data.data);
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

  const handleEditClick = () => {
    setShowPasswordDialog(true);
  };

  const handlePasswordSuccess = () => {
    toggleEditMode();
  };

  const regenerateInvoice = async () => {
    try {
      toast.info("Invoice regeneration feature coming soon!");
    } catch (error: any) {
      console.error("Error regenerating invoice:", error);
      toast.error("Failed to regenerate invoice");
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
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                >
                  <FileText className="mr-2 h-4 w-4" />
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
              <label className="text-sm font-medium mb-1 block">
                Customer Name *
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={!isEditMode}
                className={`w-full p-2 border rounded-md ${
                  !isEditMode ? "bg-gray-50" : ""
                }`}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Customer Phone (Optional)
              </label>
              <input
                type="text"
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
                className={`w-full p-2 border rounded-md ${
                  !isEditMode ? "bg-gray-50" : ""
                }`}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Payment Type *
              </label>
              <select
                value={paymentType}
                onChange={(e) => setpaymentType(e.target.value)}
                disabled={!isEditMode}
                aria-label="Select payment type"
                className={`w-full p-2 border rounded-md ${
                  !isEditMode ? "bg-gray-50" : ""
                }`}
              >
                <option value="">Select Payment Type</option>
                <option value="GPay">GPay</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                Bill Created By *
              </label>
              <input
                type="text"
                placeholder="Enter person name"
                value={billCreatedBy}
                onChange={(e) => setBillCreatedBy(e.target.value)}
                disabled={!isEditMode}
                className={`w-full p-2 border rounded-md ${
                  !isEditMode ? "bg-gray-50" : ""
                }`}
              />
            </div>
          </div>
        </div>

        {/* Sale Items Summary */}
        {originalSaleData && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <h3 className="text-lg font-semibold mb-3 text-green-800">
              Sale Items ({originalSaleData.sales?.length || 0} items)
            </h3>
            <div className="text-sm text-gray-600">
              <p>Total Amount: ₹{originalSaleData.totalAmount}</p>
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
