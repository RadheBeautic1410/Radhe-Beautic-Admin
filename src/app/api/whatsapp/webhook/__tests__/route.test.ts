import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rows = new Map<string, any>();

vi.mock("@/src/lib/db", () => ({
  db: {
    whatsAppMessage: {
      findUnique: vi.fn(async ({ where }: any) => rows.get(where.waMessageId) ?? null),
      findFirst: vi.fn(async ({ where }: any) =>
        [...rows.values()].find(
          (r) => r.phone === where.phone && r.direction === where.direction && r.kind === where.kind
        ) ?? null
      ),
      create: vi.fn(async ({ data }: any) => {
        if (rows.has(data.waMessageId)) throw new Error("P2002 unique");
        const row = { id: data.waMessageId, createdAt: new Date(), ...data };
        rows.set(data.waMessageId, row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = [...rows.values()].find((r) => r.id === where.id);
        Object.assign(row, data);
        return row;
      }),
    },
  },
}));

const sendText = vi.fn(async (to: string, _body: string, log?: any) => {
  rows.set(`reply-${to}`, { id: `reply-${to}`, waMessageId: `reply-${to}`, direction: "OUT", phone: to.replace("+", ""), kind: log?.kind });
  return { success: true, messageId: `reply-${to}` };
});
vi.mock("@/src/lib/whatsapp", () => ({ sendWhatsAppText: (...a: any[]) => sendText(...(a as [string, string, any])) }));

const SECRET = "test-secret";
const NUMBER_ID = "111";

function signedPost(payload: unknown, secret = SECRET) {
  const body = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return new NextRequest("https://x/api/whatsapp/webhook", {
    method: "POST",
    body,
    headers: { "x-hub-signature-256": `sha256=${sig}`, "content-type": "application/json" },
  });
}

const event = (value: any) => ({
  entry: [{ changes: [{ field: "messages", value: { metadata: { phone_number_id: NUMBER_ID }, ...value } }] }],
});

describe("WhatsApp webhook", async () => {
  const { GET, POST } = await import("../route");

  beforeEach(() => {
    rows.clear();
    sendText.mockClear();
    process.env.WHATSAPP_APP_SECRET = SECRET;
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "verify-me";
    process.env.WHATSAPP_PHONE_NUMBER_ID = NUMBER_ID;
  });

  it("answers Meta's handshake only with the right verify token", async () => {
    const ok = await GET(new NextRequest("https://x/?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("42");

    const bad = await GET(new NextRequest("https://x/?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42"));
    expect(bad.status).toBe(403);
  });

  it("rejects a POST with a wrong signature", async () => {
    const res = await POST(signedPost(event({}), "wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("records failure reasons and never downgrades a delivery status", async () => {
    rows.set("m1", { id: "m1", waMessageId: "m1", status: "accepted", direction: "OUT", phone: "919999999999" });
    rows.set("m2", { id: "m2", waMessageId: "m2", status: "accepted", direction: "OUT", phone: "918888888888" });

    await POST(signedPost(event({ statuses: [{ id: "m1", status: "read", timestamp: "1700000000" }] })));
    await POST(signedPost(event({ statuses: [{ id: "m1", status: "delivered", timestamp: "1700000001" }] })));
    expect(rows.get("m1").status).toBe("read");

    await POST(
      signedPost(
        event({
          statuses: [
            {
              id: "m2",
              status: "failed",
              errors: [{ code: 131026, title: "Message undeliverable", error_data: { details: "Not on WhatsApp" } }],
            },
          ],
        })
      )
    );
    expect(rows.get("m2")).toMatchObject({ status: "failed", errorCode: 131026, errorDetail: "Not on WhatsApp" });
  });

  it("saves an incoming message and auto-replies once, even if Meta re-delivers", async () => {
    const inbound = event({
      contacts: [{ wa_id: "917777777777", profile: { name: "Asha" } }],
      messages: [{ id: "in1", from: "917777777777", type: "text", text: { body: "Where is my order?" } }],
    });

    await POST(signedPost(inbound));
    await POST(signedPost(inbound)); // retry of the same event
    expect(rows.get("in1")).toMatchObject({ direction: "IN", body: "Asha: Where is my order?" });
    expect(sendText).toHaveBeenCalledTimes(1);

    // A second, new message the same day gets no second auto-reply.
    await POST(signedPost(event({ messages: [{ id: "in2", from: "917777777777", type: "text", text: { body: "Hello?" } }] })));
    expect(sendText).toHaveBeenCalledTimes(1);
  });
});
