/**
 * MongoDB aggregation builders for the godown list pages (pending floor moves,
 * stock at one location).
 *
 * Those pages used to load every in-stock design (sizes + all images) and filter
 * and paginate in memory. The pipelines below do the filtering, counting, sorting
 * and paging in MongoDB and return only the ids of the requested page plus the
 * totals; the page's rows are then mapped with the same JS helpers as before.
 *
 * Every expression here mirrors a helper in src/lib/godown.ts exactly - most of
 * all `toInt` (parseInt(String(v ?? 0), 10)), which decides how odd stored values
 * such as "5abc", 3.7, "  4", true or [2] are counted.
 */
import { COUNTED_LOCATIONS, LOCATION_KEYS, StockLocation } from "@/src/lib/godown";

type Expr = any;

const NAN: Expr = { $toDouble: "NaN" };
const INF: Expr = { $toDouble: "Infinity" };

/**
 * JS turns a number into exponent notation ("1e-7", "1e+21") below 1e-6 and from
 * 1e21 up; parseInt then reads only the digit before the dot or "e" - the leading
 * significant digit. That is the first non-zero digit of any decimal rendering of
 * the number, so it is read from MongoDB's own string form; the sign is kept.
 */
const exponentLeadingDigit = (v: Expr): Expr => ({
  $multiply: [
    { $cond: [{ $lt: [v, 0] }, -1, 1] },
    {
      $toInt: {
        $getField: {
          field: "match",
          input: { $regexFind: { input: { $toString: { $abs: v } }, regex: "[1-9]" } },
        },
      },
    },
  ],
});

/** parseInt(String(n), 10) for a finite or non-finite double. */
const parseIntOfDouble = (v: Expr): Expr => ({
  $switch: {
    branches: [
      { case: { $eq: [v, NAN] }, then: 0 }, // "NaN"
      { case: { $eq: [{ $abs: v }, INF] }, then: 0 }, // "Infinity"
      { case: { $eq: [v, 0] }, then: 0 },
      {
        case: { $or: [{ $gte: [{ $abs: v }, 1e21] }, { $lt: [{ $abs: v }, 1e-6] }] },
        then: exponentLeadingDigit(v),
      },
    ],
    default: { $trunc: [v, 0] },
  },
});

/**
 * Leading whitespace parseInt skips (JS StrWhiteSpaceChar), then an optional sign
 * and ASCII digits. parseInt stops at the first other character.
 */
const PARSE_INT_PATTERN =
  "^[\\t\\n\\x{0B}\\f\\r \\x{A0}\\x{FEFF}\\x{1680}\\x{2000}-\\x{200A}\\x{2028}\\x{2029}\\x{202F}\\x{205F}\\x{3000}]*([+-]?)([0-9]+)";

/** parseInt(String(v), 10) for a scalar (not an array). */
const parseIntOfScalar = (v: Expr): Expr => ({
  $switch: {
    branches: [
      { case: { $in: [{ $type: v }, ["int", "long"]] }, then: { $toDouble: v } },
      { case: { $in: [{ $type: v }, ["double", "decimal"]] }, then: parseIntOfDouble({ $toDouble: v }) },
      {
        case: { $eq: [{ $type: v }, "string"] },
        then: {
          $let: {
            vars: { m: { $regexFind: { input: v, regex: PARSE_INT_PATTERN } } },
            in: {
              $cond: [
                { $eq: ["$$m", null] },
                0,
                {
                  $multiply: [
                    { $cond: [{ $eq: [{ $arrayElemAt: ["$$m.captures", 0] }, "-"] }, -1, 1] },
                    { $toDouble: { $arrayElemAt: ["$$m.captures", 1] } },
                  ],
                },
              ],
            },
          },
        },
      },
    ],
    // null / missing (`v ?? 0` -> 0), booleans, objects, dates, ids: parseInt -> NaN -> 0
    default: 0,
  },
});

/**
 * toInt from src/lib/godown.ts: parseInt(String(v ?? 0), 10), NaN -> 0.
 * String([a, b]) is "a,b", so an array reads as its first element; a nested array
 * as first element is not expected in stock data and reads as 0.
 */
export const toIntExpr = (v: Expr): Expr => ({
  $let: {
    vars: { raw: v },
    in: {
      $cond: [
        { $isArray: "$$raw" },
        {
          $let: {
            vars: { first: { $arrayElemAt: ["$$raw", 0] } },
            in: {
              $cond: [{ $isArray: "$$first" }, 0, parseIntOfScalar("$$first")],
            },
          },
        },
        parseIntOfScalar("$$raw"),
      ],
    },
  },
});

/** `size?.[key]`: only an object row has fields. */
const sizeField = (size: Expr, key: string): Expr => ({
  $cond: [{ $eq: [{ $type: size }, "object"] }, `${size}.${key}`, null],
});

/**
 * Pieces of every location for one `sizes` row, exactly as getLocationQty computes
 * them: total = max(0, toInt(quantity)); each counted location, in order, is
 * clamped to what the previous ones left; the godown gets the remainder.
 * `size` must be a variable reference such as "$$s".
 */
export const sizeLocationsExpr = (size: Expr): Expr => {
  const total = { $max: [0, toIntExpr(sizeField(size, "quantity"))] };
  const counted = (loc: Exclude<StockLocation, "GODOWN">) => ({
    $max: [0, toIntExpr(sizeField(size, LOCATION_KEYS[loc]))],
  });
  const [l1, l2, l3] = COUNTED_LOCATIONS;
  return {
    $let: {
      vars: { left0: total },
      in: {
        $let: {
          vars: { q1: { $min: ["$$left0", counted(l1)] } },
          in: {
            $let: {
              vars: { left1: { $subtract: ["$$left0", "$$q1"] } },
              in: {
                $let: {
                  vars: { q2: { $min: ["$$left1", counted(l2)] } },
                  in: {
                    $let: {
                      vars: { left2: { $subtract: ["$$left1", "$$q2"] } },
                      in: {
                        $let: {
                          vars: { q3: { $min: ["$$left2", counted(l3)] } },
                          in: {
                            FLOOR_1: "$$q1",
                            FLOOR_2: "$$q2",
                            SHOP_316: "$$q3",
                            GODOWN: { $subtract: ["$$left2", "$$q3"] },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};

/** `sizes` with every row replaced by its per-location counts. */
const sizesWithLocations = {
  $map: {
    input: { $cond: [{ $isArray: "$sizes" }, "$sizes", []] },
    as: "s",
    in: sizeLocationsExpr("$$s"),
  },
};

/** Escape a user-typed string for literal use inside a regex (code "contains"). */
export const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The candidate filter the old Prisma query used: not deleted, countOfPiece > 0,
 * optional exact category and case-sensitive "code contains". Written as native
 * operators so the isDeleted/countOfPiece index can serve it.
 */
const candidateMatch = ({ category, search }: { category?: string; search?: string }) => ({
  $match: {
    isDeleted: false,
    countOfPiece: { $gt: 0 },
    ...(category ? { category: category.toUpperCase() } : {}),
    ...(search ? { code: { $regex: escapeRegex(search.toUpperCase()) } } : {}),
  },
});

/** Sort by code (unique, as before), page, and count every match. */
const pageAndTotals = (skip: number, limit: number) => [
  { $project: { _id: 0, id: { $toString: "$_id" }, code: 1, pieces: 1 } },
  {
    $facet: {
      page: [{ $sort: { code: 1 } }, { $skip: skip }, { $limit: limit }, { $project: { id: 1 } }],
      totals: [{ $group: { _id: null, total: { $sum: 1 }, totalPieces: { $sum: "$pieces" } } }],
    },
  },
];

export interface GodownPageArgs {
  skip: number;
  limit: number;
  search?: string;
}

/**
 * Designs with at least one size that has godown stock but nothing on either
 * showroom floor (needsFloorMove); pieces = their godown pieces.
 */
export const pendingFloorMovesPipeline = ({
  skip,
  limit,
  category,
  search,
}: GodownPageArgs & { category?: string }) => [
  candidateMatch({ category, search }),
  { $project: { code: 1, locs: sizesWithLocations } },
  {
    $project: {
      code: 1,
      pending: {
        $filter: {
          input: "$locs",
          as: "l",
          cond: {
            $and: [
              { $eq: [{ $add: ["$$l.FLOOR_1", "$$l.FLOOR_2"] }, 0] },
              { $gt: ["$$l.GODOWN", 0] },
            ],
          },
        },
      },
    },
  },
  { $match: { "pending.0": { $exists: true } } },
  { $project: { code: 1, pieces: { $sum: "$pending.GODOWN" } } },
  ...pageAndTotals(skip, limit),
];

/** Designs with pieces at `location`; pieces = their total there. */
export const locationStockPipeline = ({
  skip,
  limit,
  search,
  location,
}: GodownPageArgs & { location: StockLocation }) => [
  candidateMatch({ search }),
  {
    $project: {
      code: 1,
      atLocation: {
        $filter: {
          input: { $map: { input: sizesWithLocations, as: "l", in: `$$l.${location}` } },
          as: "q",
          cond: { $gt: ["$$q", 0] },
        },
      },
    },
  },
  { $match: { "atLocation.0": { $exists: true } } },
  { $project: { code: 1, pieces: { $sum: "$atLocation" } } },
  ...pageAndTotals(skip, limit),
];

/** Numbers can come back from aggregateRaw as Extended JSON ({ $numberLong: "3" }). */
const toNumber = (val: any): number => {
  if (typeof val === "number") return val;
  if (val && typeof val === "object") {
    const raw = val.$numberInt ?? val.$numberLong ?? val.$numberDouble ?? val.$numberDecimal;
    if (raw !== undefined) return Number(raw);
  }
  return 0;
};

export interface GodownPageResult {
  ids: string[];
  total: number;
  totalPieces: number;
}

/** Reads the single $facet document; anything unexpected reads as an empty result. */
export const parseGodownPage = (raw: unknown): GodownPageResult => {
  const doc = Array.isArray(raw) ? raw[0] : undefined;
  const ids = (Array.isArray(doc?.page) ? doc.page : [])
    .map((row: any) => row?.id)
    .filter((id: unknown): id is string => typeof id === "string");
  const totals = Array.isArray(doc?.totals) ? doc.totals[0] : undefined;
  return {
    ids,
    total: toNumber(totals?.total),
    totalPieces: toNumber(totals?.totalPieces),
  };
};
