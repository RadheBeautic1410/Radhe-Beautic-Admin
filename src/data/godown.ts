import { db } from "@/src/lib/db";
import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  describeLocations,
  getGodownQty,
  getLocationQty,
  getTotalQty,
  moveBetweenLocations,
  normalizeSizesLocations,
  pendingFloorMoveSizes,
  splitCodeAndSize,
} from "@/src/lib/godown";

/** Pieces of one size at every location, e.g. { FLOOR_1: 2, ..., GODOWN: 3 }. */
const locationCounts = (size: any): Record<StockLocation, number> =>
  Object.fromEntries(
    STOCK_LOCATIONS.map((loc) => [loc, getLocationQty(size, loc)])
  ) as Record<StockLocation, number>;

/**
 * Move a single scanned piece from one stock location to another.
 *
 * This never changes `quantity` (the total piece count) or `countOfPiece` - the
 * piece already exists, we are only recording where it is sitting. Every move
 * is written to StockMovement.
 */
export const moveStockLocation = async (
  rawCode: string,
  from: StockLocation,
  to: StockLocation,
  movedBy?: string
) => {
  try {
    if (from === to) {
      return { error: "From and To locations must be different." };
    }
    const parsed = splitCodeAndSize(rawCode);
    if (!parsed) {
      return {
        error:
          "Enter a valid code with size at the end, e.g. JR41223XL. Valid sizes: XS, S, M, L, XL, XXL, 3XL-10XL",
      };
    }
    const { code, size } = parsed;

    const kurti = await db.kurti.findUnique({
      where: { code, isDeleted: false },
    });
    if (!kurti) {
      return { error: `No product found for code ${code}` };
    }

    const sizes = normalizeSizesLocations((kurti.sizes as any[]) || []);
    const idx = sizes.findIndex(
      (s: any) => String(s.size).toUpperCase() === size
    );
    if (idx === -1) {
      return { error: `Size ${size} does not exist on ${code}` };
    }
    if (getTotalQty(sizes[idx]) === 0) {
      return { error: `${code} - ${size} has no stock. Add stock first.` };
    }

    try {
      sizes[idx] = moveBetweenLocations(sizes[idx], from, to, 1, `${code} - ${size}`);
    } catch (e: any) {
      return { error: e.message };
    }

    const [updated] = await db.$transaction([
      db.kurti.update({ where: { code }, data: { sizes } }),
      db.stockMovement.create({
        data: {
          code,
          size,
          quantity: 1,
          fromLocation: from,
          toLocation: to,
          movedBy: movedBy || null,
          kurtiId: kurti.id,
        },
      }),
    ]);

    const target = sizes[idx];
    return {
      success: `Moved 1 piece of ${code} - ${size} from ${LOCATION_LABELS[from]} to ${LOCATION_LABELS[to]}.`,
      data: updated,
      size,
      totalQuantity: getTotalQty(target),
      counts: locationCounts(target),
      summary: describeLocations(target),
    };
  } catch (e: any) {
    console.log("moveStockLocation:", e.message);
    return { error: "Something went wrong" };
  }
};

export const getRecentStockMovements = async (limit = 50) => {
  try {
    return await db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch (e: any) {
    console.log("getRecentStockMovements:", e.message);
    return [];
  }
};

interface PendingFloorMovesArgs {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

/**
 * Every product/size that has godown stock but nothing left in the showroom,
 * i.e. it should be brought down to sell.
 *
 * `sizes` is a Json[] so Mongo cannot filter on the location counts directly -
 * we narrow as far as the DB allows (in stock, not deleted) and finish in memory.
 */
export const getPendingFloorMoves = async ({
  page = 1,
  pageSize = 20,
  category,
  search,
}: PendingFloorMovesArgs = {}) => {
  try {
    const where: any = { isDeleted: false, countOfPiece: { gt: 0 } };
    if (category) where.category = category.toUpperCase();
    if (search) where.code = { contains: search.toUpperCase() };

    const candidates = await db.kurti.findMany({
      where,
      select: {
        id: true,
        code: true,
        category: true,
        party: true,
        sellingPrice: true,
        sizes: true,
        images: true,
      },
      orderBy: { code: "asc" },
    });

    const matches = candidates
      .map((k: any) => {
        const pending = pendingFloorMoveSizes((k.sizes as any[]) || []);
        if (!pending.length) return null;
        return {
          id: k.id,
          code: k.code,
          category: k.category,
          party: k.party,
          sellingPrice: k.sellingPrice,
          image: Array.isArray(k.images) && k.images.length ? k.images[0] : null,
          pendingSizes: pending.map((s: any) => ({
            size: String(s.size).toUpperCase(),
            quantity: getTotalQty(s),
            godownQuantity: getGodownQty(s),
          })),
          pendingPieces: pending.reduce(
            (sum: number, s: any) => sum + getGodownQty(s),
            0
          ),
        };
      })
      .filter(Boolean) as any[];

    const total = matches.length;
    const totalPieces = matches.reduce(
      (sum, m) => sum + (m.pendingPieces || 0),
      0
    );
    const start = (page - 1) * pageSize;

    return {
      items: matches.slice(start, start + pageSize),
      total,
      totalPieces,
      page,
      pageSize,
    };
  } catch (e: any) {
    console.log("getPendingFloorMoves:", e.message);
    return { items: [], total: 0, totalPieces: 0, page, pageSize };
  }
};

interface LocationStockArgs {
  location: StockLocation;
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * Every product with stock at one location, with the per-size counts there -
 * e.g. what shop 316 is currently holding.
 */
export const getLocationStock = async ({
  location,
  page = 1,
  pageSize = 20,
  search,
}: LocationStockArgs) => {
  try {
    const where: any = { isDeleted: false, countOfPiece: { gt: 0 } };
    if (search) where.code = { contains: search.toUpperCase() };

    const candidates = await db.kurti.findMany({
      where,
      select: { id: true, code: true, category: true, sizes: true, images: true },
      orderBy: { code: "asc" },
    });

    const matches = candidates
      .map((k: any) => {
        const sizes = ((k.sizes as any[]) || [])
          .map((s: any) => ({
            size: String(s?.size || "").toUpperCase(),
            quantity: getLocationQty(s, location),
            elsewhere: describeLocations(s),
          }))
          .filter((s) => s.quantity > 0);
        if (!sizes.length) return null;
        return {
          id: k.id,
          code: k.code,
          category: k.category,
          image: Array.isArray(k.images) && k.images.length ? k.images[0] : null,
          sizes,
          pieces: sizes.reduce((sum, s) => sum + s.quantity, 0),
        };
      })
      .filter(Boolean) as any[];

    const start = (page - 1) * pageSize;
    return {
      items: matches.slice(start, start + pageSize),
      total: matches.length,
      totalPieces: matches.reduce((sum, m) => sum + m.pieces, 0),
      page,
      pageSize,
    };
  } catch (e: any) {
    console.log("getLocationStock:", e.message);
    return { items: [], total: 0, totalPieces: 0, page, pageSize };
  }
};
