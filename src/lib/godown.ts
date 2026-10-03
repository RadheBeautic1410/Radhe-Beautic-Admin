/**
 * Stock-location helpers.
 *
 * A Kurti's `sizes` is a Json[] of `{ size, quantity, ... }`. `quantity` is the
 * TOTAL number of pieces that exist for that size. Those pieces are spread over
 * four locations:
 *
 *   - FLOOR_1   showroom 1st (ground) floor, Shop 269      -> `floor1Quantity`
 *   - FLOOR_2   showroom 2nd floor, "Shop 269 Second Floor" -> `floor2Quantity`
 *   - SHOP_316  separate shop, stocked from the godown      -> `shop316Quantity`
 *   - GODOWN    3rd floor                                   -> the remainder
 *
 * Godown = quantity - floor1 - floor2 - shop316. A missing key reads as 0, so
 * anything that only raises `quantity` (new stock, returns) and every row saved
 * before these keys existed sits in the godown. Pieces are counted onto the
 * floors / shop 316 by scanning them there (a physical count), and have to be
 * there before a shop bill can sell them.
 *
 * Older rows may still carry `godownQuantity` / `showroomQuantity` from earlier
 * versions of this feature; they are ignored and dropped on the next write.
 */

export type StockLocation = "FLOOR_1" | "FLOOR_2" | "SHOP_316" | "GODOWN";

export const STOCK_LOCATIONS: StockLocation[] = ["FLOOR_1", "FLOOR_2", "SHOP_316", "GODOWN"];

/** Locations with an explicit count; the godown is whatever they leave. */
export const COUNTED_LOCATIONS: Exclude<StockLocation, "GODOWN">[] = ["FLOOR_1", "FLOOR_2", "SHOP_316"];

/** The key on a `sizes` row that stores each counted location. */
export const LOCATION_KEYS: Record<Exclude<StockLocation, "GODOWN">, string> = {
  FLOOR_1: "floor1Quantity",
  FLOOR_2: "floor2Quantity",
  SHOP_316: "shop316Quantity",
};

export const LOCATION_LABELS: Record<StockLocation, string> = {
  FLOOR_1: "1st Floor",
  FLOOR_2: "2nd Floor",
  SHOP_316: "Shop 316",
  GODOWN: "Godown",
};

export const isStockLocation = (val: any): val is StockLocation =>
  STOCK_LOCATIONS.includes(val);

/** `Shop` records (confirmed by the owner) and the stock each one sells. */
export const SHOP_LOCATIONS: Record<string, StockLocation> = {
  "688ced95e5b1f5afbc5b3ffb": "FLOOR_1", // Shop 269 - ground floor
  "688ced95e5b1f5afbc5b3ffd": "FLOOR_2", // Shop 269 Second Floor
  "688ced95e5b1f5afbc5b3ff9": "SHOP_316",
};

/** Which stock location a bill made under `shopId` sells from, or null if unknown. */
export const locationForShopId = (shopId?: string | null): StockLocation | null =>
  (shopId && SHOP_LOCATIONS[shopId]) || null;

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

/** Total pieces of a size, across every location. */
export const getTotalQty = (size: any): number => Math.max(0, toInt(size?.quantity));

/**
 * Pieces of a size at one location. Counted locations are clamped in order
 * (1st floor, 2nd floor, shop 316) so together they never exceed the total.
 */
export const getLocationQty = (size: any, location: StockLocation): number => {
  let left = getTotalQty(size);
  for (const loc of COUNTED_LOCATIONS) {
    const qty = Math.min(left, Math.max(0, toInt(size?.[LOCATION_KEYS[loc]])));
    if (loc === location) return qty;
    left -= qty;
  }
  return left; // GODOWN
};

export const getGodownQty = (size: any): number => getLocationQty(size, "GODOWN");

/** Pieces on either showroom floor. */
export const getShowroomQty = (size: any): number =>
  getLocationQty(size, "FLOOR_1") + getLocationQty(size, "FLOOR_2");

/** e.g. "1st Floor 2 · Shop 316 1 · Godown 3" - only the non-zero locations. */
export const describeLocations = (size: any): string => {
  const parts = STOCK_LOCATIONS.map((loc) => ({ loc, qty: getLocationQty(size, loc) }))
    .filter((p) => p.qty > 0)
    .map((p) => `${LOCATION_LABELS[p.loc]} ${p.qty}`);
  return parts.length ? parts.join(" · ") : "no stock";
};

/**
 * Pieces a bill can sell: the stock at the bill's location, or the total when no
 * location is known yet (e.g. an admin has not picked the shop).
 */
export const availableAtLocation = (size: any, location: StockLocation | null): number =>
  location ? getLocationQty(size, location) : getTotalQty(size);

/** True when a size has godown stock but nothing on either showroom floor. */
export const needsFloorMove = (size: any): boolean =>
  getShowroomQty(size) === 0 && getGodownQty(size) > 0;

/**
 * Rewrite a single size row into the current shape: explicit, clamped counts
 * for every counted location, and no keys left over from older versions.
 * Returns a new object so callers never mutate the caller's array in place.
 */
export const normalizeSizeLocations = (size: any): any => {
  const { godownQuantity, showroomQuantity, ...rest } = size || {};
  const row: any = { ...rest, quantity: getTotalQty(size) };
  for (const loc of COUNTED_LOCATIONS) {
    row[LOCATION_KEYS[loc]] = getLocationQty(size, loc);
  }
  return row;
};

export const normalizeSizesLocations = (sizes: any[]): any[] =>
  (sizes || []).map(normalizeSizeLocations);

const withLocationQty = (size: any, location: StockLocation, qty: number): any =>
  location === "GODOWN"
    ? size // the remainder, nothing to store
    : { ...size, [LOCATION_KEYS[location]]: qty };

/**
 * Take `qty` pieces out of one location (a sale). Lowers the total and that
 * location's count together. Throws when the location does not hold enough,
 * naming where the pieces actually are.
 */
export const deductFromLocation = (
  size: any,
  qty: number,
  location: StockLocation,
  label: string = String(size?.size || "")
): any => {
  const row = normalizeSizeLocations(size);
  const available = getLocationQty(row, location);
  if (qty > available) {
    throw new Error(
      `${label}: only ${available} in ${LOCATION_LABELS[location]}, need ${qty} (${describeLocations(row)})`
    );
  }
  const reduced = withLocationQty(row, location, available - qty);
  return { ...reduced, quantity: row.quantity - qty };
};

/** Put `qty` pieces back into / newly into one location (return, new stock). */
export const addToLocation = (size: any, qty: number, location: StockLocation): any => {
  const row = normalizeSizeLocations(size);
  const added = withLocationQty(row, location, getLocationQty(row, location) + qty);
  return { ...added, quantity: row.quantity + qty };
};

/**
 * Empty one location of a size (stock-take). Lowers the total by what was there,
 * leaving every other location untouched. Returns the new row and pieces removed.
 */
export const clearLocation = (
  size: any,
  location: StockLocation
): { row: any; removed: number } => {
  const row = normalizeSizeLocations(size);
  const removed = getLocationQty(row, location);
  return {
    row: { ...withLocationQty(row, location, 0), quantity: row.quantity - removed },
    removed,
  };
};

/**
 * Put every piece of a size in the godown, keeping the total. Used when a design
 * moves to another category: the pieces are re-labelled with the new code and
 * scanned back onto a floor from /godown.
 */
export const sendAllToGodown = (size: any): any =>
  normalizeSizeLocations({ ...size, floor1Quantity: 0, floor2Quantity: 0, shop316Quantity: 0 });

/** The moves that `sendAllToGodown` makes for one size row, for the StockMovement log. */
export const movesToGodown = (size: any) =>
  COUNTED_LOCATIONS.map((loc) => ({ from: loc, quantity: getLocationQty(size, loc) })).filter(
    (m) => m.quantity > 0
  );

/** Move `qty` pieces between locations. The total never changes. */
export const moveBetweenLocations = (
  size: any,
  from: StockLocation,
  to: StockLocation,
  qty: number = 1,
  label: string = String(size?.size || "")
): any => {
  if (from === to) throw new Error("From and To locations are the same.");
  const taken = deductFromLocation(size, qty, from, label);
  return addToLocation(taken, qty, to);
};

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

/** Every size of a kurti that has godown stock but nothing on either floor. */
export const pendingFloorMoveSizes = (sizes: any[]): any[] =>
  (sizes || []).filter(needsFloorMove).map(normalizeSizeLocations);
