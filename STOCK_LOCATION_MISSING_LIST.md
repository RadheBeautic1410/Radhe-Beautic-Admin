# Stock Location - "Missing at a location" list

## Goal

The ground floor and 1st floor each sell fixed categories, so staff know what
should be there. Shop 316 has no fixed categories - any design can be there - so
staff need a way to check which designs/sizes are **not at Shop 316 yet** and
where the pieces are instead.

## How it works

The pending list on `/godown` (and `/move-to-floor`) has two pickers:

| Picker       | Options                                                         |
| ------------ | --------------------------------------------------------------- |
| **Not on**   | Any floor (both floors empty), Ground Floor, 1st Floor, Shop 316 |
| **Found at** | Godown (default), Ground Floor, 1st Floor, Shop 316, Anywhere else |

A size is listed when it has **0 pieces** at the "Not on" location and **more than
0** at the "Found at" location. The chip `M: 2/5` means 2 pieces at the "Found at"
location out of 5 in total. "Anywhere else" counts every piece of that size.

Examples:

- Not on Shop 316 + Found at Godown - what to bring from the godown to Shop 316.
- Not on Shop 316 + Found at Ground Floor - designs on the ground floor that Shop 316 lacks.
- Not on Ground Floor + Found at 1st Floor - sizes only on the 1st floor.

The "Found at" choice resets to Godown if it is no longer valid for the new
"Not on" choice (e.g. a floor can't be both).

## Code

- `src/lib/godown.ts` - `PendingSource`, `pendingSourceQty`, `pendingFloorMoveSizes(sizes, location, source)`
- `src/data/godown.ts` - `getPendingFloorMoves({ ..., source })`; each size returns `sourceQuantity`
- `src/app/api/kurti/godown/pending/route.ts` - `?source=GODOWN|FLOOR_1|FLOOR_2|SHOP_316|ANY` (default `GODOWN`)
- `src/app/(protected)/_components/godown/pending-floor-moves.tsx` - the "Found at" picker

No DB or schema change.

## Status

Done 2026-10-29 on `feature/ist-time`; not yet committed.
