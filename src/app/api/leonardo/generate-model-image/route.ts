export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ref as ImgRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/src/lib/firebase/firebase";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

const LEONARDO_V1_GENERATIONS_ENDPOINT =
  "https://cloud.leonardo.ai/api/rest/v1/generations";
const LEONARDO_V2_GENERATIONS_ENDPOINT =
  "https://cloud.leonardo.ai/api/rest/v2/generations";
const LEONARDO_INIT_IMAGE_ENDPOINT =
  "https://cloud.leonardo.ai/api/rest/v1/init-image";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function safeLogFetchResponse(label: string, res: Response) {
  try {
    const contentType = res.headers.get("content-type") || "";
    const text = await res
      .clone()
      .text()
      .catch(() => "");

    // Keep logs short and readable (avoid dumping huge presigned fields / html pages).
    const truncated =
      text.length > 2000 ? `${text.slice(0, 2000)}...<truncated>` : text;

    let parsed: any = null;
    if (contentType.includes("application/json")) {
      parsed = await res
        .clone()
        .json()
        .catch(() => null);
    }

    const redact = (obj: any) => {
      try {
        if (!obj || typeof obj !== "object") return obj;
        const copy = JSON.parse(JSON.stringify(obj));
        const maybe = copy?.uploadInitImage;
        if (maybe?.fields && typeof maybe.fields === "string") {
          // Avoid logging huge presigned fields blob.
          maybe.fields = "<redacted>";
        }
        if (maybe?.fields && typeof maybe.fields === "object") {
          for (const k of Object.keys(maybe.fields)) {
            if (
              k.toLowerCase().includes("token") ||
              k.toLowerCase().includes("signature") ||
              k.toLowerCase().includes("policy")
            ) {
              maybe.fields[k] = "<redacted>";
            }
          }
        }
        return copy;
      } catch {
        return obj;
      }
    };

    console.log(`[leonardo] ${label}`, {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      contentType,
      bodyPreview: truncated,
      json: redact(parsed),
    });
  } catch (e: any) {
    console.log(`[leonardo] ${label} (log failed)`, e?.message || e);
  }
}

function extFromContentType(contentType: string | null): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpeg";
  // Default to jpeg since most references are JPG.
  return "jpeg";
}

function normalizePresignedFields(fields: any): Record<string, string> {
  if (!fields) return {};
  if (typeof fields === "string") {
    try {
      const parsed = JSON.parse(fields);
      return normalizePresignedFields(parsed);
    } catch {
      return {};
    }
  }
  if (typeof fields !== "object") return {};

  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    out[k] = String(v);
  }
  return out;
}

function unwrapLeonardoGeneration(payload: any): any {
  return (
    payload?.generations_by_pk ??
    payload?.generation_by_pk ??
    payload?.generationByPk ??
    payload?.generation ??
    payload?.data?.generation ??
    payload?.data ??
    payload?.sdGenerationJob ??
    payload
  );
}

function pickFirstGeneratedImageUrl(payload: any): string | null {
  const generation = unwrapLeonardoGeneration(payload);
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

    // Leonardo v2 Gemini model name (not modelId).
    const leonardoV2Model =
      process.env.LEONARDO_V2_MODEL || "gemini-2.5-flash-image";

    const styleUUID =
      process.env.LEONARDO_STYLE_UUID || "111dc692-d470-4eec-b791-3475abac4c46"; // "111dc692-d470-4eec-b791-3475abac4c46";

    const promptText =
      typeof prompt === "string" && prompt.trim().length > 0
        ? prompt
        : [
            "Use the reference image as the exact garment",
            "A realistic Indian woman model wearing the SAME kurti from the reference image.",
            "Keep exact color, pattern, embroidery, and fabric unchanged.",
            "Do not modify the kurti design.",
            "Full body model, natural pose, studio lighting, ecommerce photoshoot.",
            "Clean background, high detail, realistic fabric texture.",
            "No new design, no changes in clothes.",
          ]
            .filter(Boolean)
            .join(" ");

    // 1) Upload init image (reference image) to Leonardo
    // Leonardo ControlNet expects an `initImageId` from `/init-image` upload.
    const sourceRes = await fetch(sourceImageUrl);
    await safeLogFetchResponse("download reference image", sourceRes);
    if (!sourceRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to download reference image (${sourceRes.status})`,
        },
        { status: 400 },
      );
    }

    const sourceArrayBuffer = await sourceRes.arrayBuffer();
    const sourceContentType = sourceRes.headers.get("content-type");
    const initImageExt = extFromContentType(sourceContentType);

    const initImageRes = await fetch(LEONARDO_INIT_IMAGE_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${leonardoApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        extension: initImageExt,
      }),
    });
    await safeLogFetchResponse("init-image", initImageRes);

    if (!initImageRes.ok) {
      const errText = await initImageRes.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Leonardo init-image failed (${initImageRes.status})`,
          details: errText,
        },
        { status: 500 },
      );
    }

    const initImageJson = await initImageRes.json();
    const uploadInitImage = initImageJson?.uploadInitImage;

    const initImageId = uploadInitImage?.id;

    const uploadUrl = uploadInitImage?.url;

    const uploadFields = normalizePresignedFields(uploadInitImage?.fields);

    if (!initImageId || !uploadUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Leonardo initImage upload info missing",
          details: initImageJson,
        },
        { status: 500 },
      );
    }

    // Upload the binary to the presigned URL (multipart/form-data)
    const formData = new FormData();
    for (const [k, v] of Object.entries(uploadFields)) {
      formData.append(k, v);
    }

    // Most presigned POST targets use `file` field name. If your docs show a different field,
    // adjust this key accordingly.
    const fileBlob = new Blob([sourceArrayBuffer], {
      type: sourceContentType ?? `image/${initImageExt}`,
    });
    formData.append("file", fileBlob, `init.${initImageExt}`);

    const presignedUploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });
    await safeLogFetchResponse(
      "presigned init-image upload",
      presignedUploadRes,
    );

    // Presigned POST upload typically returns 204 No Content on success.
    if (!presignedUploadRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `Leonardo init-image upload failed (${presignedUploadRes.status})`,
        },
        { status: 500 },
      );
    }

    // 2) Create generation (v2 Gemini payload) using the uploaded initImageId
    const initImageType = process.env.LEONARDO_INIT_IMAGE_TYPE || "UPLOADED";
    const imageStrength = process.env.LEONARDO_IMAGE_REFERENCE_STRENGTH || "MID";
    const promptEnhance = process.env.LEONARDO_PROMPT_ENHANCE || "OFF";

    const createRes = await fetch(LEONARDO_V2_GENERATIONS_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${leonardoApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: leonardoV2Model,
        parameters: {
          width: 1024,
          height: 1024,
          prompt: promptText,
          quantity: 1,
          guidances: {
            image_reference: [
              {
                image: {
                  id: initImageId,
                  type: initImageType,
                },
                strength: imageStrength,
              },
            ],
          },
          style_ids: styleUUID ? [styleUUID] : [],
          prompt_enhance: promptEnhance,
        },
        public: false,
      }),
    });
    await safeLogFetchResponse("create generation", createRes);

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
    const generationId =
      createJson?.generationId ??
      createJson?.id ??
      createJson?.data?.id ??
      createJson?.data?.generationId ??
      createJson?.generation?.id ??
      createJson?.data?.generation?.id ??
      createJson?.sdGenerationJob?.generationId ??
      createJson?.sdGenerationJob?.id;

    if (!generationId) {
      return NextResponse.json(
        { success: false, error: "Leonardo generationId missing" },
        { status: 500 },
      );
    }

    // 3) Poll for completion (v2)
    let generationPayload: any = null;
    let generation: any = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await sleep(2000);
      const statusRes = await fetch(
        `${LEONARDO_V2_GENERATIONS_ENDPOINT}/${generationId}`,
        {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${leonardoApiKey}`,
        },
        },
      );
      if (attempt === 0 || attempt % 5 === 0) {
        await safeLogFetchResponse(`status poll attempt=${attempt}`, statusRes);
      }

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

      generationPayload = await statusRes.json();
      generation = unwrapLeonardoGeneration(generationPayload);
      const status = generation?.status;

      if (status === "COMPLETE") break;
      if (status === "FAILED") {
        return NextResponse.json(
          {
            success: false,
            error: "Leonardo generation failed",
            details:
              generation?.failureReason ??
              generation?.error ??
              generation?.message ??
              generation,
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
    const leonardoImageUrl = pickFirstGeneratedImageUrl(generationPayload);
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
