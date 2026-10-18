# MongoDB Query Optimization & API Usage Audit — Radhe Beautic

**Date:** 2026-10-14
**Follows:** [MONGODB_ATLAS_COST_INVESTIGATION.md](MONGODB_ATLAS_COST_INVESTIGATION.md)
**Mode:** Read-only. No application code, data, Atlas or Vercel settings were changed and no queries were run against production. The only Atlas activity was reading Query Insights, Performance Advisor and Data Explorer index/collection metadata.

The Vercel Function Region move to `bom1` is treated as done. Its effect still has to be measured from post-deployment billing (section 7).

> **Corrections found during implementation (2026-10-14)**
> 1. The **Reseller** app's Prisma schema has no `imageVector` (or name/description/customerPrice) on `Kurti`. Prisma only projects declared fields, so Reseller responses never carried the vector. Statements below that Reseller routes return `imageVector` are wrong; they apply to the **Admin** app only. The Reseller cost-field exposure (`actualPrice`, `prices.actualPrice1-3`, `party`) was real.
> 2. **Admin product search is already debounced** (400 ms) by its only caller: `useDebounce(searchValue, 400)` in `src/app/(protected)/catalogue/page.tsx:248`. It is *not* one request per keystroke. The remaining issue was server-side: all matches were loaded as full documents.

**Labels used**

| Label | Meaning |
|---|---|
| **Verified issue** | Proven by code and/or Atlas metadata |
| **Strongly suspected** | Code plus frequency evidence; bytes or impact not measured |
| **Optimization opportunity** | Improvement with no evidence of current harm |
| **Requires production measurement** | Cannot be decided from code alone |

**Evidence sources**
1. Static inventory of **860 Prisma call sites (515 reads)** across four repositories, built with a TypeScript-AST scanner (model, method, `select`/`include`/`take`, regex-type filters, enclosing function, loop nesting).
2. Atlas Query Insights, last 24 h (33 top shapes by total time).
3. Live index metadata and usage counters (since 2026-10-07, about 7 days).
4. Git history of the Reseller repo.

---

## 1. Executive summary

| # | Finding | Label | Confidence |
|---|---|---|---|
| 1 | **Reseller `GET /api/kurti/migrate` runs `kurti.updateMany()` with no filter.** It sets `reservedSizes: []` and bumps `lastUpdatedTime` on all ~47K Kurti documents. Any logged-in Reseller user can trigger it; middleware only checks login. It would wipe every reservation, and the 47K writes replicate to both secondaries. | Verified issue (security / data integrity) | High |
| 2 | **Reseller `GET /api/kurti/getall` has no caller anywhere in the workspace.** The last caller was removed in commit `18e7ee3` (2025-08-24) and replaced by `/api/kurti/search`. It is still listed as a public API route and returns every non-deleted Kurti in full, **including `actualPrice` (the cost used for profit) and `imageVector`**, to anonymous users. | Verified issue (exposure); unused in code; runtime use unverified | High |
| 3 | **Other public Reseller routes also leak cost fields.** `getByCategory`, `getByCategoryWithPages` and `search` return full Kurti documents (incl. `actualPrice`); public `/api/category` returns category `actualPrice`. `getkurtiList` sends `prices.actualPrice1-3` to resellers. | Verified issue (exposure) | High |
| 4 | **Storefront product listing is the highest-frequency Kurti path**, about 10K executions/day summed across the `category $or[$eq…]` shapes. `getKurtisPaginated` **re-reads from offset 0 on every infinite-scroll page**, 100–200 documents per batch, up to 3,000. It uses the `category_isDeleted` index (ratio 4–9), so the cost is payload and repetition, not scanning. | Strongly suspected main read-transfer driver | Medium (bytes unmeasured) |
| 5 | **Prisma `contains`/`startsWith`/`endsWith`/`mode:"insensitive"` compile to `$expr.$regexMatch`, which no index can serve.** About 5.9K executions/day across the top shapes, with ratios up to 22,718 (`generateCode`) and ~52M (empty `in: []`). | Verified issue | High |
| 6 | **Godown pages fetch every in-stock design and paginate in memory.** 927 runs/day, 141 ms average, the highest total execution time of any shape. | Verified issue | High |
| 7 | **Sales report pages load the entire offline/online sales history, with full Kurti documents, on every request**, only to compute `totalProfit`. | Verified issue (code); frequency unmeasured | High / Medium |
| 8 | **`/request` admin page:** every table row fires `/api/wallet/balance`, which returns the *whole* wallet history. The response is an array, so `data.balance` is always undefined; the result is never used. N full-collection reads per page load. | Verified issue | High |
| 9 | **The Category list is re-read constantly.** `Category_code_key` has ~43K uses/day and `isDeleted_isVisibleForCustomer` ~22.6K/day. The storefront cart badge polls a full `getCart()` (cart, products, **all categories**, offers) every 10 s per open tab. | Strongly suspected / caching opportunity | Medium |
| 10 | **Unused indexes.** `Sell`: 5 of 7 have 0 uses in 7 days. `Category`: 8 of 14. `Kurti`: 5 of 14. `StockAddition`: 2 of 4. Each adds write overhead, but none should be dropped until a full month is observed. | Requires production measurement | Medium |

**Connections:** each app reuses a module-level `PrismaClient`, there is no per-request client creation, and nothing indicates a leak (details in the previous report). Pool settings should not change without metrics.

---

## 2. Repository coverage

| Repository | Path | Inspected | DB access |
|---|---|---|---|
| Admin `RadheBeautic` | `d:\RadheBeautic\RadheBeautic` | Yes | Prisma 5.15, 603 call sites |
| Reseller `Radhe-Beautic-Reseller` | `d:\RadheBeautic\Radhe-Beautic-Reseller` | Yes | Prisma 5.15, 124 call sites |
| Customer `Radhe_Beautic_Customer` | `d:\RadheBeautic\Radhe_Beautic_Customer` | Yes | Prisma 6, 101 call sites |
| Other_Product `Radhe_Beautic_Other_Product` | `d:\RadheBeautic\Radhe_Beautic_Other_Product` | Yes | Prisma 6, 32 call sites |
| Render server `Radhe-Beutic-Server` | `d:\RadheBeautic\Radhe_render\Radhe-Beutic-Server` | Yes | **None** (fetch/axios for images and PDFs only) |

No repository named in the brief is missing. Not covered:
- Code that is not in this workspace, such as whatever writes the `ambrodary`, `blog`, `demo` and `devlopRadhey` databases on the same cluster.
- Seed and migration scripts under `prisma/`. These were inventoried, but excluded from the frequency analysis because they are run by hand.

---

## 3. Reseller `GET /api/kurti/getall` — usage map

### 3.1 Endpoint

`Radhe-Beautic-Reseller/src/app/api/kurti/getall/route.ts`

| Handler | Function | Query | Response |
|---|---|---|---|
| `GET` (l.7-20) | `getAllKurti()` → `src/data/kurti.ts:39-52` | `kurti.findMany({ where: { isDeleted: false } })`, **no `select`, no limit** | Every non-deleted Kurti, all fields (`actualPrice`, `party`, `imageVector`, `sizes`, `reservedSizes`, …), plus a `console.log` of the count |
| `POST` (l.22-37) | `getAllKurtiByTime(currentTime)` → `src/data/kurti.ts:54-66` | Same, plus `lastUpdatedTime > currentTime` | Changed documents, all fields |

**Authentication:** `src/middleware.ts:10-17` lists `/api/kurti/getall` in `publicApiRoutes`, and `isPublicApiRoute` uses `startsWith`. Both GET and POST are therefore **reachable without a session**. The route itself has no auth check.

### 3.2 Caller inventory

| Caller | Function/component | Trigger | Frequency | Data consumed | Auth | Impact | Replacement |
|---|---|---|---|---|---|---|---|
| **None found** in any of the 5 repositories | – | – | – | – | – | – | – |
| *Historical:* Reseller `src/app/(protected)/catalogue/page.tsx` (`fetch("/api/kurti/getall")`) | Catalogue list page | Page load | Per visit | List cards | Session | – | Removed in `18e7ee3` (2025-08-24, "Refactor ListPage to utilize hooks… debounced search"); replaced by `useKurtieSearch` → `/api/kurti/search` |

**Where I searched**
- All five repositories, excluding `node_modules` and `.next`, for `getall` (case-insensitive), `api/kurti`, template-literal URLs (`` `${...}/api/` ``), `axios.create`, `baseURL`, `NEXT_PUBLIC_*URL/API/HOST`, cross-domain hostnames (`reseller.radhebeautic.com`, `radhebeautic.com`, `vercel.app`) and the POST body key `currentTime`.
- The importers of `getAllKurti` and `getAllKurtiByTime`: only the route itself.
- `git log -S "kurti/getall"` on the Reseller repo:
  - `ae59dcb` (2026-04-23) added it to the middleware public list.
  - `18e7ee3` (2025-08-24) removed the last caller.
  - Earlier commits (2024) created and used it.

**Name collision:** the **Admin** app has its own `/api/kurti/getall` (`RadheBeautic/src/app/api/kurti/getall/route.ts`), called by `src/hooks/useKurtieSearch.tsx:56`. It is a different route in a different deployment and is permission-guarded (`PRODUCT_READ_PERMISSIONS`). Its own problems are covered in section 5 (A-3).

### 3.3 Conclusions

1. **UI pages that depend on it:** none in the current code.
2. **Active or legacy:** legacy in code. Possible runtime callers are old cached browser tabs, bookmarks, scrapers or external tools. To confirm, check the **Vercel request logs for the Reseller project, path `/api/kurti/getall`, over the last 30 days**: count, user agents, referrers, GET vs POST.
3. **Would removing it break a workflow?** No in-repo workflow uses it.
4. **Does any caller need `actualPrice`?** None exists. Business logic treats `actualPrice` as cost: `business-analytics.ts:238` uses it as `cost`, and profit is hidden from non-admins.
5. **Duplicates:** Reseller `/api/kurti/search` (`searchKurti`, `take: 20`) and `getByCategoryWithPages` cover the legitimate listing and search needs.

### 3.4 Recommended safe change

1. **Step 1 (compatible, reversible):** remove `"/api/kurti/getall"` from `publicApiRoutes` so it needs a session, and add an in-route role check (`currentRole()` ∈ ADMIN/MOD, the pattern already used in `src/app/api/referrers/route.ts`). Log any hit. *Rollback:* re-add the entry.
2. **Step 2 (after ~14 days with no legitimate hits in the Vercel logs):** delete the route and `getAllKurti`/`getAllKurtiByTime`. *Rollback:* restore from git.

### 3.5 Related security findings (same review)

| ID | Finding | Label | Recommendation |
|---|---|---|---|
| S-1 | Reseller `src/app/api/kurti/migrate/route.ts` → `migrate3()` (`src/data/migrate.ts:4-19`): `db.kurti.updateMany({ data: { reservedSizes: [], lastUpdatedTime } })` with **no `where`**. Middleware requires only login, so any reseller can trigger it. The Admin equivalent is guarded by `catalogue.maintenance`. | **Verified issue (critical)** | Delete the Reseller migrate route (the migrations are already done). At minimum require ADMIN. |
| S-2 | Public `getByCategory`, `getByCategoryWithPages`, `search` (Reseller `src/data/kurti.ts:140-221, 636+`) return full Kurti documents incl. `actualPrice`, `party`, `imageVector`. | Verified issue | Explicit `select` of the public card fields (section 5, R-2). |
| S-3 | Public Reseller `/api/category` `SELECT_FIELDS` (`src/app/api/category/route.ts:16-31`) includes `actualPrice`. | Verified issue | Drop `actualPrice` from the public select if the UI doesn't use it (check `CatTable`/catalogue consumers first). |
| S-4 | Reseller `getkurtiList` (`src/actions/kurti.ts:577-597`) includes `prices` (`actualPrice1-3`) and the full document. The consumer `kurtis/[id]/page.tsx:272-284` uses only id, code, `prices.sellingPrice1/2`, images, sizes, category. | Verified issue | `select` exactly those fields. |
| S-5 | Admin `getAllUsersWithRole` (`src/data/user.ts:68`) returns full `User` rows **incl. the `password` hash** to the browser via `/api/users`, `/api/customers`, `/api/referrers`. These routes are permission-guarded, but the hash still leaves the server. The Reseller copy has the same issue. | Verified issue | `select` without `password`. |
| S-6 | Atlas IP access list allows `0.0.0.0/0` (seen in Atlas). | Verified (config) | Out of scope for code; review separately. |

How to authorize the Reseller app: it has **no permission registry** (unlike Admin). It uses NextAuth sessions via `currentUser()` and `currentRole()` from `src/lib/auth`, and public catalogue pages (`/kurti-types`, `/catalogue`, `/kurtis`) are intentionally anonymous. So the public routes should stay public but return **only public fields**, and admin or maintenance routes should check `currentRole()`.

---

## 4. Complete query audit

### 4.1 Inventory summary

| Repo | Call sites | Reads | Kurti reads | Reads inside loops/callbacks |
|---|---|---|---|---|
| Admin | 603 | ~330 | most of 114 total | 105 DB calls in loops overall; mostly writes in sell flows |
| Reseller | 124 | ~90 | | |
| Customer | 101 | ~71 | | `getKurtisPaginated` loop |
| Other_Product | 32 | ~25 | | |

Reads by model (all repos): kurti 114, category 74, user 42, customerOrder 27, orders 23, onlineSellBatch 20, offlineSellBatch 16, role 14, qRCodeImage 13, cart 12. The flagged-query lists are in **Appendix A**.

### 4.2 Hot queries with runtime evidence (Atlas Query Insights, 24 h)

| Shape | Runs/day | Avg | Docs ex.:ret. | Code | Label |
|---|---|---|---|---|---|
| `isDeleted` + `category $or[$eq…]`, sort `lastUpdatedTime`, skip/limit (many array-length variants) | **~10.4K total** | 2–116 ms | 1.4–50 (one 5,848) | Customer `kurti-actions.ts:836` (`getKurtisWithFilters`), `:1021` (`getKurtisPaginated` loop), `:1198`; Other_Product equivalents | Strongly suspected (payload) |
| category double `$regexMatch` | 2.57K | 35 ms | 27 | Admin `data/kurti.ts:135`, Reseller `data/kurti.ts:158` (`getKurtiByCategory`) | Verified |
| `$toUpper(category)` + `isFullSet` | 1.17K + 280 | 60 / 52 ms | 85 / 5,822 | Admin `data/fullSet.ts:68, 106` from `api/category/route.ts:111,179` and `actions/category.ts:505` | Verified (CPU) |
| `isDeleted` + `$or $regexMatch` (code/name/category/description) | 1.16K (+ slow variants 16–38/day at 206–911 ms) | 93 ms | 45–52,985 | Customer `kurti-actions.ts:789-796, 950-957`; Admin `actions/reels.ts:118` | Verified |
| `isDeleted` + `$regexMatch(code)` | 1.02K | 45 ms | 22 | Admin `api/kurti/getall/route.ts:20-30` | Verified |
| `isDeleted` + `countOfPiece>0`, sort `code` | 927 | 141 ms | 12.7 | Admin `data/godown.ts:140, 219` | Verified |
| `category $or: []` (+ count) | 213 + 213 | 85 / 20 ms | ~52M | Customer `kurti-actions.ts:979-981, 994-996` | Verified |
| `$regexMatch(code)` sort desc limit | 198 | 124 ms | 22,718 | Admin `api/kurti/generateCode/route.ts:16` | Verified |
| `Sell.sellTime` range | 51 | **952 ms** | 1.00 | Admin `data/sales-by-location.ts:98` | Verified (slow; cause = result size, needs explain) |
| Kurti full `$project`, no filter | 51 | 68 ms | 1.00 | Admin `data/sales-by-location.ts:155` | Verified |
| `StockAddition.createdAt` range | 31 | 173 ms | 1.00 | Admin `data/business-analytics.ts:252, 291` | Optimization opportunity |
| `$vectorSearch` | 18 | 400 ms | – | Admin `lib/kurtiVectorSearch.ts` | OK |

### 4.3 Queries with no runtime evidence (code-only findings)

None of these appear in the top-33 shapes, so they are probably low-frequency. Their cost per call can still be large.

| Code | What it does | Label |
|---|---|---|
| Admin `data/offline-sales.ts:256-260` and `data/online-sales.ts:269-273` | `findMany` of **all** sale batches with `sales` and full `kurti`, on every report request, to compute `totalProfit` (which "ignores filters") | Verified issue |
| Admin `data/offline-sales.ts:128-144`, `online-sales.ts:232-249` and ~15 other `include: { kurti: true }` sites (Appendix A.4) | Paged lists that embed full Kurti documents per sale line | Optimization opportunity |
| Admin `app/api/wallet/balance/route.ts:9-17` via `request/customerRow.tsx:172-189` | Every user row fetches the entire wallet history; result unused (`data.balance` on an array). `/request` renders all filtered users with no paging (`request/page.tsx:115, 266`). | Verified issue |
| Admin `actions/kurti.ts:1105-1112` `fetchKurtiByCategory` | Full documents, **incl. deleted**, for a category, sent through a server action to the browser (catalogue download and size modal), then filtered client-side | Verified issue |
| Admin `actions/kurti.ts:1088-1093` `fetchMovedKurtiHistory` | All 6.3K history rows, no paging | Optimization opportunity |
| Admin `data/kurti.ts:213-222` `deleteKurti` | After a delete, reads the whole category with a regex filter, as full documents | Verified (low frequency) |
| Admin `actions/category.ts:830-858` `syncCategoryData` | For each of 721 categories, `findMany` full documents. That reads the whole Kurti collection (~82 MB) per click. | Verified (manual action) |
| Admin `actions/category.ts:570` `clearStockData` | Full documents per category | Optimization opportunity |
| Admin `catalogue/[kurti]/[code]/page.tsx:170` | Fetches the whole category to build the colour-variant switcher | Verified issue |
| Reseller `catalogue/[kurti]/page/[pageNum]/page.tsx:171`, `kurti-types/[type]/page.tsx:428-432` | Whole-category fetches (one per category in parallel), paginated client-side | Verified issue |
| Reseller `data/kurti.ts:174` | `console.log` of the **entire** enriched result of `getKurtiByCategory` on every call (log volume) | Verified issue |
| Customer `cart-icon.tsx:34` → `api/cart/count` → `getCart()` (`cart-actions.ts:220-300`) | Every 10 s per open tab (even hidden): cart + products + images + all non-deleted categories + offers, only to read `totalItems` | Verified issue |
| Other_Product `site-header.tsx:40`, `cart-icon.tsx:34` | Same pattern, every 5 s, from two components | Verified issue |
| Customer `cart-actions.ts:476-488` `getCartTotalWeight` | `include: { kurti: true }` (full documents) for weight; heavy `console.log` | Optimization opportunity |
| Admin `data/new-analytics.ts` | Exports a `POST` handler but sits outside `app/`, so it is dead code | Cleanup |
| Admin `api/color/route.ts:28` | Upsert loop only when the collection is empty | Not an issue |

---

## 5. Optimization candidates

Ordered within each group by expected impact. "Risk" means risk to behaviour.

### A. Projection and payload size

| ID | Location | Current | Proposed | Impact | Risk | Label |
|---|---|---|---|---|---|---|
| R-1 | Reseller `api/kurti/getall` | Full catalogue, public | Lock down, then remove (section 3.4) | Removes exposure; potentially very large responses | Low | Verified |
| R-2 | Reseller `data/kurti.ts:140-221, 636-700`; Admin `data/kurti.ts:132-170` | Full documents | `select` the card fields actually rendered; inventory consumers first (catalogue pages, `kurti-types`, `KurtiPicCard*`) | Smaller responses ×2.57K/day; removes cost-field exposure | Low–Medium (a missed field breaks a card) | Verified |
| A-3 | Admin `api/kurti/getall/route.ts:20-85` | Search path loads **all** matches as full documents, sorts in memory, returns `...kurti` | `select` list fields; push count/sort/paginate into the DB. The sort is by computed available stock, so keep in-memory sorting only over a projected candidate set, or precompute. | Large reduction for short prefixes | Medium (ordering must stay the same) | Verified |
| A-4 | Admin `actions/kurti.ts:1105` | Full documents incl. deleted | `where: { category, isDeleted: false }` + `select { code, category, sizes, reservedSizes, images, videos }` | Server-action payload shrinks | Low | Verified |
| A-5 | Sales includes (Appendix A.4) | `include: { kurti: true }` | `include: { kurti: { select: { code, sellingPrice, … } } }` per consumer | Less per sale line | Low–Medium (invoice/edit pages read many fields; audit each) | Opportunity |
| A-6 | Admin/Reseller `getAllUsersWithRole` | Full user incl. password | `select` without `password` | Security + smaller | Low | Verified |
| A-7 | Reseller `getkurtiList` | Full + `prices` | `select` consumer fields, `prices: { select: { sellingPrice1, sellingPrice2 } }` | Smaller; no cost exposure | Low | Verified |
| A-8 | Admin variant switcher | Whole category | `parentCode` query (indexed, 13.6K uses/7d already) | Fewer documents | Low | Verified |

### B. Filtering and indexes (query rewrites, not new indexes)

| ID | Location | Current | Proposed | Validation |
|---|---|---|---|---|
| B-1 | Customer `getKurtisPaginated` `in: []` (l.979-981, 994-996) | Collection scan that can never match (ratio ~52M) | Return `{ kurtis: [], hasMore: false, total: 0 }` before querying | Shape disappears from Query Insights |
| B-2 | Admin `generateCode` (l.16-28) | `startsWith` → `$regexMatch` → scan | `aggregateRaw`/`findRaw` with native `{ code: { $regex: "^" + escape(prefix) } }` sorted by `code` desc, limit 1. Prefix codes are upper-case, so a case-sensitive anchored regex can use `Kurti_code_key`. | `explain("executionStats")`: IXSCAN, `totalDocsExamined` ≈ 1 |
| B-3 | Category insensitive equality (Admin `data/kurti.ts:135,157,213`; Reseller `:158,203,249`) | Double regex | Short term: resolve the category to its stored value once (from `Category`), then exact `category: value` → uses `category_isDeleted`. Long term: normalize casing (C-3). | Compare result sets old vs new for every category |
| B-4 | Code search (Admin getall, Reseller `searchKurti`, Customer search) | `contains` insensitive | For code-only search: upper-case the input and use an anchored native prefix regex (changes semantics from *contains* to *prefix*; needs approval). For name/description search: Atlas Search index (C-4). | Search results compared on a sample of real queries |
| B-5 | `fullSet.ts` | `$toUpper(category)` | Cache results (D-3), or exact match after normalization | Query Insights count drops |
| B-6 | `analytics.ts:143`, `business-analytics.ts:216` | `code not startsWith "TES"` | Keep `isDeleted: false` in the DB, filter `TES*` in memory (the code already filters in memory elsewhere) | Same output |

### C. Pagination

| ID | Location | Current | Proposed | Risk |
|---|---|---|---|---|
| C-1 | Admin `godown.ts:129-258` (+ `getLocationSummary` l.357, `clearLocationEverywhere` l.273) | Fetch all in-stock designs, filter/paginate in memory | One `aggregateRaw` with `$match {isDeleted:false, countOfPiece:{$gt:0}}` → `$addFields` pending sizes via `$filter` (same rule as `pendingFloorMoveSizes`/`getLocationQty`) → `$match` non-empty → `$sort {code:1}` → `$facet {items:[$skip,$limit,$project first image], total:[$count], pieces:[$group]}`. Same pattern as `getFullSetKurtis`. | Medium: the Mongo expression must reproduce `src/lib/godown.ts` exactly; needs a golden-result test |
| C-2 | Customer `getKurtisPaginated` (l.914-1111) | Re-scans from DB offset 0 for every page | Return a **cursor** (`lastUpdatedTime` + `_id` of the last raw row scanned) and resume from it; sort `{lastUpdatedTime:-1, _id:-1}` for stability. Keep the in-memory size/availability filter. | Medium: client must pass the cursor; dedupe semantics change slightly (ties) |
| C-3 | Reseller catalogue pages | Whole category, client-side pages | Use the existing `getByCategoryWithPages` (with `select`) | Low–Medium |
| C-4 | Admin `/request` | All users rendered | Paginate, and **remove the per-row `/api/wallet/balance` call** (unused). If a balance is needed, use `user.balance` (already on `User`). | Low |
| C-5 | Admin `fetchMovedKurtiHistory` | All rows | `orderBy date desc`, `take`/`skip` | Low |

### D. Aggregations, duplicate queries and caching

| ID | Location | Proposed | Label |
|---|---|---|---|
| D-1 | Admin `getOfflineSalesReport`/`getOnlineSalesReport` `totalProfit` | Replace the all-history `findMany` with an aggregation over projected fields (`selledPrice`, `kurti.sellingPrice` via `$lookup` with a pipeline `$project`), or `groupBy` plus one projected Kurti price map. Or cache with a short TTL. Keep "ignores filters" semantics, or confirm the intended behaviour with the business. | Verified |
| D-2 | Admin `business-analytics.ts` | `getOverview` calls `collectRows` twice; `getAlerts` calls it plus `getStock` (another 60-day `collectRows` + full stock snapshot). `collectRows` (`sales-by-location.ts:155`) loads all 47K Kurti price rows each time. Fetch only `code: { in: soldCodes }`, and memoize per request. | Verified |
| D-3 | Category lists (Customer ×12 call sites, Other_Product ×7, Admin `api/category`) | `unstable_cache` with a 60–300 s revalidate (categories change rarely; cross-app tag invalidation isn't possible, so use time-based). Reuse one fetched list per request instead of re-querying in `getKurtiTypes`/`getVisibleCategoryCodes`. | Strongly suspected (index usage ~22–43K/day) |
| D-4 | Customer and Other_Product cart badge | Dedicated `getCartItemCount` that counts `CartProduct` sizes for the cart id (one small query, no categories or offers); poll only when `document.visibilityState === 'visible'`; refresh on cart-change events | Verified |
| D-5 | `fullSet` counts | Cache (as D-3); invalidate on stock writes in Admin | Opportunity |

### E. Search UX

| ID | Location | Proposed |
|---|---|---|
| E-1 | Admin `hooks/useKurtieSearch.tsx:37-76` | Debounce 300 ms (a `useDebounce` hook already exists in Reseller `src/hooks/useDebounce.tsx`); keep the stale-response guard; minimum 2 characters |
| E-2 | Customer search | Debounce on the client (check the search component); server `take` is already bounded by batch size |
| E-3 | Atlas Search | Only for name/description relevance search. The cluster already runs one search index (`vector_index`); an M10 shares RAM with `mongot`, so watch memory. Requires approval. |

### F. Connections

No change recommended (see the previous report, section F). Evidence needed before tuning: Atlas "Connections" and "connections created/sec" against Vercel concurrent instances per project.

---

## 6. Index audit

Live usage counters since 2026-10-07 (~7 days), primary node view in Data Explorer.

| Collection | Index | Uses/7d | Assessment |
|---|---|---|---|
| Kurti | `category_isDeleted` | 86.7K | Core (storefront listing) |
| Kurti | `isDeleted` | 56.6K | Used; redundant as a prefix of `isDeleted_countOfPiece`, but the planner prefers it. Keep. |
| Kurti | `code_isDeleted` | 34.9K | Used. Overlaps the unique `code_key`. |
| Kurti | `code_key` (unique) | 22.6K | Required (uniqueness) |
| Kurti | `lastUpdatedTime` | 20.9K | Used |
| Kurti | `parentCode` | 13.6K | Used; use it for variants (A-8) |
| Kurti | `category` | 936 | Prefix-redundant with `category_isDeleted` → candidate |
| Kurti | `isDeleted_countOfPiece` | 442 | Barely used despite 927 godown runs/day; explain C-1 before deciding |
| Kurti | `pricesId`, `party`, `countOfPiece`, `party_isDeleted`, `createdAt` | **0** | Candidates |
| Sell | `sellTime` | 369 | Used (analytics) |
| Sell | `code`, `kurtiId`, `batchId`, `sellerName`, `code_sellTime` | **0** | Candidates (~13 MB, maintained on every scan sale). Check returns and edit flows by `code`/`batchId` first. |
| Category | `code_key` | 302K | Hot |
| Category | `isDeleted_isVisibleForCustomer` | 158K | Hot (storefront) |
| Category | `isDeleted` | 109K | Hot |
| Category | `normalizedLowerCase_key` | 11.2K | Required (unique) |
| Category | `kurtiType_isDeleted` | 230 | Used |
| Category | `isVisibleForCustomer`, `isStockReady`, `isDeleted_isStockReady`, `type`, `kurtiType`, `type_isDeleted`, `isVisibleForCustomer_isStockReady`, `name` | **0** | Candidates (tiny collection, low cost either way) |
| StockAddition | `createdAt` | 1.8K | Used |
| StockAddition | `code`, `kurtiId` | **0** | Candidates (~5 MB, written on every stock addition) |
| CustomerOrder | all 7 | 2–1.3K | All used at some level; no `acceptedAt` index (`collectRows` filters on it), but only 1.4K documents, so not needed |

**Recommendations**
- **No new indexes.** Every hot problem shape needs a query rewrite: `$regexMatch`/`$toUpper` cannot use any index.
- **Before dropping anything:**
  1. Observe usage across **all three nodes** for at least one full month, including month-end reporting.
  2. **Hide** the index first (Atlas supports hiding, which is reversible), watch Query Insights and latency for 1–2 weeks, then drop.
  3. Keep the Prisma schema in sync: a dropped index still declared in `schema.prisma` would be recreated by the next `prisma db push`.
- Performance Advisor reports 31 unused and 11 redundant indexes cluster-wide. That list includes the other databases and was not expanded; review it in Atlas.

**Validating a rewrite (example, run on a restored snapshot or off-peak with approval):**
```js
db.Kurti.explain("executionStats").aggregate([
  { $match: { code: { $regex: "^ABC" } } }, { $sort: { code: -1 } }, { $limit: 1 }, { $project: { code: 1 } }
])
// expect: IXSCAN on Kurti_code_key, totalDocsExamined ≈ 1
```

---

## 7. Data-transfer audit

**Facts (from the previous report):**
- Primary egress is about 122 KB/s average (≈ 10.5 GB/day).
- Cross-region was about 10.3 GB/day for Oct 1–12, before or around the region change.
- Same-region is a flat ~9.5 GB/day.

Likely high-volume read paths:

| Rank | Path | Evidence | Why large | Label |
|---|---|---|---|---|
| 1 | Customer storefront listing and infinite scroll (`getKurtisPaginated`, `getKurtisWithFilters` up to 400/2,000-doc samples) | ~10.4K runs/day | 100–2,000 docs × (images + sizes) per call; repeated from offset 0 | Strongly suspected |
| 2 | Category pages via `getByCategory` (Admin + Reseller, public) | 2.57K/day | Whole category, full documents | Strongly suspected |
| 3 | Storefront/admin search | 1.16K + 1.02K/day | Admin returns all matches in full | Strongly suspected |
| 4 | Godown pages | 927/day | All in-stock designs + images | Strongly suspected |
| 5 | Category lists + cart polling | Index usage ~22–43K/day | Small docs × very high frequency | Requires measurement |
| 6 | Sales reports (all history) and `/request` wallet calls | Code only | Whole collections per view / per row | Requires measurement |
| 7 | Writes: sell flows create `Prices` docs per sale (`kurti.ts:927, 1711, 2119, 2784`), `topSoldKurti.upsert`, and a possible Reseller `migrate` trigger | Code | Writes replicate to 2 secondaries (same-region) | Requires measurement |

**How to measure actual bytes (no production queries needed)**
1. **Per route:** temporarily log `JSON.stringify(body).length` and route name (or wrap `NextResponse.json`). Collect for 24 h on a weekday, then sum by route × count.
2. **Per query:** Atlas Query Profiler and mongod slow-query log entries include `reslen` (response bytes) and `docsExamined`. Use them for shapes slower than `slowms`.
3. **Network:** Atlas Metrics → Network (bytes out), per host. Compare equal weekday windows before and after each fix and after the `bom1` move.
4. **Billing:** download the Invoice CSV, group "Data Transfer (Different Region / Same Region)" by **usage date**, and compare 7–14 days after deployment against the Oct 1–12 baseline.
5. **Document size:** `$bsonSize` sampling of `Kurti` (to size `imageVector`) needs approval because it reads production. Use a restored snapshot if possible.

---

## 8. Test plan

| Area | Tests / checks |
|---|---|
| Tooling | Admin: `npm test` (Vitest, existing permission tests), `npm run lint`, `npx tsc --noEmit`. Reseller, Customer, Other_Product: no test runner; at least `lint` + `tsc --noEmit` + `next build`. Consider adding Vitest for the query helpers changed. |
| Security routes | Anonymous → 401/redirect for Reseller `getall` and `migrate`; ADMIN → OK; public routes no longer contain `actualPrice`/`prices.actual*`/`imageVector`/`password` (assert on response keys). |
| Result equivalence | For every rewritten query, a script (run against a **restored snapshot or staging DB, never production**) that executes old and new implementations with recorded real parameters and diffs: ids, order, totals, page boundaries. Required for B-2, B-3, C-1, C-2, D-1, D-2. |
| Godown (C-1) | Golden tests for `pendingFloorMoveSizes`/`getLocationQty` vs the aggregation expression: mixed-case sizes, string quantities, missing location fields, 0/negative values. |
| Pagination (C-2) | No duplicates or gaps across pages, including equal `lastUpdatedTime` ties; `hasMore` correctness at boundaries; empty category list. |
| Search (B-4/E-1) | Same results for a sample of real search strings (or a documented, approved semantic change); request count per typed word ≈ 1. |
| Cart badge (D-4) | Count equals the old `getCart().totalItems` for guest and logged-in carts; no polling while hidden. |
| Performance claims | Before/after `explain("executionStats")` (docs examined, time, plan) and response bytes. Report numbers only from these measurements. |

---

## 9. Prioritized implementation plan

Each step is one PR, merged and measured before the next.

**Phase 0 — security and safety (do first, low risk)**
1. Remove or guard Reseller `/api/kurti/migrate` (S-1).
2. Reseller `getall`: require auth + role, log hits; delete after 14 days of clean logs (section 3.4).
3. Strip cost fields from public Reseller routes (S-2, S-3, S-4) after listing UI field usage.
4. Exclude `password` from user-list queries (S-5).

**Phase 1 — low-risk performance**
5. Early return for empty `in: []` (B-1).
6. Remove the per-row `/api/wallet/balance` call on `/request` (C-4); remove the full-payload `console.log` (Reseller `data/kurti.ts:174`, Customer cart logs).
7. `select` projections: `getByCategory` (R-2), `fetchKurtiByCategory` (A-4), `getkurtiList` (A-7), variants via `parentCode` (A-8).
8. Admin search: debounce + DB-side limit + projection (E-1, A-3).
9. Cart badge lightweight count + visibility-aware polling (D-4).
10. `generateCode` anchored native regex (B-2).

**Phase 2 — medium risk**
11. Godown aggregation pagination (C-1).
12. Storefront cursor pagination (C-2).
13. Sales-report `totalProfit` and `collectRows` dedupe/narrowing (D-1, D-2).
14. Category-list caching (D-3, D-5).
15. Reseller catalogue pages → paged endpoint (C-3).

**Phase 3 — higher risk / needs approval**
16. Category casing normalization (data migration; snapshot first) → exact-match queries everywhere (B-3, B-5).
17. Atlas Search for text search (E-3).
18. Index hide → observe → drop (section 6).

Never run `prisma db push`, migrations, index drops or bulk updates against production without explicit approval.

---

## 10. Uncertainties

| Uncertainty | How to resolve |
|---|---|
| Whether anything external calls Reseller `/api/kurti/getall` or `/api/kurti/migrate` | Vercel request logs (Reseller project), last 30 days, by path, method, user agent |
| Whether `migrate` has ever been hit by a reseller | Same logs + `Kurti.lastUpdatedTime` clustering at one timestamp across all documents (read-only check, needs approval) |
| Actual bytes per route | Response-size logging (section 7.1) or `reslen` from Atlas logs |
| `imageVector` share of document size | `$bsonSize` sample (approval needed) |
| Which queries drive `Category_code_key` (~43K/day) | Query Insights filtered to `test.Category`, or temporary query tagging/logging |
| Frequency of sales-report, `/request`, `syncCategoryData` usage | Vercel function invocation counts per route |
| Index usage on secondaries and over a month-end | `$indexStats` per node after ≥ 30 days |
| Whether `totalProfit` "ignores filters" is intended | Business owner decision |
| Whether reseller-facing UI legitimately needs any cost field | Business owner decision |
| Effect of the `bom1` region move | Invoice CSV by usage date, 7–14 days after deployment |

---

## Appendix A — Flagged query lists (from the static inventory)

`ADM` = Admin, `RES` = Reseller, `CUS` = Customer, `OTH` = Other_Product. Paths are relative to each repo.

### A.1 Kurti reads without `select` (full document incl. `imageVector`)

```
ADM src/actions/category.ts:570 clearStockData                    findMany
ADM src/actions/category.ts:834 syncCategoryData                  findMany (loop over categories)
ADM src/actions/kurti.ts:230,808,905,1024                         findUnique (single doc; low impact)
ADM src/actions/kurti.ts:1109 fetchKurtiByCategory                findMany (no isDeleted filter)
ADM src/app/api/kurti/getall/route.ts:30,59                       findMany
ADM src/data/godown.ts:49,449                                     findUnique (single doc)
ADM src/data/kurti.ts:54,69 getAllKurti/ByTime                    findMany (unused in Admin UI)
ADM src/data/kurti.ts:135,157 getKurtiByCategory(+WithPages)      findMany
ADM src/data/kurti.ts:213 deleteKurti                             findMany (whole category)
ADM src/data/kurti.ts:867,2729 sell flows                         findUnique + include prices (loop)
ADM src/data/kurti.ts:2107 sellMultipleOnlineKurtis               findMany + include prices
ADM src/lib/findKurti.ts:18 findKurti (scan screens)              findUnique + include
RES src/actions/kurti.ts:28 searchKurti; :116,:373 cart actions; :577 getkurtiList (+prices)
RES src/data/kurti.ts:41,56 getAllKurti/ByTime (public, unused); :111 getKurtiByCode; :158,:203 getByCategory(+Pages) (public); :249 deleteKurti; :271,:339,:548,:599 single-doc; :639 searchKurti (public)
```

### A.2 Unbounded `findMany` on large collections (no `take`)

```
ADM src/data/offline-sales.ts:256 / online-sales.ts:269   ALL batches + sales + full kurti (report totalProfit)
ADM src/app/api/wallet/balance/route.ts:9                 ALL walletHistory (+user select), called per /request row
ADM src/actions/kurti.ts:1092 fetchMovedKurtiHistory      ALL movedKurtiHistory
ADM src/data/kurti.ts:1327,1359,1383 sell history          full Sell docs for one day (1.92 KB avg)
ADM src/data/sales-by-location.ts:155                     ALL Kurti (projected) per collectRows
ADM src/data/godown.ts:140,219,273,357                    all in-stock Kurti (projected)
ADM src/data/analytics.ts:143, business-analytics.ts:216  all non-deleted Kurti (projected)
ADM src/data/user.ts:68 / RES src/data/user.ts:61         all users of given roles, full rows incl. password
ADM src/actions/shop.ts:69                                day's offline batches + include
CUS src/action/order-actions.ts:1138 getCustomerOrders    user's orders + include
```

### A.3 Regex-translated filters

```
ADM src/actions/reels.ts:118,141 (take-bounded)    ADM src/app/api/kurti/generateCode/route.ts:16
ADM src/data/analytics.ts:143, business-analytics.ts:216 (code not startsWith TES)
ADM src/data/kurti.ts:135,157,213                  ADM src/app/api/kurti/getall/route.ts:22
ADM src/data/godown.ts:138,217 (contains, case-sensitive)
ADM src/data/offline-sales.ts / online-sales.ts search fields (customerName/Phone/orderId)
ADM src/app/api/category/route.ts:69,73            ADM src/actions/customer-order.ts:157,165
RES src/actions/kurti.ts:28; src/data/kurti.ts:116,142,158,186,203,249,639; src/app/api/category/route.ts
CUS src/action/kurti-actions.ts:789-796, 950-957 (4-field OR)
```

### A.4 `include: { kurti: true }` (full Kurti per related row)

```
ADM src/data/online-sales.ts:132,237,271,306,317,415,464,1085,1248,1318,1476,1651
ADM src/data/offline-sales.ts:135,229,258,295
ADM src/data/kurti.ts:2591,2696,2878,2999
ADM src/app/api/sell/offline-sales/[id]/route.ts:677
CUS src/action/cart-actions.ts:484 (getCartTotalWeight)
OTH src/action/cart-actions.ts:227
```

### A.5 DB calls inside loops (N+1 candidates, production code)

```
ADM src/data/kurti.ts sellMultipleKurtis / sellMultipleOfflineKurtis / sellMultipleOnlineKurtis / addProductsToExistingOfflineBatch
    (per item: kurti.update, prices.create, sell/offlineSell.create, topSoldKurti.upsert, category.update)
ADM src/data/online-sales.ts updateOnlineSaleWithWalletAndCart, updateCartProductsForOnlineSale
ADM src/app/api/sell/offline-sales/[id]/route.ts PUT (kurti/offlineSell updates per line)
ADM src/actions/customer-order.ts releaseReservedQuantities / acceptCustomerOrder / cancelCustomerOrder
ADM src/actions/category.ts syncCategoryData (findMany per category), clearCategoryLocation
ADM src/app/api/cron/reconcile-customer-payments/route.ts (per pending order)
CUS src/action/kurti-actions.ts getKurtisPaginated (batched re-scan loop)
CUS src/action/order-actions.ts createCustomerOrder / cancelCustomerOrder (kurti.update per item)
```

The sell-flow loops are per-item writes inside business transactions. They are correct but chatty. Batching them is an **optimization opportunity with high behavioural risk** (stock and reservation correctness) and should come last, with dedicated tests.
