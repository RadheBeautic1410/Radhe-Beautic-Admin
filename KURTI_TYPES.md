# Kurti types

Admin → **Kurti Types** manages the kurti types used on all three panels: add, rename,
hide/show, change picture, delete.

## How it works

- **`KurtiType` table** (shared MongoDB; the model is in all three Prisma schemas).
  `key` is what `Category.kurtiType` stores, so it never changes; renaming only changes
  `name`, `nameHi`, `nameGu`.
- **First fill:** when the admin panel first reads an empty table, it adds the 16 original
  types from `src/lib/kurti-types.ts` and copies pictures from the old `KurtiTypeImage`
  table. Sarara Pair and Lehenga Choli start hidden.
- **Before the first fill**, the customer and reseller panels use their own built-in lists,
  so either panel can deploy first.
- **Pictures:** `imageUrl` empty = the built-in picture for that key. Types added from admin
  have no built-in picture, so the picture is required and has no "Default" button.

## Rules

- **Hide:** removed from the customer and reseller home pages and filters, and the customer
  mega menu. Categories keep working, and admin forms still list it as "(hidden)".
- **Delete:** refused while any non-deleted category uses the type. The last remaining type
  cannot be deleted, because an empty table would be refilled from the built-in list.
- **Rename:** old vendor purchase bills keep the old name, because they store the name as text.
- **Permissions:** `kurtiTypes.create` (add), `.edit` (rename, hide, picture), `.delete`
  (delete, back to default picture).

## Where it is read

- **Admin:** `src/hooks/useKurtiTypes.ts` for the catalogue page, edit category form and
  vendor purchase form.
- **Customer:** `getStorefrontKurtiTypes()` in `src/action/settings-actions.ts`, cached 60 seconds.
  `kurti-actions.ts` resolves `kurtiTypeName` to the admin name.
- **Reseller:** `getKurtiTypeList()` in `src/actions/dashboard.ts` through `src/hooks/useKurtiTypes.ts`.
  `kurtiTypeLabel()` picks the name for the chosen language.

## Deploy

Run `npx prisma db push` once, from this project, to create the table and its unique index.
Then deploy all three panels and open the Kurti Types page once to fill the table.

The old `KurtiTypeImage` table is only read for the first fill and the fallback.
