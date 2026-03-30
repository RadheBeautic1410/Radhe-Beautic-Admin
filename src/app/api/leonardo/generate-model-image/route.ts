export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ref as ImgRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/src/lib/firebase/firebase";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const LEONARDO_ENDPOINT = "https://cloud.leonardo.ai/api/rest/v1/generations";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickFirstGeneratedImageUrl(generation: any): string | null {
  const candidates =
    generation?.generated_images ??
    generation?.generatedImages ??
    generation?.generated_images_urls ??
    [];

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const first = candidates[0] ?? {};
  return first?.url ?? first?.image_url ?? first?.imageUrl ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceImageUrl, category, prompt } = body ?? {};

    if (!sourceImageUrl || typeof sourceImageUrl !== "string") {
      return NextResponse.json(
        { success: false, error: "sourceImageUrl is required" },
        { status: 400 },
      );
    }

    const leonardoApiKey = process.env.LEONARDO_API_KEY;
    if (!leonardoApiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing LEONARDO_API_KEY in server environment",
        },
        { status: 500 },
      );
    }

    // Defaults are taken from Leonardo quick-start examples.
    // You can override via env if you want different model/styling.
    const modelId =
      process.env.LEONARDO_MODEL_ID || "7b592283-e8a7-4c5a-9ba6-d18c31f258b9";
    const styleUUID =
      process.env.LEONARDO_STYLE_UUID || "111dc692-d470-4eec-b791-3475abac4c46";

    const promptText =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt
        : [
            "Create a realistic e-commerce product photo.",
            "A young adult woman wearing the same kurti design as the reference image.",
            "Keep the kurti colors, pattern, and look consistent with the reference image.",
            "Neutral studio background, full body, sharp focus, natural fabric texture.",
            "No text, no watermark.",
            `Reference image URL: ${sourceImageUrl}`,
            category ? `Category: ${category}` : "",
          ]
            .filter(Boolean)
            .join(" ");

    // 1) Create generation
    const createRes = await fetch(LEONARDO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${leonardoApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        alchemy: false,
        height: 1080,
        width: 1920,
        modelId,
        prompt: promptText,
        num_images: 1,
        styleUUID,
        ultra: false,
        contrast: 3.5,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Leonardo create generation failed (${createRes.status})`,
          details: errText,
        },
        { status: 500 },
      );
    }

    const createJson = await createRes.json();
    console.log("createJson", createJson);
    const generationId = createJson?.generationId ?? createJson?.id;
    if (!generationId) {
      return NextResponse.json(
        { success: false, error: "Leonardo generationId missing" },
        { status: 500 },
      );
    }

    // 2) Poll for completion
    let generation: any = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await sleep(2000);
      const statusRes = await fetch(`${LEONARDO_ENDPOINT}/${generationId}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${leonardoApiKey}`,
        },
      });

      if (!statusRes.ok) {
        const errText = await statusRes.text().catch(() => "");
        // Keep retrying on transient errors.
        if (attempt < 10) continue;
        return NextResponse.json(
          {
            success: false,
            error: `Leonardo status check failed (${statusRes.status})`,
            details: errText,
          },
          { status: 500 },
        );
      }

      generation = await statusRes.json();
      const status = generation?.status;

      if (status === "COMPLETE") break;
      if (status === "FAILED") {
        return NextResponse.json(
          {
            success: false,
            error: "Leonardo generation failed",
            details: generation?.failureReason ?? generation,
          },
          { status: 500 },
        );
      }
    }

    if (generation?.status !== "COMPLETE") {
      return NextResponse.json(
        {
          success: false,
          error: "Leonardo generation timed out",
          status: generation?.status,
        },
        { status: 504 },
      );
    }

    // 3) Get generated image URL
    const leonardoImageUrl = pickFirstGeneratedImageUrl(generation);
    if (!leonardoImageUrl) {
      return NextResponse.json(
        { success: false, error: "Leonardo generated image URL missing" },
        { status: 500 },
      );
    }

    // 4) Download generated image
    const imageRes = await fetch(leonardoImageUrl);
    if (!imageRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to download generated image (${imageRes.status})`,
        },
        { status: 500 },
      );
    }

    const arrayBuffer = await imageRes.arrayBuffer();
    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";

    // 5) Upload to Firebase Storage
    const storagePath = `leonardo-model-images/${uuidv4()}.${ext}`;
    const storageRef = ImgRef(storage, storagePath);
    await uploadBytes(storageRef, Buffer.from(arrayBuffer));
    const firebaseUrl = await getDownloadURL(storageRef);

    return NextResponse.json({
      success: true,
      generatedImageUrl: firebaseUrl,
      storagePath,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal error" },
      { status: 500 },
    );
  }
}
