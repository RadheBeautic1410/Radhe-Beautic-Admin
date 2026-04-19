/** Adult catalogue sizes (existing behaviour). */
export const ADULT_KURTI_SIZES: string[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
  "5XL",
  "6XL",
  "7XL",
  "8XL",
  "9XL",
  "10XL",
];

/**
 * Children categories: age bands up to 11 years (pairs of years).
 * Stored as the `size` string on each kurti line (same JSON shape as adults).
 */
export const CHILDREN_AGE_SIZES: string[] = [
  "2 to 3 Years",
  "4 to 5 Years",
  "6 to 7 Years",
  "8 to 9 Years",
  "10 to 11 Years",
];

export function getSizeOptionsForCategory(isForChildren?: boolean | null): string[] {
  return isForChildren ? [...CHILDREN_AGE_SIZES] : [...ADULT_KURTI_SIZES];
}

export function sortSizesByCatalogueKind(
  sizes: string[],
  isForChildren: boolean
): string[] {
  const order = isForChildren ? CHILDREN_AGE_SIZES : ADULT_KURTI_SIZES;
  return [...new Set(sizes)].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}
