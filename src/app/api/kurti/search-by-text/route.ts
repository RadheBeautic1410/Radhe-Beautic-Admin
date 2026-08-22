export const dynamic = 'force-dynamic';

import { NextResponse, NextRequest } from "next/server";
import axios from "axios";
import { searchKurtiByVector } from "@/src/lib/kurtiVectorSearch";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return new NextResponse(JSON.stringify({ error: "Missing text in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const serverUrl = (process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || "").trim();
    if (!serverUrl) {
      throw new Error("Server URL environment variable is not defined");
    }

    // Call the Render server to generate the text embedding (CLIP shares a
    // single embedding space between text and images, so this can be
    // searched against the same imageVector index)
    console.log("Calling Render server to generate text embedding...");
    const embeddingRes = await axios.post(`${serverUrl}/generate-embedding`, {
      text: text.trim()
    });

    if (!embeddingRes.data || !embeddingRes.data.success || !embeddingRes.data.embedding) {
      throw new Error("Failed to generate embedding from Render server");
    }

    const embedding = embeddingRes.data.embedding;

    console.log("Querying MongoDB Atlas Vector Search...");
    const data = await searchKurtiByVector(embedding);

    console.log(`Text search matched ${data.length} items for "${text}":`);
    data.forEach((item: any, idx: number) => {
      console.log(`  [Match #${idx + 1}] Code: ${item.code}, Name: ${item.name}, Score: ${item.score}`);
    });

    return new NextResponse(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Search by text error:", error);
    return new NextResponse(
      JSON.stringify({
        error: error.message,
        hint: "Make sure you have created the MongoDB Atlas Vector Search index named 'vector_index' on your 'Kurti' collection."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
