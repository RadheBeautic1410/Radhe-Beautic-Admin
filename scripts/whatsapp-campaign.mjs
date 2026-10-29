/**
 * Bulk WhatsApp marketing sender (one approved template, no body variables).
 *
 * Reads phone numbers from a CSV/TXT file (Excel -> Save As -> CSV). Any cell
 * that looks like an Indian mobile number is picked up; duplicates are removed.
 * Every attempt is appended to a JSONL log next to the input file, so re-running
 * the same command continues where it stopped and never messages a number twice.
 *
 * Usage:
 *   node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template diwali_offer --lang en --dry-run
 *   node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template diwali_offer --lang en --test 9876543210
 *   node scripts/whatsapp-campaign.mjs --file data/diwali.csv --template diwali_offer --lang en --limit 1000
 *
 * Options:
 *   --file       CSV/TXT with numbers (required)
 *   --template   approved Marketing template name (required)
 *   --lang       template language code exactly as approved (default: en)
 *   --image      public https URL for the template's image header (only if the template has one)
 *   --limit      max numbers to send in this run (stay under your daily messaging tier)
 *   --test       send only to this number, without logging
 *   --dry-run    parse and report counts, send nothing
 *   --report     summary of what has been sent so far (from the log)
 *   --concurrency parallel requests (default 5)
 */

import fs from "node:fs";
import path from "node:path";

const GRAPH_API_VERSION = "v20.0";

// Errors that mean "slow down / try again later" - the number stays eligible for the next run.
const RETRYABLE_CODES = new Set([4, 80007, 130429, 131016, 131056, 133016]);
// Errors that mean "stop the whole run now" - continuing would hurt the account.
const FATAL_CODES = new Set([190, 368, 131031, 131048, 132001, 132000, 132012, 100]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const name = key.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[name] = true;
    } else {
      args[name] = next;
      i++;
    }
  }
  return args;
}

/** Indian mobile only: +91 followed by 10 digits starting 6-9. */
function normalizeIndianMobile(raw) {
  let digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

function readNumbers(file) {
  const text = fs.readFileSync(file, "utf8");
  const valid = new Set();
  let invalid = 0;
  let duplicates = 0;

  for (const line of text.split(/\r?\n/)) {
    for (const cell of line.split(/[,;\t]/)) {
      // Excel may write 9.87654E+09 for unformatted number columns.
      if (/e\+/i.test(cell)) {
        invalid++;
        continue;
      }
      if (!/\d{5}/.test(cell.replace(/[\s\-()+]/g, ""))) continue; // not a phone-like cell
      const phone = normalizeIndianMobile(cell);
      if (!phone) invalid++;
      else if (valid.has(phone)) duplicates++;
      else valid.add(phone);
    }
  }
  return { numbers: [...valid], invalid, duplicates };
}

function readLog(logFile) {
  const done = new Set();
  if (!fs.existsSync(logFile)) return done;
  for (const line of fs.readFileSync(logFile, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (!entry.retryable) done.add(entry.phone);
    } catch {
      // ignore a half-written last line
    }
  }
  return done;
}

async function sendTemplate({ to, template, lang, image }) {
  const tpl = { name: template, language: { code: lang } };
  if (image) {
    tpl.components = [{ type: "header", parameters: [{ type: "image", image: { link: image } }] }];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: tpl,
        }),
      }
    );
    const result = await response.json().catch(() => null);
    if (response.ok && result?.messages?.[0]?.id) {
      return { ok: true, messageId: result.messages[0].id };
    }
    const code = result?.error?.code;
    return {
      ok: false,
      code,
      error: result?.error?.message || `HTTP ${response.status}`,
      retryable: response.status >= 500 || RETRYABLE_CODES.has(code),
      fatal: FATAL_CODES.has(code),
    };
  } catch (error) {
    return { ok: false, error: error?.message || String(error), retryable: true, fatal: false };
  }
}

/** Latest attempt per number wins, so a retried number is counted once. */
function printReport(logFile, totalNumbers) {
  if (!fs.existsSync(logFile)) {
    console.log(`No log yet (${logFile}). Nothing has been sent for this template.`);
    return;
  }
  const latest = new Map();
  const sentPerDay = new Map();
  for (const line of fs.readFileSync(logFile, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      latest.set(entry.phone, entry);
      if (entry.ok) {
        const day = new Date(entry.at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
        sentPerDay.set(day, (sentPerDay.get(day) || 0) + 1);
      }
    } catch {
      // ignore a half-written last line
    }
  }

  let sent = 0;
  let retryLater = 0;
  const failedByReason = new Map();
  for (const entry of latest.values()) {
    if (entry.ok) sent++;
    else if (entry.retryable) retryLater++;
    else {
      const reason = `[${entry.code ?? "-"}] ${entry.error}`;
      failedByReason.set(reason, (failedByReason.get(reason) || 0) + 1);
    }
  }
  const failed = [...failedByReason.values()].reduce((a, b) => a + b, 0);

  console.log(`Numbers in file      : ${totalNumbers}`);
  console.log(`Sent (accepted)      : ${sent}`);
  console.log(`Failed permanently   : ${failed}`);
  console.log(`Will retry next run  : ${retryLater}`);
  console.log(`Not attempted yet    : ${Math.max(0, totalNumbers - latest.size)}`);
  if (sentPerDay.size) {
    console.log(`\nSent per day (IST):`);
    for (const [day, count] of sentPerDay) console.log(`  ${day}  ${count}`);
  }
  if (failedByReason.size) {
    console.log(`\nFailure reasons:`);
    for (const [reason, count] of failedByReason) console.log(`  ${count}  ${reason}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.file || !args.template) {
    console.error("Required: --file <csv> --template <name>. See the header of this script for usage.");
    process.exit(1);
  }

  try {
    process.loadEnvFile(path.resolve(".env"));
  } catch {
    // env may already be set in the shell
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    console.error("WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID missing in .env");
    process.exit(1);
  }

  const lang = typeof args.lang === "string" ? args.lang : "en";
  const image = typeof args.image === "string" ? args.image : undefined;

  if (args.test) {
    const to = normalizeIndianMobile(args.test);
    if (!to) throw new Error(`Invalid test number: ${args.test}`);
    const res = await sendTemplate({ to, template: args.template, lang, image });
    console.log(res.ok ? `Test sent to ${to} (${res.messageId})` : `Test failed: [${res.code}] ${res.error}`);
    return;
  }

  const { numbers, invalid, duplicates } = readNumbers(args.file);
  const logFile = args.file.replace(/\.[^.]+$/, "") + `.${args.template}.log.jsonl`;

  if (args.report) {
    printReport(logFile, numbers.length);
    return;
  }
  const done = readLog(logFile);
  const pending = numbers.filter((n) => !done.has(n));
  const limit = args.limit ? Number(args.limit) : pending.length;
  const batch = pending.slice(0, limit);

  console.log(`Valid unique numbers : ${numbers.length}`);
  console.log(`Duplicates removed   : ${duplicates}`);
  console.log(`Invalid / skipped    : ${invalid}`);
  console.log(`Already done (log)   : ${numbers.length - pending.length}`);
  console.log(`Pending              : ${pending.length}`);
  console.log(`This run will send   : ${batch.length}`);
  if (args["dry-run"]) return;

  const log = fs.createWriteStream(logFile, { flags: "a" });
  const concurrency = Math.max(1, Number(args.concurrency) || 5);
  let index = 0;
  let sent = 0;
  let failed = 0;
  let consecutiveFailures = 0;
  let stopReason = null;

  async function worker() {
    while (!stopReason && index < batch.length) {
      const to = batch[index++];
      const res = await sendTemplate({ to, template: args.template, lang, image });
      log.write(
        JSON.stringify({
          phone: to,
          ok: res.ok,
          messageId: res.messageId,
          code: res.code,
          error: res.error,
          retryable: !res.ok && res.retryable,
          at: new Date().toISOString(),
        }) + "\n"
      );

      if (res.ok) {
        sent++;
        consecutiveFailures = 0;
      } else {
        failed++;
        consecutiveFailures++;
        console.warn(`Failed ${to}: [${res.code ?? "-"}] ${res.error}`);
        if (res.fatal) stopReason = `fatal error ${res.code}: ${res.error}`;
        else if (consecutiveFailures >= 20) stopReason = "20 failures in a row";
      }

      if ((sent + failed) % 100 === 0) console.log(`Progress: ${sent + failed}/${batch.length} (sent ${sent}, failed ${failed})`);
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));
  log.end();

  console.log(`\nDone. Sent ${sent}, failed ${failed}. Log: ${logFile}`);
  if (stopReason) console.error(`STOPPED EARLY: ${stopReason}. Check WhatsApp Manager before re-running.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
