import { db } from "@/src/lib/db";

/**
 * A design (kurti) is treated as a "full set" when every one of these sizes is
 * available with quantity greater than 0.
 */
export const FULL_SET_SIZES = ["M", "L", "XL", "XXL"];

/**
 * Mongo expression that resolves to true when the current kurti document holds
 * stock in all of FULL_SET_SIZES. Sizes/quantities are converted defensively so
 * a stray value in the Json[] column cannot break the whole aggregation.
 */
const isFullSetExpr = {
  $setIsSubset: [
    FULL_SET_SIZES,
    {
      $map: {
        input: {
          $filter: {
            input: { $ifNull: ["$sizes", []] },
            as: "s",
            cond: {
              $gt: [
                {
                  $convert: {
                    input: "$$s.quantity",
                    to: "double",
                    onError: 0,
                    onNull: 0,
                  },
                },
                0,
              ],
            },
          },
        },
        as: "s",
        in: {
          $toUpper: {
            $convert: {
              input: "$$s.size",
              to: "string",
              onError: "",
              onNull: "",
            },
          },
        },
      },
    },
  ],
};

/**
 * Number of full-set designs per category, keyed by the UPPERCASED category
 * name (kurti.category is stored with inconsistent casing across the app).
 */
export const getFullSetCountsByCategory = async (
  categoryNames: string[]
): Promise<Record<string, number>> => {
  const namesUpper = Array.from(
    new Set(categoryNames.filter(Boolean).map((name) => name.toUpperCase()))
  );

  if (namesUpper.length === 0) return {};

  try {
    const result = (await db.kurti.aggregateRaw({
      pipeline: [
        { $match: { isDeleted: false } },
        {
          $match: {
            $expr: { $in: [{ $toUpper: "$category" }, namesUpper] },
          },
        },
        {
          $project: {
            categoryUpper: { $toUpper: "$category" },
            isFullSet: isFullSetExpr,
          },
        },
        {
          $group: {
            _id: "$categoryUpper",
            fullSetCount: { $sum: { $cond: ["$isFullSet", 1, 0] } },
          },
        },
      ],
    })) as unknown as { _id: string; fullSetCount: number }[];

    return (result ?? []).reduce<Record<string, number>>((acc, row) => {
      if (row?._id) acc[row._id] = row.fullSetCount ?? 0;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error fetching full set counts:", error);
    return {};
  }
};

/**
 * Total number of full-set designs across every non-deleted kurti.
 */
export const getTotalFullSetCount = async (): Promise<number> => {
  try {
    const result = (await db.kurti.aggregateRaw({
      pipeline: [
        { $match: { isDeleted: false } },
        { $project: { isFullSet: isFullSetExpr } },
        {
          $group: {
            _id: null,
            fullSetCount: { $sum: { $cond: ["$isFullSet", 1, 0] } },
          },
        },
      ],
    })) as unknown as { _id: null; fullSetCount: number }[];

    return result?.[0]?.fullSetCount ?? 0;
  } catch (error) {
    console.error("Error fetching total full set count:", error);
    return 0;
  }
};

export interface FullSetKurti {
  code: string;
  category: string;
  image: string | null;
  /** Every image that is not hidden, for the zip download. */
  images: string[];
  sizes: { size: string; quantity: number }[];
}

/**
 * The actual full-set designs, for the popup opened from the catalogue counts.
 * Pass a category name to scope it to one row, or omit it for every category.
 */
export const getFullSetKurtis = async ({
  categoryName,
  page = 1,
  limit = 60,
}: {
  categoryName?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: FullSetKurti[]; total: number }> => {
  const skip = (Math.max(1, page) - 1) * limit;

  try {
    const result = (await db.kurti.aggregateRaw({
      pipeline: [
        { $match: { isDeleted: false } },
        ...(categoryName
          ? [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toUpper: "$category" }, categoryName.toUpperCase()],
                  },
                },
              },
            ]
          : []),
        {
          $project: {
            _id: 0,
            code: 1,
            category: 1,
            sizes: 1,
            image: { $arrayElemAt: ["$images.url", 0] },
            images: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$images", []] },
                    as: "img",
                    cond: { $ne: ["$$img.is_hidden", true] },
                  },
                },
                as: "img",
                in: "$$img.url",
              },
            },
            isFullSet: isFullSetExpr,
          },
        },
        { $match: { isFullSet: true } },
        { $sort: { code: 1 } },
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: limit },
              { $project: { isFullSet: 0 } },
            ],
            total: [{ $count: "count" }],
          },
        },
      ],
    })) as unknown as {
      data: any[];
      total: { count: number }[];
    }[];

    const facet = result?.[0];

    const data: FullSetKurti[] = (facet?.data ?? []).map((row) => ({
      code: String(row?.code ?? ""),
      category: String(row?.category ?? ""),
      image: typeof row?.image === "string" ? row.image : null,
      images: Array.isArray(row?.images)
        ? row.images.filter((url: any) => typeof url === "string" && url)
        : [],
      sizes: Array.isArray(row?.sizes)
        ? row.sizes
            .filter((size: any) =>
              FULL_SET_SIZES.includes(String(size?.size ?? "").toUpperCase())
            )
            .map((size: any) => ({
              size: String(size?.size ?? "").toUpperCase(),
              quantity: Number(size?.quantity ?? 0),
            }))
        : [],
    }));

    return { data, total: facet?.total?.[0]?.count ?? 0 };
  } catch (error) {
    console.error("Error fetching full set kurtis:", error);
    return { data: [], total: 0 };
  }
};
