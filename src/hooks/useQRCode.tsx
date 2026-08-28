"use client";

import { useState, useEffect } from "react";
import {
  getActiveQRCode,
  updateQRCode,
  deleteQRCode,
  updateUpiDetails,
} from "@/src/actions/qrcode";

interface QRCodeData {
  id: string;
  /** Empty when only a UPI id is configured. */
  image_url: string;
  is_active: boolean;
  upi_id?: string | null;
  payee_name?: string | null;
}

export function useQRCode() {
  const [currentQRCode, setCurrentQRCode] = useState<QRCodeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  const loadCurrentQRCode = async () => {
    try {
      setIsLoading(true);
      const result = await getActiveQRCode();
      if (result.success && result.data) {
        setCurrentQRCode(result.data);
      } else {
        setCurrentQRCode(null);
      }
    } catch (error) {
      console.error('Error loading QR code:', error);
      setCurrentQRCode(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateQR = async (file: File) => {
    try {
      setIsUploading(true);
      const result = await updateQRCode(file);
      
      if (result.success && result.data) {
        setCurrentQRCode(result.data);
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error updating QR code:', error);
      return { success: false, error: error.message };
    } finally {
      setIsUploading(false);
    }
  };

  const saveUpi = async (upiId: string, payeeName?: string) => {
    try {
      setIsSavingUpi(true);
      const result = await updateUpiDetails(upiId, payeeName);

      if (result.success && result.data) {
        setCurrentQRCode(result.data);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error("Error saving UPI details:", error);
      return { success: false, error: error.message };
    } finally {
      setIsSavingUpi(false);
    }
  };

  const deleteQR = async () => {
    try {
      setIsDeleting(true);
      const result = await deleteQRCode();
      
      if (result.success) {
        setCurrentQRCode(null);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      console.error('Error deleting QR code:', error);
      return { success: false, error: error.message };
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    loadCurrentQRCode();
  }, []);

  return {
    currentQRCode,
    isLoading,
    isUploading,
    isDeleting,
    isSavingUpi,
    loadCurrentQRCode,
    updateQR,
    saveUpi,
    deleteQR,
  };
}
