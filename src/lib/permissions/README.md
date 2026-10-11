# Permissions

Authorization is `<module>.<action>` permission keys, defined once in
[`registry.ts`](./registry.ts). Everything else (sidebar, page guard, Roles
matrix, server guards, legacy migration) is generated from that file.

## Adding a feature

1. Add the action to its module in `registry.ts` (or a new module with its
   sidebar `menu` href). Say in `legacy` who could do it before, so existing
   roles keep exactly their access (omit = whoever could open the page).
2. Server: guard the action / route handler (below). The server is the
   security boundary.
3. UI: `useCan("module.action")` or `<PermissionGate permission="...">` to hide
   controls. This is cosmetic only.

## Server guards (`server.ts`)

| Use in | Helper |
| --- | --- |
| server action that returns `{ error }` | `const denied = await permissionError("expenses.delete"); if (denied) return { error: denied.error };` |
| server action that throws | `await requirePermission("reels.edit")` |
| route handler | `const guard = await apiPermission("offers.view"); if (guard.response) return guard.response;` |
| need the user/access too | `const res = await checkPermission([...])` (array = any of) |

Permissions are read from the database on every call (`loadAccess`); the JWT /
session payload is never trusted for authorization. The only memoization is
`React.cache` (one request), so a role edit applies to the very next request.

## Live UI updates

`PermissionsProvider` (mounted in `app/(protected)/layout.tsx`) polls
`GET /api/me/permissions` (`config.ts` sets the interval), and also refreshes on
tab focus / visibility, reconnect, a `BroadcastChannel` ping from the Roles page,
and right after a save. It never touches the auth session.

## Identity vs. permission

`baseRole` (the fixed `UserRole` a custom role "works like") is for identity and
data scoping only: which shop / reseller's data a login sees. Whether an action
is allowed is always a permission. Cross-shop access is its own permission
(`offlineSales.viewAllShops`, `hallSales.chooseShop`, `sellRetailer.chooseShop`).

## Legacy compatibility

A role whose permissions were never saved (`Role.permissionsSetAt` is null) is
resolved from its legacy `menus` + `baseRole` by `legacyPermissions()`, which is
what the old checks effectively allowed. The Roles page "Convert" button (or
saving a role) stores that as explicit permissions without changing anyone's
access. `Role.menus` is kept in step with the granted `*.view` permissions until
it is removed.
