// Customer-price calculation for retailer/offline bills: category big-size
// price plus "N pieces for ₹X" offers.

export const BIG_SIZES = ["3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];

export const isBigSize = (size: string) =>
  BIG_SIZES.includes(String(size || "").trim().toUpperCase());

export interface PricingOffer {
  id: string;
  name: string;
  qty: number;
  totalAmount: number | null;
  categories: string[]; // category ids
}

export interface PricingCategory {
  id: string;
  normalizedLowerCase: string;
  customerBigPrice: number | null;
}

export interface PricingLine {
  key: string;
  // Kurti.category (the category name) and the kurti-level fields we need.
  category: string;
  size: string;
  quantity: number;
  customerPrice: number | null;
  isBigPrice: boolean;
}

export interface PricedLine {
  key: string;
  // Integer rupees per piece (selledPrice is an Int column); null when the
  // kurti has no customer price and the seller must type one.
  unitPrice: number | null;
  // What the line would cost without any offer (base + big-size price).
  regularUnitPrice: number | null;
  offerName?: string;
  offerPieces: number;
}

/**
 * Per piece: customerPrice (+ the category's big-size price on 3XL and up).
 * Offers then replace the customerPrice part for full bundles of `qty` pieces
 * with totalAmount / qty; the big-size price is still added on top. Pieces
 * left over after bundling stay at the regular price.
 */
export const priceLines = (
  lines: PricingLine[],
  offers: PricingOffer[],
  categories: PricingCategory[],
): PricedLine[] => {
  const catByName = new Map(
    categories.map((c) => [c.normalizedLowerCase, c] as const),
  );

  interface Unit {
    line: number;
    base: number;
    bigAddon: number;
    categoryId: string | null;
    price: number;
    offerName?: string;
  }

  const units: Unit[] = [];
  const results: PricedLine[] = lines.map((l) => ({
    key: l.key,
    unitPrice: null,
    regularUnitPrice: null,
    offerPieces: 0,
  }));

  lines.forEach((l, idx) => {
    const base = Number(l.customerPrice);
    if (!Number.isFinite(base) || base <= 0) return;
    const cat = catByName.get(String(l.category || "").trim().toLowerCase());
    const bigAddon =
      l.isBigPrice && isBigSize(l.size) ? Number(cat?.customerBigPrice) || 0 : 0;
    results[idx].regularUnitPrice = base + bigAddon;
    for (let i = 0; i < l.quantity; i++) {
      units.push({
        line: idx,
        base,
        bigAddon,
        categoryId: cat?.id ?? null,
        price: base + bigAddon,
      });
    }
  });

  // Best deal first, so a piece goes to the cheapest offer that can take it.
  const usable = offers
    .filter((o) => o.qty > 0 && o.totalAmount != null && o.totalAmount > 0)
    .sort((a, b) => a.totalAmount! / a.qty - b.totalAmount! / b.qty);

  const claimed = new Set<Unit>();
  for (const offer of usable) {
    const total = offer.totalAmount!;
    const eligible = units
      .filter(
        (u) =>
          !claimed.has(u) &&
          u.categoryId &&
          offer.categories.includes(u.categoryId),
      )
      .sort((a, b) => b.base - a.base);

    // Bundles may mix categories and prices (e.g. 280 + 280 + 300 for ₹850).
    // A bundle is only applied when it is cheaper than its regular total; the
    // offer total is then shared in proportion to each piece's own price, so
    // no piece ends up dearer than it was.
    for (let i = 0; i + offer.qty <= eligible.length; i += offer.qty) {
      const bundle = eligible.slice(i, i + offer.qty);
      const regularTotal = bundle.reduce((s, u) => s + u.base, 0);
      if (total >= regularTotal) break; // later bundles are cheaper still

      let allocated = 0;
      bundle.forEach((u, j) => {
        const share =
          j === bundle.length - 1
            ? total - allocated
            : Math.round((u.base * total) / regularTotal);
        allocated += share;
        u.price = share + u.bigAddon;
        u.offerName = offer.name;
        claimed.add(u);
      });
    }
  }

  const sums = new Map<number, { total: number; count: number }>();
  units.forEach((u) => {
    const s = sums.get(u.line) ?? { total: 0, count: 0 };
    s.total += u.price;
    s.count += 1;
    sums.set(u.line, s);
    if (u.offerName) {
      results[u.line].offerName = u.offerName;
      results[u.line].offerPieces += 1;
    }
  });
  sums.forEach((s, idx) => {
    results[idx].unitPrice = Math.round(s.total / s.count);
  });

  return results;
};
