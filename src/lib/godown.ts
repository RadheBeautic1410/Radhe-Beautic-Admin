/**
 * Godown (warehouse / 3rd floor) stock helpers.
 *
 * A Kurti's `sizes` is a Json[] of `{ size, quantity }`. `quantity` is the TOTAL
 * number of pieces that exist for that size. `godownQuantity` is how many of those
 * total pieces are lying in the godown and are therefore NOT available on the
 * selling floor. Floor stock = quantity - godownQuantity.
 *
 * `godownQuantity` is optional - sizes saved before this feature simply have no
 * such key, which reads as 0 (everything on the floor), matching the old behaviour.
 */

export const VALID_SIZES: string[] = [
  "XS", "S", "M", "L", "XL", "XXL",
  "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL",
];

export const isValidSize = (str: string): boolean =>
  VALID_SIZES.includes(String(str || "").toUpperCase());

const toInt = (val: any): number => {
  const n = parseInt(String(val ?? 0), 10);
  return Number.isFinite(n) ? n : 0;
};

/** Total pieces of a size, across godown + selling floor. */
export const getTotalQty = (size: any): number => Math.max(0, toInt(size?.quantity));

/** Pieces of a size lying in the godown, never more than the total. */
export const getGodownQty = (size: any): number =>
  Math.min(getTotalQty(size), Math.max(0, toInt(size?.godownQuantity)));

/** Pieces of a size actually available on the selling floor. */
export const getFloorQty = (size: any): number =>
  Math.max(0, getTotalQty(size) - getGodownQty(size));

/** True when every piece of this size is in the godown and none is on the floor. */
export const needsFloorMove = (size: any): boolean =>
  getTotalQty(size) > 0 && getFloorQty(size) === 0;

/**
 * Clamp `godownQuantity` on a single size object into [0, quantity].
 * Returns a new object so callers never mutate the caller's array in place.
 */
export const normalizeSizeGodown = (size: any): any => ({
  ...size,
  quantity: getTotalQty(size),
  godownQuantity: getGodownQty(size),
});

/** Clamp `godownQuantity` across a whole `sizes` array. */
export const normalizeSizesGodown = (sizes: any[]): any[] =>
  (sizes || []).map(normalizeSizeGodown);

/**
 * Split a scanned barcode like "JR41223XL" into the kurti code and the size.
 * Mirrors the parsing already used by `addStock` in src/data/kurti.ts, including
 * the 6-character special case for CK0-prefixed codes.
 */
export const splitCodeAndSize = (
  raw: string
): { code: string; size: string } | null => {
  const input = String(raw || "").trim().toUpperCase();
  if (input.length < 7) return null;

  let code = input.substring(0, 7);
  let size = input.substring(7);

  if (input.substring(0, 2) === "CK" && input[2] === "0" && isValidSize(input.substring(6))) {
    code = input.substring(0, 6);
    size = input.substring(6);
  }

  if (!size.length || !isValidSize(size)) return null;
  return { code, size };
};

/** Every size of a kurti that has stock but nothing left on the selling floor. */
export const pendingFloorMoveSizes = (sizes: any[]): any[] =>
  (sizes || []).filter(needsFloorMove).map(normalizeSizeGodown);
