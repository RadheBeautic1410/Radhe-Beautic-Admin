export const dynamic = 'force-dynamic';

import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";
import axios from "axios";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");
    const force = request.nextUrl.searchParams.get("force") === "true";

    // By default, only find Kurtis missing an imageVector. With force=true,
    // re-embed everything (used after changing the embedding preprocessing
    // pipeline, so old and new vectors stay comparable).
    const rawKurtis = (await db.kurti.findRaw({
      filter: {
        isDeleted: false,
        countOfPiece: { $gt: 0 },
        ...(force
          ? {}
          : {
              $or: [
                { imageVector: { $exists: false } },
                { imageVector: { $size: 0 } }
              ]
            })
      },
      options: {
        limit: limit
      }
    })) as unknown as any[];

    if (rawKurtis.length === 0) {
      return new NextResponse(JSON.stringify({ success: true, message: "All kurtis already have vector embeddings generated!" }), { status: 200 });
    }

    const serverUrl = (process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || "").trim();
    if (!serverUrl) {
      throw new Error("Server URL environment variable is not defined");
    }

    let successCount = 0;
    let failCount = 0;

    for (const kurti of rawKurtis) {
      const imagesList = kurti.images as any[];
      if (!imagesList || imagesList.length === 0 || !imagesList[0].url) {
        failCount++;
        continue;
      }

      const imageUrl = imagesList[0].url;
      try {
        console.log(`Generating vector for code ${kurti.code}...`);
        const res = await axios.post(`${serverUrl}/generate-embedding`, {
          imageUrl
        });

        if (res.data && res.data.success && res.data.embedding) {
          const kurtiId = kurti._id && kurti._id.$oid ? kurti._id.$oid : kurti.id;
          await db.kurti.update({
            where: { id: kurtiId },
            data: { imageVector: res.data.embedding }
          });
          successCount++;
        } else {
          failCount++;
        }
      } catch (err: any) {
        console.error(`Failed to generate vector for ${kurti.code}:`, err.message);
        failCount++;
      }
    }

    return new NextResponse(JSON.stringify({ 
      success: true, 
      processed: rawKurtis.length,
      successCount,
      failCount,
      message: `Successfully processed ${successCount} kurtis. Failed ${failCount} kurtis.`
    }), { status: 200 });
  } catch (error: any) {
    console.error("Vector generation migration error:", error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
