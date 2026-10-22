"use server";

import { db } from "@/src/lib/db";
import { permissionError } from "@/src/lib/permissions/server";
import {
  CodSettingValues,
  CodSlab,
  DEFAULT_COD_SETTING,
  MAX_RETURN_RATE_PERCENT,
  SPEED_POST_RATE_CARD,
  quoteCod,
  validateCodPincodePattern,
  withCodDefaults,
} from "@/src/lib/cod";
import { OrderStatus } from "@prisma/client";

export interface CodSlabRow extends CodSlab {
  id: string;
}

const SETTING_KEY = "default";

/** Settings + slabs without a permission check; callers guard. */
const readCodConfig = async (): Promise<{ setting: CodSettingValues; slabs: CodSlabRow[] }> => {
  const [row, slabs] = await Promise.all([
    db.codSetting.findUnique({ where: { key: SETTING_KEY } }),
    db.codChargeSlab.findMany({ orderBy: { maxWeightGrams: "asc" } }),
  ]);
  const setting: CodSettingValues = row ? withCodDefaults(row) : DEFAULT_COD_SETTING;
  return {
    setting,
    slabs: slabs.map(({ id, maxWeightGrams, local, withinState, metro, otherStates }) => ({
      id,
      maxWeightGrams,
      local,
      withinState,
      metro,
      otherStates,
    })),
  };
};

const RETURN_STATS_DAYS = 90;

/**
 * Real return rate of COD parcels that reached an end state (delivered or
 * returned) in the last 90 days, so admin can set the expected rate from data.
 */
const readCodReturnStats = async () => {
  const since = new Date(Date.now() - RETURN_STATS_DAYS * 24 * 60 * 60 * 1000);
  const [delivered, returned] = await Promise.all([
    db.customerOrder.count({
      where: { paymentMethod: "COD", status: OrderStatus.DELIVERED, createdAt: { gte: since } },
    }),
    db.customerOrder.count({
      where: { paymentMethod: "COD", status: OrderStatus.RTO, createdAt: { gte: since } },
    }),
  ]);
  const settled = delivered + returned;
  return {
    days: RETURN_STATS_DAYS,
    delivered,
    returned,
    returnRatePercent: settled ? Math.round((returned / settled) * 1000) / 10 : null,
  };
};

export const getCodConfig = async () => {
  const denied = await permissionError("codCharges.view");
  if (denied) return { error: denied.error };
  try {
    const [config, returnStats] = await Promise.all([readCodConfig(), readCodReturnStats()]);
    return { success: true as const, ...config, returnStats };
  } catch (error) {
    console.error("Error loading COD config:", error);
    return { error: "Failed to load COD settings" };
  }
};

export const saveCodSetting = async (values: CodSettingValues) => {
  const denied = await permissionError("codCharges.edit");
  if (denied) return { error: denied.error };
  try {
    const lists = [values.localPincodes, values.withinStatePincodes, values.metroPincodes];
    for (const list of lists) {
      for (const pattern of list) {
        const err = validateCodPincodePattern(pattern);
        if (err) return { error: err };
      }
    }
    const numbers: [string, number, number, number][] = [
      ["COD fee %", values.codFeePercent, 0, 100],
      ["GST %", values.gstPercent, 0, 100],
      ["Return rate %", values.returnRatePercent, 0, MAX_RETURN_RATE_PERCENT],
      ["Round up to", values.roundTo, 1, 100],
    ];
    for (const [label, v, min, max] of numbers) {
      if (!Number.isFinite(v) || v < min || v > max) return { error: `${label} must be between ${min} and ${max}` };
    }
    const data = {
      enabled: !!values.enabled,
      localPincodes: values.localPincodes,
      withinStatePincodes: values.withinStatePincodes,
      metroPincodes: values.metroPincodes,
      codFeePercent: values.codFeePercent,
      gstPercent: values.gstPercent,
      returnRatePercent: values.returnRatePercent,
      roundTo: Math.round(values.roundTo),
    };
    await db.codSetting.upsert({
      where: { key: SETTING_KEY },
      create: { key: SETTING_KEY, ...data },
      update: data,
    });
    return { success: "COD settings saved" };
  } catch (error) {
    console.error("Error saving COD setting:", error);
    return { error: "Failed to save COD settings" };
  }
};

const validateSlab = (slab: CodSlab): string | null => {
  if (!Number.isInteger(slab.maxWeightGrams) || slab.maxWeightGrams <= 0) {
    return "Weight must be a whole number of grams above 0";
  }
  for (const v of [slab.local, slab.withinState, slab.metro, slab.otherStates]) {
    if (!Number.isFinite(v) || v < 0) return "Charges must be 0 or more";
  }
  return null;
};

export const saveCodSlab = async (slab: CodSlab, id?: string) => {
  const denied = await permissionError("codCharges.edit");
  if (denied) return { error: denied.error };
  const invalid = validateSlab(slab);
  if (invalid) return { error: invalid };
  try {
    const clash = await db.codChargeSlab.findUnique({ where: { maxWeightGrams: slab.maxWeightGrams } });
    if (clash && clash.id !== id) return { error: `A slab for ${slab.maxWeightGrams} g already exists` };
    const data = {
      maxWeightGrams: slab.maxWeightGrams,
      local: slab.local,
      withinState: slab.withinState,
      metro: slab.metro,
      otherStates: slab.otherStates,
    };
    if (id) await db.codChargeSlab.update({ where: { id }, data });
    else await db.codChargeSlab.create({ data });
    return { success: id ? "Slab updated" : "Slab added" };
  } catch (error) {
    console.error("Error saving COD slab:", error);
    return { error: "Failed to save slab" };
  }
};

export const deleteCodSlab = async (id: string) => {
  const denied = await permissionError("codCharges.edit");
  if (denied) return { error: denied.error };
  try {
    await db.codChargeSlab.delete({ where: { id } });
    return { success: "Slab deleted" };
  } catch (error) {
    console.error("Error deleting COD slab:", error);
    return { error: "Failed to delete slab" };
  }
};

/** Replaces every slab with the Speed Post Parcel Contractual card (01.08.2026). */
export const loadSpeedPostRateCard = async () => {
  const denied = await permissionError("codCharges.edit");
  if (denied) return { error: denied.error };
  try {
    await db.$transaction([
      db.codChargeSlab.deleteMany({}),
      db.codChargeSlab.createMany({ data: SPEED_POST_RATE_CARD }),
    ]);
    return { success: `Loaded ${SPEED_POST_RATE_CARD.length} slabs` };
  } catch (error) {
    console.error("Error loading rate card:", error);
    return { error: "Failed to load rate card" };
  }
};

/**
 * Admin preview: charge for a weight + pincode + product amount, even while COD
 * is switched off. `overrides` lets the page preview unsaved formula values.
 */
export const previewCodCharge = async (
  weightGrams: number,
  pincode: string,
  productAmount: number,
  overrides?: Partial<CodSettingValues>
) => {
  const denied = await permissionError("codCharges.view");
  if (denied) return { error: denied.error };
  const { setting, slabs } = await readCodConfig();
  return {
    success: true as const,
    quote: quoteCod(weightGrams, pincode, productAmount, { ...setting, ...overrides }, slabs, {
      ignoreEnabled: true,
    }),
  };
};

/** What a returned parcel costs us (its slab shipping); prefills the RTO dialog. */
export const estimateRtoCharge = async (orderId: string) => {
  const denied = await permissionError(["customerOrders.edit", "customerOrders.view"]);
  if (denied) return { error: denied.error };
  try {
    const order = await db.customerOrder.findUnique({
      where: { id: orderId },
      select: {
        codShipping: true,
        codWeightGrams: true,
        shippingCharge: true,
        shippingAddress: { select: { zipCode: true } },
      },
    });
    if (!order) return { error: "Order not found" };
    if (order.codShipping != null) return { success: true as const, charge: order.codShipping };
    if (order.codWeightGrams == null) return { success: true as const, charge: order.shippingCharge };
    const { setting, slabs } = await readCodConfig();
    const quote = quoteCod(order.codWeightGrams, order.shippingAddress?.zipCode || "", 0, setting, slabs, {
      ignoreEnabled: true,
    });
    return { success: true as const, charge: quote.available ? quote.shipping : order.shippingCharge };
  } catch (error) {
    console.error("Error estimating RTO charge:", error);
    return { error: "Failed to estimate return charge" };
  }
};
