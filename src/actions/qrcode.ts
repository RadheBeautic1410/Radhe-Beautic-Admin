"use server";

import { db } from "@/src/lib/db";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/src/lib/firebase/firebase';
import { v4 as uuidv4 } from "uuid";
import { isValidUpiId } from "@/src/lib/upi";

export interface QRCodeData {
  id: string;
  /** Empty when only a UPI id is configured and no image was ever uploaded. */
  image_url: string;
  is_active: boolean;
  /** Payee VPA. When set, panels render a fixed-amount QR instead of the image. */
  upi_id?: string | null;
  payee_name?: string | null;
}

// Get current active QR code
export async function getActiveQRCode(): Promise<{ success: boolean; data?: QRCodeData; error?: string }> {
  try {
    const activeQRCode = await db.qRCodeImage.findFirst({
      where: { is_active: true }
    });

    return {
      success: true,
      data: activeQRCode || undefined
    };
  } catch (error: any) {
    console.error('Error fetching QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Update payment QR code
export async function updateQRCode(file: File): Promise<{ success: boolean; data?: QRCodeData; error?: string }> {
  try {
    // Validate file
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'Only image files are allowed' };
    }

    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'File size must be less than 5MB' };
    }

    // Upload to Firebase Storage
    const fileName = `qr-codes/${uuidv4()}-${file.name}`;
    const storageRef = ref(storage, fileName);
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uploadResult = await uploadBytes(storageRef, buffer);
    
    // Get download URL
    const downloadURL = await getDownloadURL(uploadResult.ref);

    // Start database transaction
    const result = await db.$transaction(async (tx) => {
      /**
       * Replacing the image creates a fresh row, so the configured VPA has to be copied
       * over or uploading a new picture would silently switch every panel back to
       * open-amount QRs.
       */
      const previous = await tx.qRCodeImage.findFirst({
        where: { is_active: true },
        select: { upi_id: true, payee_name: true },
      });

      // Deactivate all existing QR codes
      await tx.qRCodeImage.updateMany({
        where: { is_active: true },
        data: { is_active: false }
      });

      // Delete old QR code images from Firebase (optional cleanup)
      const oldQRCodes = await tx.qRCodeImage.findMany({
        where: { is_active: false }
      });

      // Delete old images from Firebase storage
      for (const oldQR of oldQRCodes) {
        try {
          const oldImageRef = ref(storage, oldQR.image_url);
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          console.warn('Failed to delete old QR code image:', oldQR.image_url, deleteError);
        }
      }

      // Create new active QR code
      const newQRCode = await tx.qRCodeImage.create({
        data: {
          image_url: downloadURL,
          is_active: true,
          upi_id: previous?.upi_id ?? null,
          payee_name: previous?.payee_name ?? null,
        }
      });

      return newQRCode;
    });

    return {
      success: true,
      data: result
    };

  } catch (error: any) {
    console.error('Error updating QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Delete current active QR code
export async function deleteQRCode(): Promise<{ success: boolean; error?: string }> {
  try {
    await db.$transaction(async (tx) => {
      // Find active QR code
      const activeQRCode = await tx.qRCodeImage.findFirst({
        where: { is_active: true }
      });

      if (!activeQRCode) {
        throw new Error('No active QR code found');
      }

      // Delete from Firebase Storage
      try {
        const imageRef = ref(storage, activeQRCode.image_url);
        await deleteObject(imageRef);
      } catch (deleteError) {
        console.warn('Failed to delete QR code image from Firebase:', deleteError);
      }

      if (activeQRCode.upi_id) {
        /** The VPA is the thing panels actually pay to — drop only the picture. */
        await tx.qRCodeImage.update({
          where: { id: activeQRCode.id },
          data: { image_url: "" },
        });
      } else {
        // Delete from database
        await tx.qRCodeImage.delete({
          where: { id: activeQRCode.id }
        });
      }
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error deleting QR code:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Set the UPI id used to build fixed-amount payment QRs across the panels
export async function updateUpiDetails(
  upiId: string,
  payeeName?: string
): Promise<{ success: boolean; data?: QRCodeData; error?: string }> {
  try {
    const vpa = (upiId || "").trim();
    const name = (payeeName || "").trim();

    if (vpa && !isValidUpiId(vpa)) {
      return { success: false, error: "Enter a valid UPI ID, e.g. radhebeautic@okaxis" };
    }

    const active = await db.qRCodeImage.findFirst({ where: { is_active: true } });

    const result = active
      ? await db.qRCodeImage.update({
          where: { id: active.id },
          data: { upi_id: vpa || null, payee_name: name || null },
        })
      : /**
         * No image was ever uploaded. A UPI id alone is enough to pay, so create the row
         * with an empty image_url rather than forcing an upload first.
         */
        await db.qRCodeImage.create({
          data: {
            image_url: "",
            is_active: true,
            upi_id: vpa || null,
            payee_name: name || null,
          },
        });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error updating UPI details:", error);
    return { success: false, error: error.message };
  }
}
