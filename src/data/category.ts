import { db } from "@/src/lib/db";

export const getCategoryByID = async (id: string) => {
  try {
    const category = await db.category.findUnique({
      where: { id },
    });

    return category;
  } catch {
    return null;
  }
};

export const getCategorybyName = async (name: string) => {
  try {
    const category = await db.category.findUnique({
      where: { normalizedLowerCase: name },
    });

    return category;
  } catch {
    return null;
  }
};

export const getAllCategory = async () => {
  try {
    const category = await db.category.findMany({});
    return category;
  } catch (error) {
    console.error("Error fetching category", error);
    return null;
  }
};

export const getAllCategoryWithCount = async ({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
}) => {
  try {
    // const category = await db.category.findMany({
    //   where: {
    //     isDeleted: false,
    //   },
    // });

    const category = await db.category.aggregateRaw({
      pipeline: [
        {
          $match: {
            isDeleted: false,
          },
        },
        {
          $facet: {
            data: [
              // pagination optional
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
            total: [{ $count: "count" }],
          },
        },
      ],
    });

    return { counts: category };
  } catch (error) {
    console.error("Error fetching category", error);
    return null;
  }
};
