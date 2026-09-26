import { db } from "@/src/lib/db";
import {
  getFloorQty,
  getGodownQty,
  getTotalQty,
  normalizeSizesGodown,
  pendingFloorMoveSizes,
  splitCodeAndSize,
} from "@/src/lib/godown";

export type GodownDirection = "TO_GODOWN" | "TO_FLOOR";

/**
 * Move a single scanned piece between the selling floor and the godown.
 *
 * This never changes `quantity` (the total piece count) or `countOfPiece` - the
 * piece already exists, we are only recording which floor it is sitting on.
 */
export const moveStockLocation = async (
  rawCode: string,
  direction: GodownDirection
) => {
  try {
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

    const sizes = normalizeSizesGodown((kurti.sizes as any[]) || []);
    const target = sizes.find(
      (s: any) => String(s.size).toUpperCase() === size
    );

    if (!target) {
      return { error: `Size ${size} does not exist on ${code}` };
    }

    const total = getTotalQty(target);
    const godown = getGodownQty(target);

    if (total === 0) {
      return { error: `${code} - ${size} has no stock. Add stock first.` };
    }

    if (direction === "TO_GODOWN") {
      if (godown >= total) {
        return {
          error: `All ${total} piece(s) of ${code} - ${size} are already in the godown.`,
        };
      }
      target.godownQuantity = godown + 1;
    } else {
      if (godown <= 0) {
        return {
          error: `No godown stock for ${code} - ${size} to move to the floor.`,
        };
      }
      target.godownQuantity = godown - 1;
    }

    const updated = await db.kurti.update({
      where: { code },
      data: { sizes },
    });

    return {
      success:
        direction === "TO_GODOWN"
          ? `Moved 1 piece of ${code} - ${size} into godown.`
          : `Moved 1 piece of ${code} - ${size} to the selling floor.`,
      data: updated,
      size,
      totalQuantity: getTotalQty(target),
      godownQuantity: getGodownQty(target),
      floorQuantity: getFloorQty(target),
    };
  } catch (e: any) {
    console.log("moveStockLocation:", e.message);
    return { error: "Something went wrong" };
  }
};

interface PendingFloorMovesArgs {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}

/**
 * Every product/size that still has stock but nothing left on the selling floor,
 * i.e. every piece is sitting in the godown and should be brought down to sell.
 *
 * `sizes` is a Json[] so Mongo cannot filter on `godownQuantity` directly - we
 * narrow as far as the DB allows (in stock, not deleted) and finish in memory.
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
