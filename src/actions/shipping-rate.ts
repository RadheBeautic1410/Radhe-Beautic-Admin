"use server";

import { db } from "@/src/lib/db";
import { currentRole, currentUser } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";

export interface ShippingRateData {
  pincode: string;
  rate: number;
  type: "wildcard" | "range" | "exact";
  description?: string;
  isActive?: boolean;
}

// Helper function to determine pincode type (internal helper, not a server action)
const determinePincodeType = (pincode: string): "wildcard" | "range" | "exact" => {
  if (pincode.includes("*")) {
    return "wildcard";
  }
  if (pincode.includes("-")) {
    return "range";
  }
  return "exact";
};

// Helper function to validate pincode pattern (internal helper, not a server action)
const validatePincodePattern = (pincode: string): { valid: boolean; error?: string } => {
  // Wildcard pattern: e.g., 36**, 3640*, etc.
  if (pincode.includes("*")) {
    const parts = pincode.split("*");
    if (parts.length > 2) {
      return { valid: false, error: "Invalid wildcard pattern. Use only one * sequence (e.g., 36**)" };
    }
    const beforeWildcard = parts[0];
    if (!/^\d*$/.test(beforeWildcard)) {
      return { valid: false, error: "Only digits allowed before wildcard" };
    }
    if (beforeWildcard.length > 6) {
      return { valid: false, error: "Pincode pattern too long" };
    }
    return { valid: true };
  }

  // Range pattern: e.g., 364001-364005
  if (pincode.includes("-")) {
    const [start, end] = pincode.split("-").map(s => s.trim());
    if (!start || !end) {
      return { valid: false, error: "Invalid range format. Use: 364001-364005" };
    }
    if (!/^\d{6}$/.test(start) || !/^\d{6}$/.test(end)) {
      return { valid: false, error: "Range start and end must be 6-digit pincodes" };
    }
    if (parseInt(start) >= parseInt(end)) {
      return { valid: false, error: "Range start must be less than range end" };
    }
    return { valid: true };
  }

  // Exact pattern: must be 6 digits
  if (!/^\d{6}$/.test(pincode)) {
    return { valid: false, error: "Exact pincode must be 6 digits" };
  }

  return { valid: true };
};

export const createShippingRate = async (data: ShippingRateData) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    // Validate pincode pattern
    const validation = validatePincodePattern(data.pincode);
    if (!validation.valid) {
      return { error: validation.error };
    }

    // Determine type if not provided
    const type = data.type || determinePincodeType(data.pincode);

    if (data.rate < 0) {
      return { error: "Shipping rate must be 0 or greater" };
    }

    const shippingRate = await db.shippingRate.create({
      data: {
        pincode: data.pincode,
        rate: data.rate,
        type: type,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    return { success: "Shipping rate created successfully!", data: shippingRate };
  } catch (error: any) {
    console.error("Error creating shipping rate:", error);
    return { error: error.message || "Failed to create shipping rate" };
  }
};

export const updateShippingRate = async (id: string, data: Partial<ShippingRateData>) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const updateData: any = {};

    if (data.pincode !== undefined) {
      const validation = validatePincodePattern(data.pincode);
      if (!validation.valid) {
        return { error: validation.error };
      }
      updateData.pincode = data.pincode;
      updateData.type = data.type || determinePincodeType(data.pincode);
    }

    if (data.rate !== undefined) {
      if (data.rate < 0) {
        return { error: "Shipping rate must be 0 or greater" };
      }
      updateData.rate = data.rate;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.type !== undefined) {
      updateData.type = data.type;
    }

    const shippingRate = await db.shippingRate.update({
      where: { id },
      data: updateData,
    });

    return { success: "Shipping rate updated successfully!", data: shippingRate };
  } catch (error: any) {
    console.error("Error updating shipping rate:", error);
    return { error: error.message || "Failed to update shipping rate" };
  }
};

export const deleteShippingRate = async (id: string) => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    await db.shippingRate.delete({
      where: { id },
    });

    return { success: "Shipping rate deleted successfully!" };
  } catch (error: any) {
    console.error("Error deleting shipping rate:", error);
    return { error: error.message || "Failed to delete shipping rate" };
  }
};

export const getAllShippingRates = async () => {
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return { error: "Unauthorized" };
    }

    const shippingRates = await db.shippingRate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: shippingRates };
  } catch (error: any) {
    console.error("Error fetching shipping rates:", error);
    return { error: error.message || "Failed to fetch shipping rates" };
  }
};

// Helper function to check if a pincode matches a pattern (internal helper, not a server action)
const matchesPincodePattern = (pincode: string, pattern: string, type: string): boolean => {
  if (type === "exact") {
    return pincode === pattern;
  }

  if (type === "wildcard") {
    // Convert wildcard pattern to regex
    // e.g., 36** becomes ^36\d{4}$
    // e.g., 3640* becomes ^3640\d{2}$
    const regexPattern = pattern.replace(/\*/g, "\\d");
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pincode);
  }

  if (type === "range") {
    const [start, end] = pattern.split("-").map(s => parseInt(s.trim()));
    const pincodeNum = parseInt(pincode);
    return pincodeNum >= start && pincodeNum <= end;
  }

  return false;
};

// Function to calculate shipping rate for a given pincode
export const calculateShippingRate = async (pincode: string): Promise<number> => {
  try {
    // Normalize pincode to 6 digits
    const normalizedPincode = pincode.trim().padStart(6, "0");

    // Get all active shipping rates, ordered by specificity (exact > range > wildcard)
    const shippingRates = await db.shippingRate.findMany({
      where: { isActive: true },
      orderBy: [
        { type: "asc" }, // This will order: exact (e), range (r), wildcard (w)
      ],
    });

    // Check exact matches first
    for (const rate of shippingRates) {
      if (matchesPincodePattern(normalizedPincode, rate.pincode, rate.type)) {
        return rate.rate;
      }
    }

    // If no match found, return 0 or a default rate
    return 0;
  } catch (error: any) {
    console.error("Error calculating shipping rate:", error);
    return 0;
  }
};


