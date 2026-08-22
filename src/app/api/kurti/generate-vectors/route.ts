export const dynamic = 'force-dynamic';

import { db } from "@/src/lib/db";
import { NextResponse, NextRequest } from "next/server";
import axios from "axios";
import { CURRENT_EMBEDDING_VERSION } from "@/src/lib/embeddingVersion";

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10");

    // Find active, in-stock Kurtis whose imageVector wasn't produced by the
    // current embedding pipeline yet (missing entirely, or stamped with an
    // older CURRENT_EMBEDDING_VERSION). This makes the migration resumable:
    // calling it repeatedly only ever processes what's left, so switching
    // embedding models/preprocessing just means bumping the version string.
    const rawKurtis = (await db.kurti.findRaw({
      filter: {
        isDeleted: false,
        countOfPiece: { $gt: 0 },
        imageVectorVersion: { $ne: CURRENT_EMBEDDING_VERSION }
      },
      options: {
        limit: limit
      }
    })) as unknown as any[];

    if (rawKurtis.length === 0) {
      return new NextResponse(JSON.stringify({ success: true, message: "All active, in-stock kurtis are already on the current embedding version!" }), { status: 200 });
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
            data: { imageVector: res.data.embedding, imageVectorVersion: CURRENT_EMBEDDING_VERSION }
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
