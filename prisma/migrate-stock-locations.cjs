// Resets every Kurti.sizes row for the physical stock count (see src/lib/godown.ts):
// writes floor1Quantity / floor2Quantity / shop316Quantity = 0 and drops the keys
// left by earlier versions (godownQuantity, showroomQuantity). Every piece then
// reads as godown stock until the team scans it onto a floor or into shop 316.
//
// The app already treats missing keys as 0, so this is a cleanup, not a
// requirement. Run it BEFORE the count starts - it would wipe counted pieces.
//
//   node --env-file=.env prisma/migrate-stock-locations.cjs           (dry run)
//   node --env-file=.env prisma/migrate-stock-locations.cjs --apply   (writes)

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const COUNTED_KEYS = ["floor1Quantity", "floor2Quantity", "shop316Quantity"];
const OLD_KEYS = ["godownQuantity", "showroomQuantity"];

const toInt = (v) => {
  const n = parseInt(String(v ?? 0), 10);
  return Number.isFinite(n) ? n : 0;
};

const needsReset = (s) =>
  s && (OLD_KEYS.some((k) => k in s) || COUNTED_KEYS.some((k) => toInt(s[k]) !== 0 || !(k in s)));

const reset = (s) => {
  if (!s) return s;
  const row = { ...s };
  for (const k of OLD_KEYS) delete row[k];
  for (const k of COUNTED_KEYS) row[k] = 0;
  return row;
};

async function main() {
  const kurtis = await prisma.kurti.findMany({ select: { id: true, sizes: true } });
  let changed = 0;
  let counted = 0;
  let pieces = 0;

  for (const k of kurtis) {
    const sizes = k.sizes || [];
    pieces += sizes.reduce((sum, s) => sum + Math.max(0, toInt(s?.quantity)), 0);
    counted += sizes.reduce(
      (sum, s) => sum + COUNTED_KEYS.reduce((a, key) => a + Math.max(0, toInt(s?.[key])), 0),
      0
    );
    if (!sizes.some(needsReset)) continue;
    changed++;
    if (APPLY) {
      await prisma.kurti.update({ where: { id: k.id }, data: { sizes: sizes.map(reset) } });
    }
  }

  console.log(`${kurtis.length} kurtis scanned, ${pieces} pieces in total`);
  console.log(`${changed} kurtis ${APPLY ? "reset" : "would be reset"}`);
  if (counted > 0) {
    console.log(`WARNING: ${counted} pieces are already counted onto a floor / shop 316 and would go back to the godown`);
  }
  if (!APPLY) console.log("Dry run - nothing written. Re-run with --apply to write.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
