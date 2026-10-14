/**
 * Available pieces for the catalogue design search: positive size quantities minus
 * positive reserved quantities, floored at 0. Kept exactly as the /api/kurti/getall
 * route has always computed it, so search ordering does not change.
 */
export const availableStock = (kurti: { sizes?: unknown; reservedSizes?: unknown }) => {
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
  return Math.max(0, cnt);
};

/**
 * Orders search matches by available stock, highest first. The sort is stable, so
 * equal-stock designs keep the order the database returned them in, as before.
 */
export const rankByAvailableStock = <T extends { id: string; sizes?: unknown; reservedSizes?: unknown }>(
  matches: T[]
) =>
  matches
    .map((k) => ({ id: k.id, countOfPiece: availableStock(k) }))
    .sort((a, b) => b.countOfPiece - a.countOfPiece);

/** Page size for /api/kurti/getall: the catalogue asks for 12; anything larger is capped. */
export const MAX_SEARCH_PAGE_SIZE = 100;

export const clampPaging = (pageParam: string | null, limitParam: string | null) => {
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const limit = Math.min(MAX_SEARCH_PAGE_SIZE, Math.max(1, parseInt(limitParam || "12", 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};
