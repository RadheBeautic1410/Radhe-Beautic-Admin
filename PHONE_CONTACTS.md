# Phone Contacts

Admin page **Customer → Phone Contacts** (`/contacts`) holding the business phone book
exported from Google Contacts (customers, resellers, vendors and personal contacts mixed),
so contacts can be ticked, sorted into groups and filtered by group.

## What it does

- **Import** a CSV or Excel file (.xlsx / .xlsm, first sheet): either the Google Contacts
  export (`contacts.csv`) or a sheet with `Name / Mobile Number / Organization` columns (the
  header may be on row 2, e.g. `contacts_manage.xlsm`). Parsed in the browser
  (`_components/csv.ts`, `_components/xlsx.ts` via jszip), sent in batches of 1000.
- **One contact per number.** `phoneKey` = last 10 digits of the main number, unique in the
  DB, so `+91 93168 05311`, `09316805311` and `9316805311` are the same contact. Extra
  numbers go in `otherPhones`. Re-importing skips numbers already saved, so groups set on
  the page are never overwritten.
- **Groups**: Customer, Reseller, Business, Supplier, Friend, Relative, Staff, Other
  (`DEFAULT_CONTACT_GROUPS` in `src/lib/phone-contacts.ts`), plus any new name typed with
  "+ New group...". One group per contact. Chips at the top filter by group (with counts),
  including "No group".
- **Tick boxes** per row, "tick all on this page", then "Select all N matching" to act on
  every contact the filter shows. Bulk: move to group / remove group / delete.
- Each row's group can also be changed in place; the pencil edits name, numbers, org, notes.
- **Download CSV** of the current filter. Numbers are written as `+91 93168 05311` so Excel
  keeps them as text (no `9.2E+11`).

## Files

| Part | File |
| --- | --- |
| Model | `PhoneContact` in `prisma/schema.prisma` |
| Server actions | `src/actions/phone-contact.ts` |
| Number helpers, groups | `src/lib/phone-contacts.ts` |
| Page | `src/app/(protected)/contacts/page.tsx` + `_components/` |
| Menu / permissions | `src/lib/menus.ts`, module `contacts` in `src/lib/permissions/registry.ts` |
| Tests | `src/lib/__tests__/phone-contacts.test.ts` |

## Permissions

`contacts.view`, `contacts.create` (add + import), `contacts.edit` (edit + set group),
`contacts.delete`, `contacts.export` (download). Legacy default: ADMIN only. Other roles
get it from Roles & Permissions.

## Deploy

1. `npx prisma db push` (new `PhoneContact` collection + unique `phoneKey` index).
2. Open Phone Contacts → Import → choose `contacts.csv` from the Google export
   (about 13,560 unique numbers from the 2026-10-29 export).

## Status / next steps

- Built 2026-10-29 on branch `feature/ist-time` (not committed yet).
- Ideas: multiple groups per contact (tags), sending the WhatsApp campaign
  (`WHATSAPP_MARKETING_CAMPAIGN.md`) straight to a group, linking to `User` customers by phone.
