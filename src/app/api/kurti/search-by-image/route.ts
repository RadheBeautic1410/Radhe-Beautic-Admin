export const dynamic = 'force-dynamic';

import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return new NextResponse(JSON.stringify({ error: "Missing imageBase64 in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const serverUrl = (process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || "").trim();
    if (!serverUrl) {
      throw new Error("Server URL environment variable is not defined");
    }

    // Call the Render server to generate the embedding
    console.log("Calling Render server to generate image embedding...");
    const embeddingRes = await axios.post(`${serverUrl}/generate-embedding`, {
      imageBase64
    });

    if (!embeddingRes.data || !embeddingRes.data.success || !embeddingRes.data.embedding) {
      throw new Error("Failed to generate embedding from Render server");
    }

    const embedding = embeddingRes.data.embedding;

    // Query MongoDB Atlas Vector Search via Prisma raw query
    console.log("Querying MongoDB Atlas Vector Search...");
    
    // We use vector search on the Kurti collection
    // Note: The search index "kurti_image_vector_index" must be created in Atlas
    const result = await db.$runCommandRaw({
      aggregate: "Kurti",
      pipeline: [
        {
          $vectorSearch: {
            index: "vector_index",
            path: "imageVector",
            queryVector: embedding,
            numCandidates: 100,
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
        }
      ],
      cursor: {}
    });

    const rawList = (result as any).cursor?.firstBatch || [];
    const data = rawList.map((item: any) => {
      // Map MongoDB _id object to standard id string
      return {
        ...item,
        id: item._id && item._id.$oid ? item._id.$oid : item.id
      };
    });

    // Log the matched search results
    console.log(`Image search matched ${data.length} items:`);
    data.forEach((item: any, idx: number) => {
      console.log(`  [Match #${idx + 1}] Code: ${item.code}, Name: ${item.name}, Score: ${item.score}`);
    });

    return new NextResponse(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Search by image error:", error);
    return new NextResponse(
      JSON.stringify({ 
        error: error.message,
        hint: "Make sure you have created the MongoDB Atlas Vector Search index named 'kurti_image_vector_index' on your 'Kurti' collection."
      }), 
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
