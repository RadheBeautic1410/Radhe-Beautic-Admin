"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import {
  PERMISSION_SYNC_INTERVAL_MS,
  PERMISSION_SYNC_MIN_GAP_MS,
} from "@/src/lib/permissions/config";
import type { PermissionKey } from "@/src/lib/permissions/registry";

/**
 * Keeps the UI's idea of "what may I do" in step with the database.
 *
 * It polls /api/me/permissions (cheap, no-store) and also refreshes when the tab
 * becomes visible, the window regains focus, the network comes back, another tab
 * announces a change, or the Roles page calls `refresh()` after saving. It never
 * touches the auth session: no signOut, no token rewrite, no redirect.
 *
 * This only drives what is SHOWN. Every server action / route handler re-checks
 * permissions against the database, so a stale tab can still not do anything
 * it is no longer allowed to.
 */

interface PermissionsState {
  ready: boolean;
  permissions: ReadonlySet<PermissionKey>;
  version: string | null;
  isAdmin: boolean;
  baseRole: string | null;
  roleName: string | null;
}

interface PermissionsContextValue extends PermissionsState {
  can: (key: PermissionKey) => boolean;
  canAny: (keys: readonly PermissionKey[]) => boolean;
  /** Re-reads permissions now (e.g. right after saving a role). */
  refresh: () => Promise<void>;
}

const EMPTY: PermissionsState = {
  ready: false,
  permissions: new Set(),
  version: null,
  isAdmin: false,
  baseRole: null,
  roleName: null,
};

const PermissionsContext = createContext<PermissionsContextValue>({
  ...EMPTY,
  can: () => false,
  canAny: () => false,
  refresh: async () => {},
});

const CHANNEL = "radhe-permissions";

/** Tells the user's other open tabs to re-read their permissions. */
export const announcePermissionChange = () => {
  try {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage("changed");
    channel.close();
  } catch {
    /* best effort */
  }
};

export const PermissionsProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [state, setState] = useState<PermissionsState>(EMPTY);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastRun = useRef(0);
  const userRef = useRef<string | undefined>(undefined);

  const load = useCallback(async (force = false) => {
    if (inFlight.current) return inFlight.current;
    if (!force && Date.now() - lastRun.current < PERMISSION_SYNC_MIN_GAP_MS) return;
    lastRun.current = Date.now();

    const run = (async () => {
      try {
        const res = await fetch("/api/me/permissions", {
          cache: "no-store",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });
        // A signed-out request is redirected to the login page (HTML): keep what
        // we have rather than guessing; the auth layer handles real sign-out.
        const isJson = res.headers.get("content-type")?.includes("application/json");
        if (!res.ok || !isJson) return;
        const data = await res.json();
        setState((prev) => {
          if (prev.ready && prev.version === data.version) return prev;
          return {
            ready: true,
            permissions: new Set<PermissionKey>(data.permissions ?? []),
            version: data.version ?? null,
            isAdmin: !!data.isAdmin,
            baseRole: data.baseRole ?? null,
            roleName: data.roleName ?? null,
          };
        });
      } catch {
        /* offline / transient: keep the last known permissions */
      }
    })();

    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, []);

  // A different user (login / logout in this browser) starts from a clean slate.
  useEffect(() => {
    if (userRef.current !== userId) {
      userRef.current = userId;
      setState(EMPTY);
      lastRun.current = 0;
    }
  }, [userId]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) return;

    load(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, PERMISSION_SYNC_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const onFocus = () => load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channel = new BroadcastChannel(CHANNEL);
        channel.onmessage = () => load(true);
      }
    } catch {
      channel = null;
    }

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      channel?.close();
    };
  }, [status, userId, load]);

  const value = useMemo<PermissionsContextValue>(() => {
    const { permissions, isAdmin } = state;
    return {
      ...state,
      can: (key) => isAdmin || permissions.has(key),
      canAny: (keys) => isAdmin || keys.some((k) => permissions.has(k)),
      refresh: async () => {
        await load(true);
      },
    };
  }, [state, load]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
};

/** Everything about the current user's permissions. */
export const usePermissions = () => useContext(PermissionsContext);

/** `useCan("offers.edit")` - false until permissions have loaded. */
export const useCan = (key: PermissionKey): boolean => {
  const { can } = usePermissions();
  return can(key);
};

/** True when the user holds at least one of the permissions. */
export const useCanAny = (keys: readonly PermissionKey[]): boolean => {
  const { canAny } = usePermissions();
  return canAny(keys);
};

/**
 * The fixed role the user acts as, read from the database through the same live
 * sync as permissions (unlike the session payload, it follows role changes).
 * For identity / data-scoping decisions only, e.g. "this login is a shop floor":
 * never use it to decide whether an action is allowed - that is `useCan`.
 */
export const useBaseRole = (): string | null => {
  const { baseRole } = usePermissions();
  return baseRole;
};
