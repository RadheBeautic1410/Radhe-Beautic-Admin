# MongoDB Atlas Cost Investigation — Radhe Beautic

**Date:** 2026-10-14
**Scope:** Read-only investigation. No code, data, Atlas or Vercel settings were changed and no queries were run against production.
**Sources:** the four Next.js repositories, plus the Atlas UI (cluster overview, Query Insights for the last 24 h, Performance Advisor, Data Explorer index and collection stats, and the October invoice).

Tags used throughout:
- **[Verified]**: seen in code or in the Atlas UI.
- **[Likely]**: strong evidence, not measured.
- **[Hypothesis]**: needs production metrics.

> **Corrections found during implementation (2026-10-14)**
> 1. The **Reseller** app's Prisma schema has no `imageVector` (or name/description/customerPrice) on `Kurti`. Prisma only projects declared fields, so Reseller responses never carried the vector. Statements below that Reseller routes return `imageVector` are wrong; they apply to the **Admin** app only. The Reseller cost-field exposure (`actualPrice`, `prices.actualPrice1-3`, `party`) was real.
> 2. **Admin product search is already debounced** (400 ms) by its only caller: `useDebounce(searchValue, 400)` in `src/app/(protected)/catalogue/page.tsx:248`. It is *not* one request per keystroke. The remaining issue was server-side: all matches were loaded as full documents.

---

## A. Executive summary

1. **Cross-region transfer had not dropped as of Oct 12 [Verified].** Atlas billing by usage date shows 6–17 GB/day "Different Region" for Oct 1–12, about 10.3 GB/day on average. That is the same rate as September (329.9 GB ≈ 11 GB/day). The exact date of the Vercel switch is unknown, and billing lags 1–2 days.
   - If the switch was before Oct 11, another caller is still outside `ap-south-1`.
   - If it was Oct 13 or later, the effect isn't visible yet.
   - **The biggest unknown:** four separate Next.js apps (Admin, Reseller, Customer storefront, Other_Product) all use Prisma with `DATABASE_URL`. Only the admin repo has a `vercel.json`, and it contains no `regions` key. If only one Vercel project was moved, the others may still run in `iad1`.
2. **The heaviest queries are Prisma string filters that cannot use any index [Verified].** Prisma's MongoDB connector compiles `contains`, `startsWith`, `endsWith` and `mode: "insensitive"` into `$expr: { $regexMatch }`. These fetch and evaluate every candidate document. That covers four of the top seven shapes in the last 24 hours (about 5.9K executions). Performance Advisor has **no create-index recommendations**, which fits: no index can help these as written.
3. **The godown pages re-download the whole in-stock catalogue on every page change [Verified code, Likely transfer].** This is the top shape by total time: 927 executions/day, 141 ms average. `getPendingFloorMoves` and `getLocationStock` fetch every in-stock design with `sizes` and `images`, then slice 20 rows in memory.
4. **Several hot paths return full Kurti documents with no `select` [Verified].** These are `getByCategory` (Admin and Reseller, about 2.57K/day), the admin search API (about 1.02K/day, one request per keystroke, no limit), and the Reseller `getAll`. Full documents include `imageVector Float[]` and every other field, and some of these responses are sent straight on to the browser.
5. **Even with the region fixed, most of the bill is fixed cost [Verified from invoice].** The M10 is about $58/month for 3 nodes × 24 h at $0.027/h. Backup is about $0.50/day and growing (12.9 → 14.4 GB-days in two weeks).
   - Once all traffic is same-region ($0.01/GB), the $28 cross-region line becomes about $3.
   - After that, code-level transfer cuts save very little in dollars. They mainly free CPU, latency and headroom.

### Atlas evidence collected

| Item | Value |
|---|---|
| Cluster | M10, AWS Mumbai, MongoDB 8.0.34, 3-node replica set |
| Ops (6 h) | R 4.5/s, W 0.9/s |
| Connections (6 h) | ~161 |
| Network (6 h) | In 8.08 KB/s, **Out 122.24 KB/s** avg (≈ 10.5 GB/day), peak 1.21 MB/s |
| Slow queries | 26 queries > 1000 ms in the last hour (project overview) |
| Disk | 2.91 GB / 10 GB |
| Monthly totals | May $29.15, Jun $73.55, Jul $79.60, Aug $93.66, Sep $101.50, Oct (MTD) $44.06 |

Daily transfer by **usage date** (from the October invoice):

| Usage date | Different region (GB) | Same region (GB) | Internet (GB) | Backup (GB-days) |
|---|---|---|---|---|
| 09/30 | 8.62 | 9.67 | – | 12.98 |
| 10/01 | 9.69 | 9.78 | – | 13.00 |
| 10/02 | 14.51 | 10.19 | – | 13.07 |
| 10/03 | 6.64 | 9.72 | 0.33 | 13.06 |
| 10/04 | 6.87 | 9.72 | – | 13.02 |
| 10/05 | 7.03 | 9.96 | – | 13.22 |
| 10/06 | 5.69 | 9.99 | – | 13.49 |
| 10/07 | 8.38 | 9.43 | – | 13.69 |
| 10/08 | 17.17 | 9.51 | – | 14.21 |
| 10/09 | 15.92 | 9.49 | 0.59 | 14.44 |
| 10/10 | 11.77 | 9.54 | 0.29 | 14.46 |
| 10/11 | 9.74 | 9.55 | 0.13 | 14.37 |
| 10/12 | 8.14 (partial) | 5.52 (partial) | – | – |

Same-region transfer is flat at about 9.5 GB/day regardless of load. It is probably internal (replication or backup), but that is unverified, and it costs only about $3/month.

---

## B. Codebase architecture

| App (repo) | DB layer | Client | Deploy config |
|---|---|---|---|
| Admin (`RadheBeautic`) | Prisma 5.15, Mongo provider | `src/lib/db.ts`, module singleton | `vercel.json` (cron, function memory; **no `regions`**) |
| Reseller (`Radhe-Beautic-Reseller`) | Prisma 5.15 | `src/lib/db.ts`, same pattern | no `vercel.json` in repo |
| Customer storefront (`Radhe_Beautic_Customer`) | Prisma 6 (`mongodb` 7 also listed in `package.json`) | `lib/db.ts`, singleton | no `vercel.json` in repo |
| Other_Product (`Radhe_Beautic_Other_Product`) | Prisma 6 | `lib/db.ts`, singleton | no `vercel.json` in repo |
| Render server (`Radhe-Beutic-Server`) | **none**: only fetch/axios for images and barcodes | – | ruled out as a DB client |

- **Raw MongoDB calls:**
  - `aggregateRaw` in `src/data/fullSet.ts` and `src/data/category.ts`.
  - `$runCommandRaw` for vector search (`src/lib/kurtiVectorSearch.ts`) and bulk updates (`src/data/godown.ts:323`).
  - `findRaw` in `src/app/api/kurti/generate-vectors/route.ts`.
- **Database:** `test`, with 49 models in the admin schema.
- **Other databases on the cluster:** `ambrodary`, `blog`, `demo`, `devlopRadhey`. Their callers are unknown, and they may be further sources of cross-region traffic.

### Collection sizes (`test` database, Data Explorer)

| Collection | Docs | Data size | Avg doc | Indexes |
|---|---|---|---|---|
| Sell | 274K | 525.93 MB | **1.92 KB** | 7 |
| Kurti | 47K | 81.88 MB | 1.74 KB | 14 |
| StockAddition | 194K | 21.76 MB | 112 B | 4 |
| Prices | 53K | 8.33 MB | 156 B | 1 |
| StockMovement | 13K | 2.43 MB | 192 B | 3 |

`Sell` averages 1.92 KB per sale line, which is large. The likely reason is the embedded `kurti Json[]` snapshot.

---

## C. Expensive query audit

All counts are from Atlas Query Insights for the last 24 hours (verified by the since/until values in the URL). Paths are relative to the admin repo unless noted.

| # | Atlas shape (24h) | Code location | Problem | Proof level | Proposed fix |
|---|---|---|---|---|---|
| 1 | `isDeleted` + `countOfPiece>0`, sort `code`, 927 runs, 141 ms avg, **top total time**, ratio 12.67 | `src/data/godown.ts:136-152` `getPendingFloorMoves`; `src/data/godown.ts:216-223` `getLocationStock`; called from `/godown`, `/move-to-floor`, `/stock-location` | Unbounded fetch of all in-stock designs with `sizes` + full `images`, paginated in memory. `Kurti_isDeleted_countOfPiece_idx` has only 442 uses in 7 days, so the `$expr $gt` is probably not using it. | Code: verified. Bytes per call: unmeasured. | Move the pending-size filter into an `aggregateRaw` pipeline, project the first image only, and paginate with `$facet` (the same pattern `getFullSetKurtis` already uses). |
| 2 | `isDeleted` + `$or` of `$regexMatch` on code/name/category/description, 1.16K runs, ratio 45.8; variants up to 911 ms, ratio 52,985 | Customer repo `src/action/kurti-actions.ts:789-796, 950-957`; also admin `src/actions/reels.ts:120` | Four unindexable regexes per document. `getKurtisPaginated` also **restarts from offset 0 on every infinite-scroll page** (lines 1020-1042, up to 3,000 docs). | Verified | Use cursor-based paging (`lastUpdatedTime`/`_id`). Search via an Atlas Search text index, or an anchored uppercase prefix on `code`. |
| 3 | Category double `$regexMatch` (startsWith + endsWith, insensitive), **2.57K runs**, ratio 27 | Admin `src/data/kurti.ts:135-144`, `src/data/kurti.ts:213-222`; Reseller `src/data/kurti.ts:158, 249`; called by catalogue pages **and** admin `src/app/(protected)/catalogue/[kurti]/[code]/page.tsx:170` (whole category fetched just to build the variant switcher) | Case-insensitive equality written as a regex, so it can't use `category_isDeleted`. No `select`, so full documents incl. `imageVector`. | Verified | (a) `select` the card fields. (b) Variants via `parentCode` (indexed; `getKurtiVariants` already exists in the Customer app). (c) Normalize `category` casing so exact equality works. |
| 4 | `$toUpper(category) $in` + `isFullSet`, 1.17K runs, ratio 85 | `src/data/fullSet.ts:68-89`, called from `src/app/api/category/route.ts:111,179` | Computed for every category-list request; `$toUpper` defeats the index. Small output, so this is CPU, not transfer. | Verified | Cache the counts (e.g. `unstable_cache`, invalidated on stock writes), or normalize casing and match `category` directly. |
| 5 | `Sell` `sellTime` range, 51 runs, **952 ms avg**, ratio 1.00 | `src/data/sales-by-location.ts:98` `collectRows`, used by analytics | A ratio of 1.00 suggests the index is used, so the slowness is likely result size (long date ranges). `getOverview` runs it twice (current + previous period); `getAlerts` runs it plus `getStock`, which runs it again over 60 days. | Ratio: verified. Cause: likely. | Run `explain("executionStats")`. Avoid duplicate `collectRows` calls per request, and consider caching closed (past) days. |
| 6 | `isDeleted` + `$regexMatch(code)`, 1.02K runs, ratio 22 | `src/app/api/kurti/getall/route.ts:20-30`, via `src/hooks/useKurtieSearch.tsx:56` | **One request per keystroke, no debounce.** A search fetches *all* matches as full documents with no limit, then returns `...kurti` (incl. `imageVector`) to the browser. | Verified | Debounce, add `select`, push sort/paginate into the DB, and use an anchored uppercase prefix instead of `contains`. |
| 7 | `$regexMatch(code)` sort desc, limit 1, 198 runs, **ratio 22,718** | `src/app/api/kurti/generateCode/route.ts:16-28` | `startsWith` becomes `$regexMatch`, so a collection scan just to find the highest code. | Verified | Use a native `{code: {$regex: "^PREFIX"}}` via `aggregateRaw`/`findRaw` (an anchored, case-sensitive regex can use `Kurti_code_key`), or a counter document. Confirm with explain. |
| 8 | `category $in []` (Prisma renders `$or: []`), sort/skip/limit + count, 213 + 213 runs, ratio ~52M | Customer `getKurtisPaginated`, `whereClause.category = { in: [] }` at lines 979-981, 994-996 | Scans every non-deleted document and can never match. | Verified | Return early when the code list is empty. Trivial fix. |
| 9 | Kurti `$project` only, no filter, 51 runs | `src/data/sales-by-location.ts:155` | Loads all 47K Kurti docs (incl. deleted) on every `collectRows` call. | Verified | Fetch only the codes present in the sale rows (`code: { in: [...] }`). |

Other shapes seen:
- **Vector search:** 18 runs, 400 ms average (`src/lib/kurtiVectorSearch.ts`).
- **`StockAddition` `createdAt` range:** 31 runs, 173 ms average, ratio 1.00 (`src/data/business-analytics.ts:252, 291`).

**Verification for every row:** take one real parameter set from Query Insights and run `explain("executionStats")` on it, in a low-traffic window or against a restored snapshot. Compare `totalDocsExamined`, `nReturned`, `executionTimeMillis` and the winning plan before and after the fix.

---

## D. Data-transfer investigation

- **Measured:** the cluster summary shows about 122 KB/s average outbound (peak 1.21 MB/s), which is about 10.5 GB/day. That matches the daily cross-region volume, so nearly all primary egress is app reads that crossed regions. [Verified]
- **Largest likely transfer paths, by executions × payload:** #1 godown, #3 `getByCategory`, #6 admin search, #2 storefront search/paging. They can't be ranked by bytes without measurement. [Hypothesis]
- **`imageVector` share is unclear.** The 1.74 KB average implies most documents carry little or no vector; a 512-float vector alone would be about 4 KB. Its real contribution needs a `$bsonSize` sample. [Hypothesis]
- **Polling:**
  - Customer `components/cart-icon.tsx:34`: every 10 s, including hidden tabs.
  - Other_Product `components/site-header.tsx:40` and `components/cart-icon.tsx:34`: two 5-second timers.
  - Admin `src/components/auth/permissions-provider.tsx:140`: visible tabs only, so fine.
  - Payloads are small; the cost is mostly function invocations.
- **Security issues:**
  - Reseller `GET /api/kurti/getall` is listed as a public API route in Reseller `src/middleware.ts:14`. It returns **every non-deleted Kurti in full, including `actualPrice` (cost)**, without authentication. It doesn't appear among the top shapes, so it's probably not a big cost driver, but it is a data exposure.
  - The Atlas IP access list allows `0.0.0.0/0`.

**How to validate:**
- Add temporary response-size logging (JSON byte length) per route on Vercel, or read the Vercel function "bytes out" metrics.
- In Atlas Metrics → Network, compare bytes out against deploy and switchover times.
- For each shape, take one parameter sample and run `explain("executionStats")` on a secondary or in a non-peak window.

---

## E. Index audit

Live `Kurti` indexes (Data Explorer) match `prisma/schema.prisma` exactly, so none are managed outside the repo. Usage counters run since Oct 7, so about 7 days.

| Index | Size | Uses (7d) |
|---|---|---|
| `_id_` | 2.3 MB | 413,807 |
| `Kurti_category_isDeleted_idx` | 389 kB | 86,724 |
| `Kurti_isDeleted_idx` | 283 kB | 56,581 |
| `Kurti_code_isDeleted_idx` | 754 kB | 34,893 |
| `Kurti_code_key` (unique) | 627 kB | 22,606 |
| `Kurti_lastUpdatedTime_idx` | 803 kB | 20,941 |
| `Kurti_parentCode_idx` | 279 kB | 13,620 |
| `Kurti_category_idx` | 406 kB | 936 |
| `Kurti_isDeleted_countOfPiece_idx` | 467 kB | 442 |
| `Kurti_pricesId_idx` | 827 kB | 0 |
| `Kurti_party_idx` | 283 kB | 0 |
| `Kurti_countOfPiece_idx` | 430 kB | 0 |
| `Kurti_party_isDeleted_idx` | 393 kB | 0 |
| `Kurti_createdAt_idx` | 336 kB | 0 |

| Collection | Query pattern | Existing index | Issue | Recommendation |
|---|---|---|---|---|
| Kurti | `code` regex / insensitive | `Kurti_code_key`, `code_isDeleted` | `$regexMatch` can't use either | Change the query shape, not the indexes |
| Kurti | category insensitive | `category_isDeleted`, `category` | Regex bypasses it; `category` is a prefix-redundant duplicate | Normalize the data; `category` is a drop candidate |
| Kurti | `isDeleted` + `countOfPiece>0` | `isDeleted_countOfPiece` (442) | Barely used despite 927 runs/day | Explain #1 before changing anything |
| Kurti | – | `pricesId`, `party`, `countOfPiece`, `party_isDeleted`, `createdAt` (0 uses) | Write overhead only | Drop candidates *after* checking all 3 nodes over a full month (month-end reports may use them) |
| Kurti | `parentCode` | `parentCode` | OK | Use it for variants (#3b) |
| Sell | `sellTime` range | `sellTime`, `code_sellTime` (from schema; per-index usage **not checked**) | Ratio 1.00 suggests OK | Check `$indexStats` |

Performance Advisor flags 31 unused and 11 redundant indexes across the cluster; the detailed list was not expanded. **No new indexes are recommended**: the hot shapes need query rewrites first.

---

## F. Connection audit

- **Client reuse:** every app creates one `PrismaClient` per module instance. In production the `globalThis` assignment is skipped, but Node's module cache still reuses the client within a warm instance. There's no per-request client creation in app code. [Verified]
- **Scripts:** `prisma/*.js` seeders and `check-latest.cjs` create their own clients. These are one-off scripts, not jobs; the only cron is `/api/cron/reconcile-customer-payments` every 15 minutes (03:00–14:59 UTC).
- **Current counts:** 161 (6-hour view) to 198 connections. That's plausible for four apps × several warm instances × Prisma's default pool (2 × CPUs + 1) × 3 replica-set members with monitoring connections. **No leak evidence.**
- **Before setting a `connection_limit` in the URL**, compare Atlas Connections and "connections created/sec" against Vercel concurrent instances, and check whether spikes line up with deploys or cold starts.

---

## G. Cost-saving action plan

### High impact / low risk

| # | Action | Expected benefit | Evidence | Risk | Verify | Rollback |
|---|---|---|---|---|---|---|
| 1 | Check the function region of **every** Vercel project with a `DATABASE_URL`; identify the callers of the other databases on the cluster | Up to about $25/month (cross-region $0.086 → same-region $0.01) | ~10 GB/day still cross-region through Oct 12 | Low | Daily "Different Region" GB in the invoice drops toward zero | Switch the region back |
| 2 | Add `select` to the full-document reads (#3, #6, Reseller `getAll`) and use `parentCode` for variants | Smaller payloads, less browser JSON, faster pages | Query Insights #3 and #6; code | Low (check fields the UI uses) | Response bytes before and after | Revert the commit |
| 3 | Return early on an empty `in: []` in storefront paging (#8) | Removes 426 pointless collection scans/day | Ratio ~52M | Very low | Shape disappears from Query Insights | Revert |
| 4 | Debounce admin search and give it a DB-side limit (#6) | Fewer queries, much smaller responses | 1.02K runs/day, per keystroke | Low | Execution count and response bytes | Revert |
| 5 | Lock down Reseller `GET /api/kurti/getall` | Closes a cost-price data exposure | `middleware.ts:14` | Low (confirm nothing external calls it via Vercel logs) | 401 for anonymous requests | Revert |

### High impact / higher risk

| # | Action | Risk | Verify | Rollback |
|---|---|---|---|---|
| 6 | Rewrite the godown pagination as an aggregation pipeline (#1) | The in-memory logic has to match the server-side filter exactly | Compare totals and items old vs new on the same data | Revert |
| 7 | Normalize `category` casing with a one-time data migration, then switch to exact matches (#3, #4) | Touches stored data | Count per category before and after | Restore from snapshot |
| 8 | Move storefront search to an Atlas Search index, with cursor paging (#2) | On M10 it runs on the same nodes, so watch memory | Search relevance and latency | Revert the query and drop the search index |

### Medium / low impact

9. `generateCode` anchored native regex (#7); `collectRows` fetching only sold codes (#9, #5); caching full-set counts (#4); pausing cart polling in hidden tabs.
10. Backup: review the snapshot and PIT retention policy (14.4 GB stored for 2.9 GB of data, still growing). Lower retention only within your recovery requirements.

### Needs production metrics first

11. **Dropping the zero-use indexes.** Atlas lets you hide an index first, which makes this reversible.
12. **Tier.** M10 is the smallest dedicated tier. Flex would need ≤ 5 GB storage (currently 2.91 GB including other databases) and fit within its ops/s and connection caps. It also has feature differences (backup, Query Insights, Performance Advisor, possibly vector search). Check current Atlas Flex limits before considering it. **Keep the 3-node replica set.**
13. **Connection pool limits.** See section F.

---

## H. Measurement plan

- **Billing:** download the Invoice CSV (Billing → Invoices → Download CSV) and compare per-day "Different Region" and "Same Region" GB for 7–14 days after the switchover against the Oct 1–12 baseline (about 10.3 GB/day cross-region, about 9.6 GB/day same-region). Use Cost Explorer for month-over-month comparison.
- **Atlas metrics:** compare Network bytes in/out, Opcounters, Connections and Query Targeting over equal weekday windows.
- **Query Insights:** for each fixed shape, record executions, average time and Docs Examined:Returned for the same 24-hour weekday window before and after the fix.
- **Application:** log response bytes and DB time per route. Use Vercel function metrics for invocation counts and duration per project and region.

Baselines to record now: the Query Insights table in section C, the daily transfer table in section A, and the cluster summary (122 KB/s average out, ~161 connections, 26 slow queries/hour).

---

## I. Uncertainties

| Uncertainty | Evidence needed |
|---|---|
| Date and time the Vercel region change took effect | Vercel deployment timestamp |
| Function region of the Reseller, Customer and Other_Product projects | Vercel → each project → Settings → Functions |
| Callers of `ambrodary`, `blog`, `demo`, `devlopRadhey` | Atlas Database Access users per database; client IPs in Atlas mongod logs |
| What the flat ~9.6 GB/day same-region transfer is (replication, backup, or a Mumbai client) | Atlas support or the per-host network metrics; only about $3/month either way |
| Bytes per call for shapes #1, #2, #3, #6 | Response-size logging, or `explain` plus `$bsonSize` samples |
| `imageVector` share of document size | A `$bsonSize` sample on `Kurti` (needs approval since it queries production) |
| `Sell` index usage | `$indexStats` on `Sell` |
| Which indexes Performance Advisor lists as unused/redundant cluster-wide | Expand the Drop Indexes panel in Performance Advisor |

---

## Recommended fix order for review

1. Confirm all Vercel projects are in `bom1`, then re-check daily cross-region GB.
2. Lock down Reseller `GET /api/kurti/getall` (security).
3. Return early on an empty `in: []` in storefront paging.
4. Add `select` to `getByCategory` and the admin and Reseller full-document reads, and use `parentCode` for variants.
5. Debounce admin search and add a DB-side limit.
6. Rewrite the godown pagination as an aggregation pipeline.
7. Use an anchored native regex in `generateCode`; dedupe and narrow `collectRows`.
8. Normalize category casing (data migration), then exact-match queries.
9. Move storefront search to Atlas Search with cursor paging.
10. Review backup retention, then do the index cleanup (hide first) and the tier evaluation using the new metrics.
