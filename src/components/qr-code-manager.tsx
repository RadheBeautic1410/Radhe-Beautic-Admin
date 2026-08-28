"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { toast } from "sonner";
import { Upload, Trash2, QrCode, Loader2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/src/components/ui/dialog";
import { useQRCode } from "@/src/hooks/useQRCode";

export default function QRCodeManager() {
  const {
    currentQRCode,
    isLoading,
    isUploading,
    isDeleting,
    isSavingUpi,
    updateQR,
    saveUpi,
    deleteQR,
  } = useQRCode();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUpiId(currentQRCode?.upi_id || "");
    setPayeeName(currentQRCode?.payee_name || "");
  }, [currentQRCode?.upi_id, currentQRCode?.payee_name]);

  const handleSaveUpi = async () => {
    const result = await saveUpi(upiId, payeeName);
    if (result.success) {
      toast.success("UPI ID saved. Panels will now show a fixed-amount QR.");
    } else {
      toast.error(result.error || "Failed to save UPI ID");
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const result = await updateQR(file);
    
    if (result.success) {
      toast.success('Payment QR code updated successfully!');
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast.error(result.error || 'Failed to update QR code');
    }
  };

  const handleDelete = async () => {
    const result = await deleteQR();
    
    if (result.success) {
      toast.success('Payment QR code deleted successfully!');
      setIsDeleteDialogOpen(false);
    } else {
      toast.error(result.error || 'Failed to delete QR code');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Payment QR Code
          </CardTitle>
          <CardDescription>
            Manage your payment QR code for receiving payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Payment QR Code
        </CardTitle>
        <CardDescription>
          Manage your payment QR code for receiving payments. Only one QR code can be active at a time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current QR Code Display */}
        {currentQRCode?.image_url ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Current QR Code</Label>
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isDeleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete QR Code</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete the current payment QR code? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex justify-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <img
                  src={currentQRCode.image_url}
                  alt="Payment QR Code"
                  className="max-w-xs max-h-xs object-contain"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <QrCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No QR code uploaded yet</p>
            <p className="text-sm">Upload a QR code to start receiving payments</p>
          </div>
        )}

        {/* UPI ID — drives the fixed-amount QR shown in the reseller panel */}
        <div className="space-y-3 rounded-lg border p-4">
          <div>
            <Label htmlFor="upi-id" className="text-sm font-medium">
              UPI ID (fixed-amount QR)
            </Label>
            <p className="mt-1 text-xs text-gray-500">
              When set, the reseller panel generates a QR carrying the exact order amount
              instead of showing the uploaded picture. Leave blank to keep using the image.
            </p>
          </div>
          <Input
            id="upi-id"
            placeholder="radhebeautic@okaxis"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            disabled={isSavingUpi}
          />
          <Input
            id="upi-payee-name"
            placeholder="Payee name shown in the UPI app (e.g. Radhe Beautic)"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            disabled={isSavingUpi}
          />
          <Button onClick={handleSaveUpi} disabled={isSavingUpi} size="sm">
            {isSavingUpi ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save UPI ID
              </>
            )}
          </Button>
          <p className="text-xs text-amber-700">
            Pre-filling the amount stops wrong-amount transfers, but UPI apps enforce it,
            not us — the payment screenshot check still applies.
          </p>
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
          <Label htmlFor="qr-code-file" className="text-sm font-medium">
            {currentQRCode?.image_url ? "Replace QR Code" : "Upload QR Code"}
          </Label>
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              id="qr-code-file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-1"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                "Choose File"
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Supported formats: JPG, PNG, GIF. Maximum file size: 5MB
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
