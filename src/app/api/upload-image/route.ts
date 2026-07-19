import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { storage } from "@/src/lib/firebase/firebase";
import { ref as ImgRef, uploadBytes, getDownloadURL } from "firebase/storage";

export const maxDuration = 60; // Allow enough time for processing larger images

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // 1. Read file into a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 2. Process image with Sharp
    // - Resize to max 1200px width/height while maintaining aspect ratio, without enlarging smaller images
    // - Convert to WebP format with quality 80
    const webpBuffer = await sharp(inputBuffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    // 3. Upload the optimized WebP buffer to Firebase Storage
    const storagePath = `images/${uuidv4()}.webp`;
    const storageRef = ImgRef(storage, storagePath);
    
    const metadata = {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    };

    await uploadBytes(storageRef, webpBuffer, metadata);

    // 4. Retrieve the download URL
    const downloadURL = await getDownloadURL(storageRef);

    return NextResponse.json({
      url: downloadURL,
      path: storagePath,
      sizeBefore: file.size,
      sizeAfter: webpBuffer.length,
      compressionRatio: ((1 - webpBuffer.length / file.size) * 100).toFixed(1) + "%",
    });
  } catch (error) {
    console.error("[Upload API] Error processing image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process image" },
      { status: 500 }
    );
  }
}
