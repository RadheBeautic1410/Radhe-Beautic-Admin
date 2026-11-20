/**
 * WhatsApp Cloud API template sender (server-only).
 *
 * Business-initiated messages outside the 24-hour customer-service window must be
 * approved template messages, so this module only exposes a template sender.
 * It never throws: a notification must not be able to fail the operation it reports on.
 *
 * The /api/whatsapp route stays the entry point for ad-hoc text/media sends from the UI;
 * this module is for server-side notifications that shouldn't round-trip through HTTP.
 */

import { db } from "@/src/lib/db";

const GRAPH_API_VERSION = "v20.0";

/** Context saved with the message log row, so webhook status updates can be traced to an order. */
export type WhatsAppLogContext = {
  kind?: string;
  orderRef?: string;
};

/** Record an accepted send. Best-effort: a logging failure must never fail the send. */
async function logOutgoing(args: {
  waMessageId?: string;
  to: string;
  templateName?: string;
  body?: string;
  log?: WhatsAppLogContext;
}) {
  if (!args.waMessageId) return;
  try {
    await db.whatsAppMessage.create({
      data: {
        waMessageId: args.waMessageId,
        direction: "OUT",
        phone: args.to.replace(/\D/g, ""),
        kind: args.log?.kind,
        orderRef: args.log?.orderRef,
        templateName: args.templateName,
        body: args.body,
        status: "accepted",
      },
    });
  } catch (error: any) {
    console.error("[WhatsApp] Failed to log message:", error?.message || error);
  }
}

export type WhatsAppSendResult = {
  success: boolean;
  messageId?: string;
  /** true when the send was intentionally skipped (missing config / phone) */
  skipped?: boolean;
  error?: string;
};

/**
 * Normalize to E.164. Bare 10-digit numbers are assumed Indian (+91),
 * matching how numbers are stored on User.phoneNumber / Address.phoneNumber.
 */
export function normalizePhoneNumber(raw?: string | null): string | null {
  if (!raw) return null;

  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let candidate: string;
  if (hasPlus) {
    candidate = `+${digits}`;
  } else if (digits.length === 10) {
    candidate = `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    candidate = `+${digits}`;
  } else if (digits.length === 11 && digits.startsWith("0")) {
    candidate = `+91${digits.slice(1)}`;
  } else {
    candidate = `+${digits}`;
  }

  return /^\+[1-9]\d{1,14}$/.test(candidate) ? candidate : null;
}

export type SendTemplateArgs = {
  to: string | null | undefined;
  templateName: string | null | undefined;
  languageCode?: string;
  /** Ordered values for the template body's {{1}}, {{2}}, ... placeholders */
  bodyParams?: Array<string | number>;
  log?: WhatsAppLogContext;
};

export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode,
  bodyParams = [],
  log,
}: SendTemplateArgs): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("[WhatsApp] Skipped: WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID not configured");
    return { success: false, skipped: true, error: "whatsapp_not_configured" };
  }

  if (!templateName) {
    console.warn("[WhatsApp] Skipped: no template name configured for this notification");
    return { success: false, skipped: true, error: "template_not_configured" };
  }

  const recipient = normalizePhoneNumber(to);
  if (!recipient) {
    console.warn("[WhatsApp] Skipped: recipient phone number missing or not valid E.164:", to);
    return { success: false, skipped: true, error: "invalid_phone_number" };
  }

  const template: Record<string, any> = {
    name: templateName,
    language: { code: languageCode || process.env.WHATSAPP_TEMPLATE_LANG || "en" },
  };

  if (bodyParams.length > 0) {
    template.components = [
      {
        type: "body",
        parameters: bodyParams.map((value) => ({ type: "text", text: String(value) })),
      },
    ];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "template",
          template,
        }),
      }
    );

    const result = await response.json().catch(() => null as any);

    if (!response.ok) {
      const message = result?.error?.message || `HTTP ${response.status}`;
      console.error("[WhatsApp] Template send failed:", {
        to: recipient,
        templateName,
        status: response.status,
        error: result?.error ?? result,
      });
      return { success: false, error: message };
    }

    const messageId = result?.messages?.[0]?.id;
    console.log("[WhatsApp] Template sent:", { to: recipient, templateName, messageId });
    await logOutgoing({ waMessageId: messageId, to: recipient, templateName, log });
    return { success: true, messageId };
  } catch (error: any) {
    console.error("[WhatsApp] Template send threw:", error?.message || error);
    return { success: false, error: error?.message || "whatsapp_request_failed" };
  }
}

/**
 * Free-form text message. Meta only delivers these inside the 24-hour window after the
 * customer last messaged us, so this is for replies (the webhook auto-reply), never for
 * business-initiated notifications.
 */
export async function sendWhatsAppText(
  to: string,
  body: string,
  log?: WhatsAppLogContext
): Promise<WhatsAppSendResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!accessToken || !phoneNumberId) {
    return { success: false, skipped: true, error: "whatsapp_not_configured" };
  }

  const recipient = normalizePhoneNumber(to);
  if (!recipient) return { success: false, skipped: true, error: "invalid_phone_number" };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipient,
          type: "text",
          text: { body },
        }),
      }
    );

    const result = await response.json().catch(() => null as any);
    if (!response.ok) {
      console.error("[WhatsApp] Text send failed:", { to: recipient, error: result?.error ?? result });
      return { success: false, error: result?.error?.message || `HTTP ${response.status}` };
    }

    const messageId = result?.messages?.[0]?.id;
    await logOutgoing({ waMessageId: messageId, to: recipient, body, log });
    return { success: true, messageId };
  } catch (error: any) {
    console.error("[WhatsApp] Text send threw:", error?.message || error);
    return { success: false, error: error?.message || "whatsapp_request_failed" };
  }
}
