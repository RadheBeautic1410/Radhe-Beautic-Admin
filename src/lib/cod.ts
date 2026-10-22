/**
 * Cash-on-delivery charge helpers (pure, no DB access).
 *
 * The courier charges per weight slab and destination zone. Admin keeps the
 * slabs and the zone pincode patterns in the DB (CodChargeSlab / CodSetting);
 * these helpers turn them into a quote for a parcel.
 *
 * Kept identical in the admin app (src/lib/cod.ts) and the customer app (lib/cod.ts).
 */

export type CodZone = "LOCAL" | "WITHIN_STATE" | "METRO" | "OTHER_STATES";

export const COD_ZONES: { key: CodZone; label: string; slabField: keyof CodSlabRates }[] = [
  { key: "LOCAL", label: "Local", slabField: "local" },
  { key: "WITHIN_STATE", label: "Within State", slabField: "withinState" },
  { key: "METRO", label: "Zone / Metro", slabField: "metro" },
  { key: "OTHER_STATES", label: "Other States", slabField: "otherStates" },
];

export const codZoneLabel = (zone: string | null | undefined): string =>
  COD_ZONES.find((z) => z.key === zone)?.label ?? "-";

export interface CodSlabRates {
  local: number;
  withinState: number;
  metro: number;
  otherStates: number;
}

export interface CodSlab extends CodSlabRates {
  maxWeightGrams: number;
}

export interface CodSettingValues {
  enabled: boolean;
  localPincodes: string[];
  withinStatePincodes: string[];
  metroPincodes: string[];
  /** Courier's COD fee, % of the product amount. */
  codFeePercent: number;
  /** GST charged on the COD fee. */
  gstPercent: number;
  /** Expected % of COD parcels that come back; kept parcels pay for their shipping. */
  returnRatePercent: number;
  /** Final charge is rounded up to a multiple of this (1, 5, 10). */
  roundTo: number;
}

/** Used until admin saves the settings for the first time. COD stays off. */
export const DEFAULT_COD_SETTING: CodSettingValues = {
  enabled: false,
  localPincodes: ["395*"],
  // Gujarat (39xxxx also covers Daman / Silvassa, which the courier bills the same way)
  withinStatePincodes: ["36*", "37*", "38*", "39*"],
  // Mumbai, Delhi, Kolkata, Chennai, Bengaluru, Hyderabad
  metroPincodes: ["400*", "110*", "700*", "600*", "560*", "500*"],
  codFeePercent: 2,
  gstPercent: 18,
  returnRatePercent: 0,
  roundTo: 1,
};

export const MAX_RETURN_RATE_PERCENT = 90;

/** Fills formula fields missing from a saved row (rows saved before they existed). */
export const withCodDefaults = (row: {
  enabled: boolean;
  localPincodes: string[];
  withinStatePincodes: string[];
  metroPincodes: string[];
  codFeePercent?: number | null;
  gstPercent?: number | null;
  returnRatePercent?: number | null;
  roundTo?: number | null;
}): CodSettingValues => ({
  enabled: row.enabled,
  localPincodes: row.localPincodes,
  withinStatePincodes: row.withinStatePincodes,
  metroPincodes: row.metroPincodes,
  codFeePercent: row.codFeePercent ?? DEFAULT_COD_SETTING.codFeePercent,
  gstPercent: row.gstPercent ?? DEFAULT_COD_SETTING.gstPercent,
  returnRatePercent: row.returnRatePercent ?? DEFAULT_COD_SETTING.returnRatePercent,
  roundTo: row.roundTo ?? DEFAULT_COD_SETTING.roundTo,
});

/** Speed Post Parcel Contractual, w.e.f. 01.08.2026, inclusive of GST. */
export const SPEED_POST_RATE_CARD: CodSlab[] = [
  [500, 34, 42, 48, 55],
  [1000, 37, 57, 77, 83],
  [1500, 42, 76, 130, 178],
  [2000, 53, 105, 166, 224],
  [3000, 67, 131, 224, 296],
  [4000, 81, 157, 277, 359],
  [5000, 95, 184, 325, 414],
  [6000, 114, 213, 395, 489],
  [7000, 131, 244, 467, 566],
  [8000, 148, 273, 537, 643],
  [9000, 167, 302, 607, 720],
  [10000, 184, 331, 679, 797],
  [11000, 201, 362, 749, 874],
  [12000, 220, 391, 821, 949],
  [13000, 237, 420, 891, 1026],
  [14000, 254, 449, 961, 1103],
  [15000, 273, 480, 1033, 1180],
  [16000, 290, 509, 1103, 1257],
  [17000, 307, 538, 1175, 1334],
  [18000, 326, 567, 1245, 1411],
  [19000, 343, 598, 1315, 1486],
  [20000, 362, 627, 1387, 1563],
  [21000, 379, 656, 1457, 1640],
  [22000, 396, 685, 1529, 1717],
  [23000, 415, 716, 1599, 1794],
  [24000, 432, 745, 1669, 1871],
].map(([maxWeightGrams, local, withinState, metro, otherStates]) => ({
  maxWeightGrams,
  local,
  withinState,
  metro,
  otherStates,
}));

export const normalizePincode = (pincode: string | null | undefined): string =>
  (pincode || "").replace(/\D/g, "").slice(0, 6);

/** Pattern forms: "395*" (prefix), "364001-364005" (range), "395004" (exact). */
export const validateCodPincodePattern = (pattern: string): string | null => {
  const p = pattern.trim();
  if (/^\d{1,5}\*+$/.test(p)) return null;
  const range = p.match(/^(\d{6})\s*-\s*(\d{6})$/);
  if (range) return Number(range[1]) < Number(range[2]) ? null : `Range start must be below end: ${p}`;
  if (/^\d{6}$/.test(p)) return null;
  return `Invalid pincode pattern "${p}". Use 395*, 364001-364005 or 395004`;
};

export const matchesCodPincodePattern = (pincode: string, pattern: string): boolean => {
  const p = pattern.trim();
  if (p.includes("*")) return pincode.startsWith(p.replace(/\*/g, ""));
  const range = p.match(/^(\d{6})\s*-\s*(\d{6})$/);
  if (range) {
    const n = Number(pincode);
    return n >= Number(range[1]) && n <= Number(range[2]);
  }
  return pincode === p;
};

/** Parses a comma / newline separated list typed by admin. */
export const parsePincodePatterns = (text: string): string[] =>
  Array.from(new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)));

/** Local wins over Within State, which wins over Metro (Ahmedabad is billed within-state). */
export const resolveCodZone = (pincode: string, setting: CodSettingValues): CodZone => {
  const pin = normalizePincode(pincode);
  const hit = (patterns: string[]) => patterns.some((p) => matchesCodPincodePattern(pin, p));
  if (hit(setting.localPincodes)) return "LOCAL";
  if (hit(setting.withinStatePincodes)) return "WITHIN_STATE";
  if (hit(setting.metroPincodes)) return "METRO";
  return "OTHER_STATES";
};

export type CodQuote =
  | {
      available: true;
      /** What the customer pays for COD delivery (rounded up). */
      charge: number;
      /** Courier shipping from the slab table; also what a returned parcel costs us. */
      shipping: number;
      /** Courier COD fee on the product amount, GST included. */
      codFee: number;
      /** Kept parcels' share of returned parcels' shipping. */
      returnCover: number;
      zone: CodZone;
      weightGrams: number;
      slabMaxGrams: number;
    }
  | { available: false; reason: string; zone?: CodZone; weightGrams: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * COD charge = shipping + COD fee (with GST) + return cover.
 *
 * A kept parcel costs us shipping + fee; a returned one costs shipping and pays
 * nothing. With return rate r, the kept parcels must also carry the returns:
 * return cover = shipping x r / (100 - r), so on average COD costs us nothing.
 *
 * Ignores `enabled` when `ignoreEnabled` is set (admin preview / RTO prefill).
 */
export const quoteCod = (
  weightGrams: number,
  pincode: string,
  productAmount: number,
  setting: CodSettingValues,
  slabs: CodSlab[],
  { ignoreEnabled = false }: { ignoreEnabled?: boolean } = {}
): CodQuote => {
  const weight = Math.max(0, Math.round(weightGrams || 0));
  if (!ignoreEnabled && !setting.enabled) {
    return { available: false, reason: "Cash on delivery is not available right now", weightGrams: weight };
  }
  if (normalizePincode(pincode).length !== 6) {
    return { available: false, reason: "Enter a valid 6-digit pincode", weightGrams: weight };
  }
  const zone = resolveCodZone(pincode, setting);
  const slab = [...slabs]
    .sort((a, b) => a.maxWeightGrams - b.maxWeightGrams)
    .find((s) => s.maxWeightGrams >= weight);
  if (!slab) {
    return { available: false, reason: "Order is too heavy for cash on delivery", zone, weightGrams: weight };
  }
  const field = COD_ZONES.find((z) => z.key === zone)!.slabField;
  const shipping = slab[field];
  const amount = Math.max(0, productAmount || 0);
  const codFee = round2(amount * (setting.codFeePercent / 100) * (1 + setting.gstPercent / 100));
  const r = Math.min(Math.max(setting.returnRatePercent || 0, 0), MAX_RETURN_RATE_PERCENT);
  const returnCover = round2((shipping * r) / (100 - r));
  const step = setting.roundTo > 0 ? setting.roundTo : 1;
  // Tiny epsilon so 66.0000000001 from float maths doesn't round up to 67.
  const charge = Math.ceil((shipping + codFee + returnCover) / step - 1e-9) * step;
  return {
    available: true,
    charge,
    shipping,
    codFee,
    returnCover,
    zone,
    weightGrams: weight,
    slabMaxGrams: slab.maxWeightGrams,
  };
};
