"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { permissionError } from "@/src/lib/permissions/server";

// Kurtis bought from a vendor (Party): one bill per purchase, a line per design with
// pieces x price. It is a purchase record only; stock is still added on Add Stock.

export type VendorPurchaseItemInput = {
  design: string;
  kurtiType?: string | null;
  pieces: number;
  price: number;
  imageUrl?: string | null;
  imagePath?: string | null;
};

export type VendorPurchaseInput = {
  partyName: string;
  /** YYYY-MM-DD (India date) */
  date: string;
  items: VendorPurchaseItemInput[];
};

export type VendorPurchaseFilter = {
  /** YYYY-MM-DD, inclusive */
  from?: string;
  to?: string;
  partyId?: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const istStart = (d: string) => new Date(`${d}T00:00:00.000+05:30`);
const istEnd = (d: string) => new Date(`${d}T23:59:59.999+05:30`);

const round2 = (n: number) => Math.round(n * 100) / 100;

const cleanItems = (items: VendorPurchaseItemInput[]) => {
  if (!Array.isArray(items) || items.length === 0) return { error: "Add at least one design" };
  const out = [];
  for (const [i, raw] of items.entries()) {
    const row = i + 1;
    const design = String(raw.design ?? "").trim();
    const pieces = Number(raw.pieces);
    const price = Number(raw.price);
    if (!design) return { error: `Line ${row}: enter the design name / number` };
    if (!Number.isInteger(pieces) || pieces < 1) return { error: `Line ${row}: pieces must be a whole number above 0` };
    if (!Number.isFinite(price) || price < 0) return { error: `Line ${row}: enter a valid price` };
    out.push({
      design,
      kurtiType: raw.kurtiType?.trim() || null,
      pieces,
      price: round2(price),
      imageUrl: raw.imageUrl || null,
      imagePath: raw.imagePath || null,
    });
  }
  return { items: out };
};

/** Finds the party by name (case-insensitive), adding it to the Party list when new. */
const resolveParty = async (name: string) => {
  const normalizedLowerCase = name.toLowerCase();
  const existing = await db.party.findUnique({ where: { normalizedLowerCase } });
  if (existing) return existing;
  return db.party.create({ data: { normalizedLowerCase, name } });
};

const validate = async (data: VendorPurchaseInput) => {
  const partyName = String(data.partyName ?? "").trim();
  if (!partyName) return { error: "Select or enter the vendor (party)" };
  if (!DATE_RE.test(data.date ?? "") || isNaN(istStart(data.date).getTime())) {
    return { error: "Select a valid purchase date" };
  }
  const cleaned = cleanItems(data.items);
  if ("error" in cleaned) return { error: cleaned.error };
  const party = await resolveParty(partyName);
  const items = cleaned.items;
  return {
    data: {
      partyId: party.id,
      partyName: party.name,
      // Noon IST keeps the calendar day stable whatever the server time zone is.
      date: new Date(`${data.date}T12:00:00.000+05:30`),
      items,
      totalPieces: items.reduce((s, it) => s + it.pieces, 0),
      totalAmount: round2(items.reduce((s, it) => s + it.pieces * it.price, 0)),
    },
  };
};

export const getVendorParties = async () => {
  const denied = await permissionError("vendorPurchases.view");
  if (denied) return { error: denied.error, parties: [] };
  const parties = await db.party.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return { parties };
};

export const getVendorPurchases = async (filter: VendorPurchaseFilter = {}) => {
  const denied = await permissionError("vendorPurchases.view");
  if (denied) return { error: denied.error };

  const where: any = {};
  if (filter.from && DATE_RE.test(filter.from)) where.date = { ...where.date, gte: istStart(filter.from) };
  if (filter.to && DATE_RE.test(filter.to)) where.date = { ...where.date, lte: istEnd(filter.to) };
  if (filter.partyId) where.partyId = filter.partyId;

  const purchases = await db.vendorPurchase.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return { purchases };
};

export const getVendorPurchase = async (id: string) => {
  const denied = await permissionError("vendorPurchases.view");
  if (denied) return { error: denied.error };
  try {
    const purchase = await db.vendorPurchase.findUnique({ where: { id } });
    if (!purchase) return { error: "Purchase not found" };
    return { purchase };
  } catch {
    return { error: "Purchase not found" };
  }
};

export const createVendorPurchase = async (input: VendorPurchaseInput) => {
  const denied = await permissionError("vendorPurchases.create");
  if (denied) return { error: denied.error };
  try {
    const checked = await validate(input);
    if ("error" in checked) return { error: checked.error };
    const user = await currentUser();
    const purchase = await db.vendorPurchase.create({
      data: {
        ...checked.data,
        createdById: user?.id ?? null,
        createdByName: user?.name ?? null,
      },
    });
    return { success: "Purchase saved", purchase };
  } catch (error: any) {
    console.error("Error creating vendor purchase:", error);
    return { error: error.message || "Failed to save purchase" };
  }
};

export const updateVendorPurchase = async (id: string, input: VendorPurchaseInput) => {
  const denied = await permissionError("vendorPurchases.edit");
  if (denied) return { error: denied.error };
  try {
    const existing = await db.vendorPurchase.findUnique({ where: { id } });
    if (!existing) return { error: "Purchase not found" };
    const checked = await validate(input);
    if ("error" in checked) return { error: checked.error };
    const purchase = await db.vendorPurchase.update({ where: { id }, data: checked.data });
    return { success: "Purchase updated", purchase };
  } catch (error: any) {
    console.error("Error updating vendor purchase:", error);
    return { error: error.message || "Failed to update purchase" };
  }
};

/** Returns the photo paths of the deleted bill so the caller can remove them from storage. */
export const deleteVendorPurchase = async (id: string) => {
  const denied = await permissionError("vendorPurchases.delete");
  if (denied) return { error: denied.error };
  try {
    const existing = await db.vendorPurchase.findUnique({ where: { id } });
    if (!existing) return { error: "Purchase not found" };
    await db.vendorPurchase.delete({ where: { id } });
    const imagePaths = existing.items.map((it) => it.imagePath).filter((p): p is string => !!p);
    return { success: "Purchase deleted", imagePaths };
  } catch (error: any) {
    console.error("Error deleting vendor purchase:", error);
    return { error: error.message || "Failed to delete purchase" };
  }
};
