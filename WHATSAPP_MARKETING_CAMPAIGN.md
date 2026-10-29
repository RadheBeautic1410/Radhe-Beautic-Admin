# WhatsApp Marketing Campaign (Diwali 2026)

Bulk-send one approved WhatsApp marketing template to past customers (~17,000 numbers)
through our existing WhatsApp Cloud API setup.

- **Script:** [`scripts/whatsapp-campaign.mjs`](scripts/whatsapp-campaign.mjs)
- **Status:** script ready and dry-run tested; template submitted for approval; no real batch sent yet.
- **Started:** 2026-10-25 · Diwali is around 2026-11-08.

---

## Why a script and not the app

- 17k sends would time out inside a Next.js API request.
- Most customer numbers are **not in the database** (walk-in customers), so the list comes from an Excel file.
- Order notifications ([`src/lib/whatsapp.ts`](src/lib/whatsapp.ts)) and the admin relay
  ([`src/app/api/whatsapp/route.ts`](src/app/api/whatsapp/route.ts)) are untouched. The script calls the
  Graph API directly with the same `.env` credentials.

## WhatsApp / Meta rules that shape this

| Rule | What it means for us |
|---|---|
| Messages outside the 24h window must be **approved templates** | Only the Marketing-category template can be sent; no free text. |
| **Messaging limit tier** (250 → 1K → 10K → 100K unique users / 24h) | Send in daily batches with `--limit` under the current tier. Check the tier in WhatsApp Manager → Phone numbers. The tier goes up when we use it with good quality. |
| **Per-message pricing** (India marketing ≈ ₹0.8–0.9 per delivered message, plus GST) | Full list ≈ ₹14–15k. Confirm the current rate in Business Manager. |
| **Per-user marketing cap** across all businesses | Some numbers won't be delivered (error `131049`). We aren't charged for these. |
| **Quality rating** goes down when people block or report us | **This number also sends order notifications.** A restriction would stop those too. |

### Protecting the number
1. Send to the most recent / best customers first, in batches of 1–2k.
2. Check the quality rating in WhatsApp Manager between batches. Pause if it goes yellow.
3. The template has a **"Stop offers"** quick-reply button. Never message numbers that tap it again.
4. Long term, use a separate WhatsApp number for marketing.

## Template

- **Category:** Marketing. **No body variables** (we don't have customer names), so the script sends no body params.
- **Recommended structure:**
  - Image header with the Diwali creative (send it with `--image <public https url>`)
  - Bilingual body (English + Gujarati), opening with "Namaste 🙏" / "Hi there! 🪔", not "Hi... !"
  - "Visit website" button → `https://radhebeautic.com/`
  - Quick reply "Stop offers"
- Pass the language code exactly as approved (`en`, `en_US`, `gu`, …) with `--lang`.

## Preparing the number list

1. Put all numbers in one Excel column. **Format the column as Text** first, otherwise Excel writes
   `9.87654E+09` and those rows are rejected.
2. Save as CSV in `data/`, for example `data/diwali.csv`. `data/` is in `.gitignore`. **Customer numbers must never be committed.**
3. Names are not needed. Any cell that looks like an Indian mobile number is used
   (10 digits starting 6–9, with or without `+91`, `0`, spaces or dashes). Duplicates are removed.

## Running it

Run from the project root. Credentials come from `.env` (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`). Requires Node 20.12+.

```bash
# 1. Count valid / duplicate / invalid numbers. Sends nothing.
node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template <name> --lang en --dry-run

# 2. Test on our own phone (not logged).
node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template <name> --lang en --test 77788xxxxx

# 3. Send one day's batch (stay under the messaging tier). Re-run the same command next day.
node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template <name> --lang en --limit 1000

# 4. Progress report at any time. Sends nothing.
node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template <name> --report
```

| Option | Purpose |
|---|---|
| `--file` | CSV/TXT with numbers (required) |
| `--template` | Approved template name (required) |
| `--lang` | Template language code (default `en`) |
| `--image` | Public image URL, only if the template has an image header |
| `--limit` | Max sends this run |
| `--test` | Send only to this number |
| `--dry-run` | Parse and count only |
| `--report` | Summary from the log |
| `--concurrency` | Parallel requests (default 5) |

### How it behaves
- **Log:** every attempt is appended to `data/<file>.<template>.log.jsonl`. Re-running skips numbers already
  sent or permanently failed, so **nobody gets the message twice**. Delete the log only for a new campaign.
- **Retries:** rate-limit / server errors (`4`, `80007`, `130429`, `131056`, 5xx, network) are marked retryable
  and picked up on the next run.
- **Auto-stop:** stops the whole run on account / spam / policy errors (`190`, `368`, `131031`, `131048`, template
  errors) or after 20 failures in a row. Check WhatsApp Manager before running again.

## Tracking results

| Where | What it shows |
|---|---|
| Script output / `--report` | Sent (accepted by Meta), failed with reasons, retry pending, not attempted, sent per day (IST) |
| WhatsApp Manager → Manage templates → the template | Sent, **delivered, read, button clicks** (can be a few hours behind) |
| WhatsApp Manager → Insights | Conversations and cost |

"Sent" in the script means **accepted by Meta**, not delivered. Delivery for each number needs the webhook (below).

## Next steps (after Diwali)

- [ ] **Webhook** `/api/whatsapp/webhook`: record sent / delivered / read / failed for each message, and add numbers that tap "Stop offers" to an opt-out list automatically.
- [ ] **Campaigns in admin:** `Campaign`, `CampaignRecipient` and `MarketingOptOut` models; audience from Excel upload plus DB numbers (`Sell.customerPhone`, `SaleBatch.customerPhone`, `User.phoneNumber`); test send; throttled background sender; results page. Gated by a new permission.
- [ ] Collect customer names and opt-in at billing, so later campaigns can greet people by name and only message opted-in customers.

## Campaign log

| Date | Batch | Sent | Failed | Quality | Notes |
|---|---|---|---|---|---|
| 2026-10-25 | — | — | — | — | Script built, template submitted |
