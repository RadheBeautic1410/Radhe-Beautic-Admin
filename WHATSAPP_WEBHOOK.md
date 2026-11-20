# WhatsApp Webhook (delivery status + auto-reply)

Order notifications go out from the WhatsApp Cloud API number **+91 70961 40398**. Meta only
says "accepted" when we send; whether the message was actually delivered arrives later on a
webhook. This feature receives that webhook so every message has a status, and answers
customers who write to the notifications-only number.

## What it does

- **Message log** – every template/text the admin app or the customer app sends is saved in the
  `WhatsAppMessage` collection (`direction: OUT`, `status: accepted`, `kind`, `orderRef`).
  Written by `sendWhatsAppTemplate` / `sendWhatsAppText` in `src/lib/whatsapp.ts` (admin) and
  `lib/whatsapp.ts` (customer).
- **Delivery status** – `POST /api/whatsapp/webhook` moves the row to `sent → delivered → read`
  (never backwards), or to `failed` with Meta's `errorCode`, `errorTitle` and `errorDetail`.
  Messages sent from places that don't log (campaign script, WhatsApp Manager) are created
  with `kind: "unlogged"`.
- **Incoming messages** – saved as `direction: IN`, `kind: inbound` (body prefixed with the
  customer's WhatsApp name). The customer gets one auto-reply per 24 hours pointing them to
  the help number +91 96242 81353. Meta retries of the same event never reply twice.

`kind` values: `orderPlaced`, `paymentConfirmed`, `orderShipped`,
`reseller:paymentConfirmed`, `reseller:orderShipped`, `autoReply`, `inbound`, `unlogged`.

## Useful failure codes

| Code | Meaning |
|---|---|
| 131026 | Undeliverable – number not on WhatsApp, old WhatsApp version, or customer hasn't accepted terms |
| 131049 | Meta held back a marketing message to keep engagement healthy (per-user marketing limit) |
| 131047 | Free-form text sent outside the 24-hour window |
| 131050 | Customer stopped marketing messages from us |
| 130472 | Number is part of a Meta experiment (marketing) |
| 131042 | Payment issue on the Meta account |

## Environment (admin app, Vercel)

| Var | Value |
|---|---|
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Any long random string; the same value is typed into the Meta app |
| `WHATSAPP_APP_SECRET` | Meta app → App settings → Basic → App secret |
| `WHATSAPP_AUTO_REPLY_TEXT` | Optional; overrides the default auto-reply |

Without `WHATSAPP_APP_SECRET` every POST is rejected with 401 (by design).

## One-time setup

1. `npx prisma db push` (adds the `WhatsAppMessage` collection and its unique `waMessageId` index;
   the index is what stops duplicate auto-replies).
2. Deploy the admin app with the env vars above.
3. developers.facebook.com → the app → WhatsApp → Configuration → Webhook:
   Callback URL `https://<admin domain>/api/whatsapp/webhook`, Verify token = the env value →
   Verify and save → subscribe to the **messages** field.
4. Confirm the WABA is subscribed to the app:
   `POST https://graph.facebook.com/v20.0/2989919091357461/subscribed_apps` with the system user token.

## Files

- `src/app/api/whatsapp/webhook/route.ts` – handshake, signature check, status + inbound handling
- `src/app/api/whatsapp/webhook/__tests__/route.test.ts` – tests
- `src/lib/whatsapp.ts` – logging + `sendWhatsAppText`
- `routes.js` – webhook path is public (Meta calls it; HMAC protects it)
- `prisma/schema.prisma` – `WhatsAppMessage` (same model in the customer app's schema)
