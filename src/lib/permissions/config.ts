/**
 * How often an open admin tab re-checks its own permissions. A refresh also
 * happens when the tab becomes visible again, when the window regains focus and
 * right after the Roles page saves, so this only bounds the worst case for a tab
 * that stays open and untouched. Server enforcement does not depend on it: every
 * protected request re-reads permissions from the database.
 */
export const PERMISSION_SYNC_INTERVAL_MS = 30_000;

/** Minimum gap between two refreshes (focus + visibility events often fire together). */
export const PERMISSION_SYNC_MIN_GAP_MS = 2_000;
