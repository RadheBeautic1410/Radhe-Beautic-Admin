"use server";

import { db } from "@/src/lib/db";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/src/lib/firebase/firebase';
import { v4 as uuidv4 } from "uuid";

export interface QRCodeData {
  id: string;
  image_url: string;
  is_active: boolean;
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
          is_active: true
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

      // Delete from database
      await tx.qRCodeImage.delete({
        where: { id: activeQRCode.id }
      });
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
