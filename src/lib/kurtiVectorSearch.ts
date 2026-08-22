import { db } from "@/src/lib/db";

// Atlas normalizes vectorSearchScore to a 0-1 range (higher = closer match)
// regardless of the index's underlying similarity function, so a single
// threshold works no matter which metric the index uses. Tune via
// IMAGE_SEARCH_MIN_SCORE once enough real query scores have been logged.
const MIN_SCORE = parseFloat(process.env.IMAGE_SEARCH_MIN_SCORE || "0.6");

export async function searchKurtiByVector(embedding: number[]) {
  // Note: The search index "vector_index" must be created in Atlas on the
  // Kurti collection's imageVector field.
  const result = await db.$runCommandRaw({
    aggregate: "Kurti",
    pipeline: [
      {
        $vectorSearch: {
          index: "vector_index",
          path: "imageVector",
          queryVector: embedding,
          numCandidates: 300,
          limit: 12
        }
      },
      {
        $match: {
          isDeleted: false
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          code: 1,
          images: 1,
          sellingPrice: 1,
          actualPrice: 1,
          customerPrice: 1,
          category: 1,
          score: { $meta: "vectorSearchScore" }
        }
      },
      {
        $match: {
          score: { $gte: MIN_SCORE }
        }
      }
    ],
    cursor: {}
  });

  const rawList = (result as any).cursor?.firstBatch || [];
  return rawList.map((item: any) => ({
    ...item,
    id: item._id && item._id.$oid ? item._id.$oid : item.id
  }));
}
