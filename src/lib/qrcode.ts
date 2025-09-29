import { db } from "@/src/lib/db";

export interface QRCodeData {
  id: string;
  image_url: string;
  is_active: boolean;
}

/**
 * Get the currently active payment QR code
 * @returns Promise<QRCodeData | null>
 */
export async function getCurrentQRCode(): Promise<QRCodeData | null> {
  try {
    const activeQRCode = await db.qRCodeImage.findFirst({
      where: { is_active: true }
    });

    return activeQRCode;
  } catch (error) {
    console.error('Error fetching current QR code:', error);
    return null;
  }
}

/**
 * Check if there's an active QR code
 * @returns Promise<boolean>
 */
export async function hasActiveQRCode(): Promise<boolean> {
  try {
    const count = await db.qRCodeImage.count({
      where: { is_active: true }
    });

    return count > 0;
  } catch (error) {
    console.error('Error checking active QR code:', error);
    return false;
  }
}
