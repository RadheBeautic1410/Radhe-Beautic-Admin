import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  describeLocations,
  getGodownQty,
  getLocationQty,
  getTotalQty,
  pendingFloorMoveSizes,
  type StockLocation,
} from "@/src/lib/godown";
import {
  escapeRegex,
  locationStockPipeline,
  parseGodownPage,
  pendingFloorMovesPipeline,
} from "@/src/lib/godown-pipeline";

const aggregateRaw = vi.fn();
const findMany = vi.fn();
vi.mock("@/src/lib/db", () => ({ db: { kurti: { aggregateRaw, findMany } } }));

const { getPendingFloorMoves, getLocationStock } = await import("../godown");

// ---------------------------------------------------------------- fixtures

const kurti = (n: number, code: string, sizes: any[], extra: Record<string, any> = {}) => ({
  id: `id${n}`,
  code,
  category: "TET",
  party: "P",
  sellingPrice: "500",
  isDeleted: false,
  countOfPiece: 1,
  images: n % 3 ? [{ url: `https://img/${n}.jpg`, is_hidden: false }, { url: "second" }] : [],
  sizes,
  ...extra,
});

const FIXTURES = [
  kurti(1, "TET0001", [{ size: "m", quantity: 3 }]), // all in godown -> pending
  kurti(2, "TET0002", [{ size: "L", quantity: 4, floor1Quantity: 1 }]), // on floor 1
  kurti(3, "TET0003", [
    { size: "XL", quantity: 5, floor2Quantity: 2, shop316Quantity: 1 },
    { size: "S", quantity: "2" },
  ]),
  kurti(4, "TET0004", [{ size: "M", quantity: 2, shop316Quantity: 2 }]), // all at shop 316
  kurti(5, "TET0005", []),
  kurti(6, "TET0006", [{ size: "M", quantity: 6, floor1Quantity: 9 }]), // clamped to total
  ...Array.from({ length: 45 }, (_, i) =>
    kurti(10 + i, `TET1${String(i).padStart(3, "0")}`, [{ size: "M", quantity: (i % 4) + 1, floor1Quantity: i % 2 }])
  ),
];

/** getPendingFloorMoves before it moved to MongoDB, verbatim (minus the DB call). */
const legacyPending = (candidates: any[], page: number, pageSize: number) => {
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
        pendingPieces: pending.reduce((sum: number, s: any) => sum + getGodownQty(s), 0),
      };
    })
    .filter(Boolean) as any[];
  const start = (page - 1) * pageSize;
  return {
    items: matches.slice(start, start + pageSize),
    total: matches.length,
    totalPieces: matches.reduce((sum, m) => sum + (m.pendingPieces || 0), 0),
    page,
    pageSize,
  };
};

/** getLocationStock before it moved to MongoDB, verbatim (minus the DB call). */
const legacyLocation = (candidates: any[], location: StockLocation, page: number, pageSize: number) => {
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
};

/**
 * Stand-in for MongoDB: the facet the pipeline returns for these fixtures (the
 * pipeline itself is checked against a real server separately). Uses the legacy
 * result so the test isolates the JS side: page ids -> rows.
 */
const facetFrom = (legacy: { items: any[]; total: number; totalPieces: number }) => [
  {
    page: legacy.items.map((i) => ({ id: i.id })),
    totals: legacy.total ? [{ _id: null, total: legacy.total, totalPieces: legacy.totalPieces }] : [],
  },
];

/** findMany by id returns rows in arbitrary order, like MongoDB can. */
const findById = (rows: any[]) => async ({ where }: any) =>
  rows.filter((k) => where.id.in.includes(k.id)).reverse();

const withoutUnusedFields = (items: any[]) => items.map(({ party, sellingPrice, ...rest }) => rest);

beforeEach(() => {
  aggregateRaw.mockReset();
  findMany.mockReset();
});

// ---------------------------------------------------------------- tests

describe("getPendingFloorMoves", () => {
  it.each([
    [1, 20],
    [2, 20],
    [3, 20],
    [1, 50],
    [2, 10],
    [9, 20],
  ])("returns the same rows, totals and page boundaries as before (page %i, size %i)", async (page, pageSize) => {
    const legacy = legacyPending(FIXTURES, page, pageSize);
    aggregateRaw.mockResolvedValue(facetFrom(legacy));
    findMany.mockImplementation(findById(FIXTURES));

    const result = await getPendingFloorMoves({ page, pageSize });

    expect(result).toEqual({ ...legacy, items: withoutUnusedFields(legacy.items) });
    expect(result.items.length).toBeLessThanOrEqual(pageSize);
    // only the page's designs are loaded, never the whole inventory
    if (legacy.items.length) {
      expect(findMany).toHaveBeenCalledTimes(1);
      expect(findMany.mock.calls[0][0].where.id.in).toEqual(legacy.items.map((i) => i.id));
      expect(findMany.mock.calls[0][0].select).toEqual({
        id: true,
        code: true,
        category: true,
        sizes: true,
        images: true,
      });
    }
  });

  it("passes skip/limit, category and search to the pipeline", async () => {
    aggregateRaw.mockResolvedValue(facetFrom({ items: [], total: 0, totalPieces: 0 }));
    await getPendingFloorMoves({ page: 3, pageSize: 50, category: "tet", search: "ab" });
    const pipeline = aggregateRaw.mock.calls[0][0].pipeline;
    expect(pipeline).toEqual(pendingFloorMovesPipeline({ skip: 100, limit: 50, category: "tet", search: "ab" }));
    expect(pipeline[0].$match).toEqual({
      isDeleted: false,
      countOfPiece: { $gt: 0 },
      category: "TET",
      code: { $regex: "AB" },
    });
  });

  it("keeps empty inventory empty without loading any design", async () => {
    aggregateRaw.mockResolvedValue([{ page: [], totals: [] }]);
    const result = await getPendingFloorMoves({ page: 1, pageSize: 20 });
    expect(result).toEqual({ items: [], total: 0, totalPieces: 0, page: 1, pageSize: 20 });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("drops a design that was deleted or moved to the floor after the count was taken", async () => {
    const legacy = legacyPending(FIXTURES, 1, 20);
    aggregateRaw.mockResolvedValue(facetFrom(legacy));
    const [gone, moved, ...rest] = legacy.items.map((i) => FIXTURES.find((k) => k.id === i.id)!);
    const movedNow = { ...moved, sizes: [{ size: "M", quantity: 3, floor1Quantity: 3 }] };
    findMany.mockImplementation(findById([movedNow, ...rest]));

    const result = await getPendingFloorMoves({ page: 1, pageSize: 20 });

    expect(result.items.map((i: any) => i.id)).toEqual(rest.map((k) => k.id));
    expect(result.items.map((i: any) => i.id)).not.toContain(gone.id);
    // totals are the ones counted by MongoDB for this request
    expect(result.total).toBe(legacy.total);
  });

  it("returns the old empty result when the query fails", async () => {
    aggregateRaw.mockRejectedValue(new Error("boom"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await getPendingFloorMoves({ page: 2, pageSize: 10 });
    expect(result).toEqual({ items: [], total: 0, totalPieces: 0, page: 2, pageSize: 10 });
    expect(log).toHaveBeenCalled();
  });
});

describe("getLocationStock", () => {
  it.each(["FLOOR_1", "FLOOR_2", "SHOP_316", "GODOWN"] as StockLocation[])(
    "returns the same rows and totals as before for %s",
    async (location) => {
      for (const [page, pageSize] of [
        [1, 20],
        [2, 20],
        [4, 20],
      ]) {
        aggregateRaw.mockReset();
        findMany.mockReset();
        const legacy = legacyLocation(FIXTURES, location, page, pageSize);
        aggregateRaw.mockResolvedValue(facetFrom(legacy));
        findMany.mockImplementation(findById(FIXTURES));

        const result = await getLocationStock({ location, page, pageSize });

        expect(result).toEqual(legacy);
        expect(aggregateRaw.mock.calls[0][0].pipeline).toEqual(
          locationStockPipeline({ skip: (page - 1) * pageSize, limit: pageSize, location })
        );
      }
    }
  );
});

describe("pipeline helpers", () => {
  it("treats search text literally", () => {
    expect(escapeRegex("A.B(1)*")).toBe("A\\.B\\(1\\)\\*");
    const pipeline = locationStockPipeline({ skip: 0, limit: 20, search: "a.b", location: "GODOWN" });
    expect((pipeline[0] as any).$match.code).toEqual({ $regex: "A\\.B" });
  });

  it("reads plain and Extended JSON totals", () => {
    expect(parseGodownPage([{ page: [{ id: "a" }, { id: "b" }], totals: [{ total: 7, totalPieces: 30 }] }])).toEqual({
      ids: ["a", "b"],
      total: 7,
      totalPieces: 30,
    });
    expect(
      parseGodownPage([{ page: [], totals: [{ total: { $numberInt: "2" }, totalPieces: { $numberLong: "15" } }] }])
    ).toEqual({ ids: [], total: 2, totalPieces: 15 });
    expect(parseGodownPage([{ page: [], totals: [{ total: 1, totalPieces: { $numberDouble: "4.0" } }] }]).totalPieces).toBe(4);
  });

  it("reads an unexpected result as empty", () => {
    expect(parseGodownPage(undefined)).toEqual({ ids: [], total: 0, totalPieces: 0 });
    expect(parseGodownPage([])).toEqual({ ids: [], total: 0, totalPieces: 0 });
    expect(parseGodownPage([{ page: [{ id: 5 }, null], totals: null }])).toEqual({ ids: [], total: 0, totalPieces: 0 });
  });
});
