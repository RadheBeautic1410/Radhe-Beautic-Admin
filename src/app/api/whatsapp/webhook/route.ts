/**
 * WhatsApp Cloud API webhook (public; Meta calls it, so it's listed in routes.js publicRoutes).
 *
 * GET  - Meta's one-time subscription handshake (hub.verify_token -> hub.challenge).
 * POST - Event delivery, authenticated by the X-Hub-Signature-256 HMAC of the raw body:
 *   - statuses[]: delivery updates for messages we sent. They move the WhatsAppMessage row
 *     along sent -> delivered -> read, or to failed with Meta's error code and reason.
 *   - messages[]: a customer wrote to the notifications number. Nobody reads that inbox, so
 *     the message is saved and the customer gets one auto-reply (at most once per 24 hours)
 *     pointing them to the help number.
 *
 * Env: WHATSAPP_WEBHOOK_VERIFY_TOKEN (any secret string, also typed into the Meta app),
 *      WHATSAPP_APP_SECRET (Meta app > App settings > Basic), WHATSAPP_AUTO_REPLY_TEXT (optional).
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { sendWhatsAppText } from "@/src/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_AUTO_REPLY =
  "Thank you for messaging Radhe Beautic. This number only sends order updates and replies here are not read. " +
  "For any help, please WhatsApp us on +91 96242 81353.";

const AUTO_REPLY_EVERY_MS = 24 * 60 * 60 * 1000;

/** Later delivery states never move back: a late "sent" must not overwrite "read". */
const STATUS_RANK: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, read: 3 };

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (
    expected &&
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === expected
  ) {
    return new NextResponse(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function hasValidSignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const given = header.slice("sha256=".length);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!hasValidSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    console.warn("[WhatsAppWebhook] Rejected: bad or missing signature (is WHATSAPP_APP_SECRET set?)");
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  // Always answer 200 once the event is authentic, otherwise Meta keeps re-sending it.
  try {
    const ourNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    for (const entry of payload?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (change?.field !== "messages" || !value) continue;
        if (ourNumberId && value.metadata?.phone_number_id !== ourNumberId) continue;

        for (const status of value.statuses ?? []) await handleStatus(status);
        for (const message of value.messages ?? []) await handleInbound(message, value.contacts);
      }
    }
  } catch (error: any) {
    console.error("[WhatsAppWebhook] Processing error:", error?.message || error);
  }

  return NextResponse.json({ received: true });
}

async function handleStatus(status: any) {
  const waMessageId: string | undefined = status?.id;
  const next: string | undefined = status?.status;
  if (!waMessageId || !next) return;

  const statusAt = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();
  const err = status.errors?.[0];
  const errorFields =
    next === "failed"
      ? {
          errorCode: typeof err?.code === "number" ? err.code : null,
          errorTitle: err?.title ?? err?.message ?? null,
          errorDetail: err?.error_data?.details ?? null,
        }
      : {};

  const existing = await db.whatsAppMessage.findUnique({
    where: { waMessageId },
    select: { id: true, status: true },
  });

  if (!existing) {
    // Sent from somewhere that doesn't log (campaign script, /api/whatsapp relay, WhatsApp Manager).
    await db.whatsAppMessage
      .create({
        data: {
          waMessageId,
          direction: "OUT",
          phone: String(status.recipient_id ?? ""),
          kind: "unlogged",
          status: next,
          statusAt,
          ...errorFields,
        },
      })
      .catch(() => {
        /* a concurrent event created it first; the next status update will land */
      });
    if (next === "failed") logFailure(waMessageId, status.recipient_id, err);
    return;
  }

  const isUpgrade =
    next === "failed" ||
    (existing.status !== "failed" && (STATUS_RANK[next] ?? 0) > (STATUS_RANK[existing.status] ?? 0));
  if (!isUpgrade) return;

  await db.whatsAppMessage.update({
    where: { id: existing.id },
    data: { status: next, statusAt, ...errorFields },
  });
  if (next === "failed") logFailure(waMessageId, status.recipient_id, err);
}

function logFailure(waMessageId: string, to: unknown, err: any) {
  console.warn("[WhatsAppWebhook] Message failed:", {
    waMessageId,
    to,
    code: err?.code,
    title: err?.title,
    details: err?.error_data?.details,
  });
}

function inboundText(message: any): string {
  switch (message?.type) {
    case "text":
      return message.text?.body ?? "";
    case "button":
      return message.button?.text ?? "";
    case "interactive":
      return (
        message.interactive?.button_reply?.title ??
        message.interactive?.list_reply?.title ??
        "[interactive]"
      );
    default:
      return `[${message?.type ?? "unknown"}]`;
  }
}

async function handleInbound(message: any, contacts: any[] | undefined) {
  const waMessageId: string | undefined = message?.id;
  const from: string | undefined = message?.from;
  if (!waMessageId || !from) return;

  const name = contacts?.find((c) => c?.wa_id === from)?.profile?.name;
  const text = inboundText(message);

  try {
    await db.whatsAppMessage.create({
      data: {
        waMessageId,
        direction: "IN",
        phone: from,
        kind: "inbound",
        body: name ? `${name}: ${text}` : text,
        status: "received",
        statusAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
      },
    });
  } catch {
    // Unique waMessageId: Meta re-delivered an event we already handled, so don't reply twice.
    return;
  }

  // Don't answer reactions or system notices, and reply at most once a day per customer.
  if (message.type === "reaction" || message.type === "system" || message.type === "unsupported") return;

  const recentReply = await db.whatsAppMessage.findFirst({
    where: {
      phone: from,
      direction: "OUT",
      kind: "autoReply",
      createdAt: { gte: new Date(Date.now() - AUTO_REPLY_EVERY_MS) },
    },
    select: { id: true },
  });
  if (recentReply) return;

  const replyText = (process.env.WHATSAPP_AUTO_REPLY_TEXT || "").trim() || DEFAULT_AUTO_REPLY;
  const result = await sendWhatsAppText(`+${from}`, replyText, { kind: "autoReply" });
  if (!result.success) {
    console.error("[WhatsAppWebhook] Auto-reply failed:", { to: from, error: result.error });
  }
}
