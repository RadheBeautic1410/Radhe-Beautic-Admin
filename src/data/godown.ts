import { db } from "@/src/lib/db";
import {
  LOCATION_LABELS,
  STOCK_LOCATIONS,
  StockLocation,
  clearLocation,
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

const chunk = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Stock-take for a whole location: empty it across every category, so the team
 * can re-scan it from /addstock with "Add to" set to the same location. Other
 * locations keep their pieces.
 *
 * There can be thousands of designs, so the writes go out as a few bulk Mongo
 * commands instead of one request per design. Category "stock ready" flags are
 * left alone - the reseller app hides categories that are not stock ready.
 */
export const clearLocationEverywhere = async (location: StockLocation, clearedBy?: string) => {
  const kurtis = await db.kurti.findMany({
    where: { isDeleted: false, countOfPiece: { gt: 0 } },
    select: { id: true, code: true, category: true, sizes: true, countOfPiece: true },
  });

  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000); // IST-shifted, like the rest of the app
  const updates: any[] = [];
  const removedByCategory = new Map<string, number>();
  const log: any[] = [];
  let pieces = 0;

  for (const k of kurtis) {
    let removed = 0;
    const sizes = ((k.sizes as any[]) || [])
      .filter((s: any) => s !== null)
      .map((s: any) => {
        const cleared = clearLocation(s, location);
        if (cleared.removed > 0) {
          removed += cleared.removed;
          log.push({
            code: k.code,
            size: String(s.size).toUpperCase(),
            quantity: cleared.removed,
            fromLocation: location,
            toLocation: "CLEARED",
            movedBy: clearedBy ? `${clearedBy} (stock-take)` : "stock-take",
            kurtiId: k.id,
          });
        }
        return cleared.row;
      })
      .filter((s: any) => s.quantity > 0);
    if (removed === 0) continue;

    pieces += removed;
    const cat = String(k.category || "").toLowerCase();
    removedByCategory.set(cat, (removedByCategory.get(cat) || 0) + removed);
    updates.push({
      q: { _id: { $oid: k.id } },
      u: {
        $set: {
          sizes,
          countOfPiece: Math.max(0, (k.countOfPiece || 0) - removed),
          lastUpdatedTime: { $date: now.toISOString() },
        },
      },
    });
  }

  for (const part of chunk(updates, 500)) {
    await db.$runCommandRaw({ update: "Kurti", updates: part, ordered: false });
  }

  const categories = await db.category.findMany({
    where: { normalizedLowerCase: { in: Array.from(removedByCategory.keys()) } },
    select: { id: true, normalizedLowerCase: true, countTotal: true },
  });
  await Promise.all(
    categories.map((c) =>
      db.category.update({
        where: { id: c.id },
        data: {
          countTotal: Math.max(0, (c.countTotal || 0) - (removedByCategory.get(c.normalizedLowerCase) || 0)),
        },
      })
    )
  );

  for (const part of chunk(log, 1000)) {
    await db.stockMovement.createMany({ data: part });
  }

  return {
    success: `Cleared ${pieces} piece(s) of ${updates.length} design(s) from ${LOCATION_LABELS[location]}.`,
    pieces,
    designs: updates.length,
  };
};

/**
 * Pieces, designs and stock value at every location, plus the total. Value =
 * pieces x the design's selling price.
 */
export const getLocationSummary = async () => {
  const kurtis = await db.kurti.findMany({
    where: { isDeleted: false, countOfPiece: { gt: 0 } },
    select: { sizes: true, sellingPrice: true },
  });

  const totals = Object.fromEntries(
    STOCK_LOCATIONS.map((loc) => [loc, { pieces: 0, amount: 0, designs: 0 }])
  ) as Record<StockLocation, { pieces: number; amount: number; designs: number }>;

  for (const k of kurtis) {
    const price = parseInt(String(k.sellingPrice || "0"), 10) || 0;
    for (const loc of STOCK_LOCATIONS) {
      const pieces = ((k.sizes as any[]) || []).reduce(
        (sum: number, s: any) => sum + (s ? getLocationQty(s, loc) : 0),
        0
      );
      if (!pieces) continue;
      totals[loc].pieces += pieces;
      totals[loc].amount += pieces * price;
      totals[loc].designs += 1;
    }
  }

  const locations = STOCK_LOCATIONS.map((location) => ({ location, ...totals[location] }));
  return {
    locations,
    pieces: locations.reduce((sum, l) => sum + l.pieces, 0),
    amount: locations.reduce((sum, l) => sum + l.amount, 0),
  };
};

/**
 * Move several sizes of one design between two locations at once (e.g. a full
 * set from the godown to a floor). All or nothing: if any size lacks the pieces
 * at `from`, nothing moves. Every size is logged in StockMovement.
 */
export const moveStockBulk = async (
  rawCode: string,
  from: StockLocation,
  to: StockLocation,
  items: { size: string; quantity: number }[],
  movedBy?: string
) => {
  try {
    if (from === to) {
      return { error: "From and To locations must be different." };
    }
    const wanted = (items || [])
      .map((i) => ({
        size: String(i?.size || "").toUpperCase(),
        quantity: parseInt(String(i?.quantity ?? 0), 10) || 0,
      }))
      .filter((i) => i.size && i.quantity > 0);
    if (!wanted.length) {
      return { error: "Select at least one size with a quantity." };
    }

    const input = String(rawCode || "").trim().toUpperCase();
    const code = input.startsWith("CK0") ? input.substring(0, 6) : input.substring(0, 7);
    const kurti = await db.kurti.findUnique({ where: { code, isDeleted: false } });
    if (!kurti) {
      return { error: `No product found for code ${code}` };
    }

    const sizes = normalizeSizesLocations((kurti.sizes as any[]) || []);
    const errors: string[] = [];
    for (const item of wanted) {
      const idx = sizes.findIndex((s: any) => String(s.size).toUpperCase() === item.size);
      if (idx === -1) {
        errors.push(`${item.size} does not exist on ${code}`);
        continue;
      }
      try {
        sizes[idx] = moveBetweenLocations(sizes[idx], from, to, item.quantity, `${code} - ${item.size}`);
      } catch (e: any) {
        errors.push(e.message);
      }
    }
    if (errors.length) {
      return { error: `Nothing moved. ${errors.join("; ")}` };
    }

    const [updated] = await db.$transaction([
      db.kurti.update({ where: { code }, data: { sizes } }),
      db.stockMovement.createMany({
        data: wanted.map((item) => ({
          code,
          size: item.size,
          quantity: item.quantity,
          fromLocation: from,
          toLocation: to,
          movedBy: movedBy || null,
          kurtiId: kurti.id,
        })),
      }),
    ]);

    const pieces = wanted.reduce((sum, i) => sum + i.quantity, 0);
    return {
      success: `Moved ${pieces} piece(s) of ${code} (${wanted
        .map((i) => `${i.size}×${i.quantity}`)
        .join(", ")}) from ${LOCATION_LABELS[from]} to ${LOCATION_LABELS[to]}.`,
      data: updated,
      pieces,
    };
  } catch (e: any) {
    console.log("moveStockBulk:", e.message);
    return { error: "Something went wrong" };
  }
};
