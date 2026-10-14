import { describe, expect, it } from "vitest";
import {
  availableStock,
  clampPaging,
  MAX_SEARCH_PAGE_SIZE,
  rankByAvailableStock,
} from "../kurti-search";

// The search path of /api/kurti/getall before it was split into rank + page fetch:
// every match loaded, stock computed, sorted, sliced. Kept verbatim as the oracle.
const legacySearchPage = (all: any[], skip: number, limit: number) => {
  const processed = all.map((kurti) => {
    let cnt = 0;
    const sizes = Array.isArray(kurti.sizes) ? kurti.sizes : [];
    for (let j = 0; j < sizes.length; j++) {
      const s = sizes[j] as any;
      if (s && s.quantity > 0) cnt += s.quantity;
    }
    const reserved = Array.isArray(kurti.reservedSizes) ? kurti.reservedSizes : [];
    for (let j = 0; j < reserved.length; j++) {
      const r = reserved[j] as any;
      if (r && r.quantity > 0) cnt -= r.quantity;
    }
    return { ...kurti, countOfPiece: Math.max(0, cnt) };
  });
  processed.sort((a, b) => b.countOfPiece - a.countOfPiece);
  return { total: processed.length, page: processed.slice(skip, skip + limit) };
};

const kurti = (id: string, sizes: any, reservedSizes: any = []) => ({ id, sizes, reservedSizes });

describe("availableStock", () => {
  it("sums positive size quantities and subtracts positive reservations", () => {
    expect(
      availableStock(kurti("a", [{ size: "M", quantity: 3 }, { size: "L", quantity: 2 }], [{ size: "M", quantity: 1 }]))
    ).toBe(4);
  });

  it("ignores zero/negative quantities and never goes below zero", () => {
    expect(availableStock(kurti("a", [{ quantity: -2 }, { quantity: 0 }, { quantity: 1 }]))).toBe(1);
    expect(availableStock(kurti("a", [{ quantity: 1 }], [{ quantity: 5 }]))).toBe(0);
  });

  it("treats missing or non-array fields as empty", () => {
    expect(availableStock({})).toBe(0);
    expect(availableStock({ sizes: null, reservedSizes: "x" })).toBe(0);
    expect(availableStock(kurti("a", [null, { quantity: 2 }]))).toBe(2);
  });
});

describe("rankByAvailableStock", () => {
  it("orders by stock desc and keeps database order for ties", () => {
    const ranked = rankByAvailableStock([
      kurti("a", [{ quantity: 1 }]),
      kurti("b", [{ quantity: 5 }]),
      kurti("c", [{ quantity: 1 }]),
      kurti("d", []),
      kurti("e", [{ quantity: 5 }]),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["b", "e", "a", "c", "d"]);
    expect(ranked.map((r) => r.countOfPiece)).toEqual([5, 5, 1, 1, 0]);
  });

  it("produces the same pages, totals and counts as the legacy search", () => {
    // Deterministic pseudo-random data with many ties and odd quantity values.
    let seed = 7;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const qty = () => [0, -1, 1, 2, 3, 5, 8][Math.floor(rand() * 7)];
    const all = Array.from({ length: 237 }, (_, i) =>
      kurti(
        `k${i}`,
        Array.from({ length: Math.floor(rand() * 4) }, () => ({ quantity: qty() })),
        Array.from({ length: Math.floor(rand() * 2) }, () => ({ quantity: qty() }))
      )
    );

    const ranked = rankByAvailableStock(all);
    const byId = new Map(all.map((k) => [k.id, k]));
    for (const limit of [12, 50]) {
      for (let page = 1; page <= Math.ceil(all.length / limit) + 1; page++) {
        const skip = (page - 1) * limit;
        const legacy = legacySearchPage(all, skip, limit);
        const current = ranked
          .slice(skip, skip + limit)
          .map((r) => ({ ...byId.get(r.id)!, countOfPiece: availableStock(byId.get(r.id)!) }));
        expect(ranked.length).toBe(legacy.total);
        expect(current).toEqual(legacy.page);
      }
    }
  });
});

describe("clampPaging", () => {
  it("keeps the catalogue's normal request unchanged", () => {
    expect(clampPaging("3", "12")).toEqual({ page: 3, limit: 12, skip: 24 });
  });

  it("defaults missing or invalid values", () => {
    expect(clampPaging(null, null)).toEqual({ page: 1, limit: 12, skip: 0 });
    expect(clampPaging("abc", "xyz")).toEqual({ page: 1, limit: 12, skip: 0 });
    expect(clampPaging("0", "-5")).toEqual({ page: 1, limit: 1, skip: 0 });
  });

  it("caps the page size", () => {
    expect(clampPaging("2", "100000")).toEqual({
      page: 2,
      limit: MAX_SEARCH_PAGE_SIZE,
      skip: MAX_SEARCH_PAGE_SIZE,
    });
  });
});
