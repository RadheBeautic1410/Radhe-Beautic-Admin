import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { PERMISSION_SYNC_INTERVAL_MS } from "@/src/lib/permissions/config";

const signOut = vi.fn();
const useSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => useSession(),
  signOut: (...args: unknown[]) => signOut(...args),
}));

const { PermissionsProvider, usePermissions } = await import("../permissions-provider");
const { PermissionGate } = await import("../permission-gate");

// What /api/me/permissions currently answers; tests change it to simulate an admin edit.
let server: { permissions: string[]; version: string; isAdmin?: boolean } = {
  permissions: ["offers.view", "offers.edit", "offers.delete"],
  version: "v1",
};
let fetchCalls = 0;

const jsonResponse = () =>
  new Response(JSON.stringify({ ...server, isAdmin: !!server.isAdmin, baseRole: "SELLER", roleName: "Staff" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const Probe = () => {
  const { ready, can, version } = usePermissions();
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="version">{version}</span>
      <span data-testid="edit">{String(can("offers.edit"))}</span>
      <PermissionGate permission="offers.delete">
        <button>Delete offer</button>
      </PermissionGate>
      <PermissionGate permission="offers.create" fallback={<span>no-create</span>}>
        <button>Add offer</button>
      </PermissionGate>
    </div>
  );
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  fetchCalls = 0;
  server = { permissions: ["offers.view", "offers.edit", "offers.delete"], version: "v1" };
  useSession.mockReturnValue({ status: "authenticated", data: { user: { id: "u1" } } });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      fetchCalls++;
      return jsonResponse();
    })
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  signOut.mockReset();
});

const mount = async () => {
  render(
    <PermissionsProvider>
      <Probe />
    </PermissionsProvider>
  );
  await flush();
};

describe("PermissionsProvider live sync", () => {
  it("loads the current permissions and shows matching controls", async () => {
    await mount();
    expect(screen.getByTestId("ready").textContent).toBe("true");
    expect(screen.getByTestId("edit").textContent).toBe("true");
    expect(screen.getByText("Delete offer")).toBeTruthy();
    expect(screen.getByText("no-create")).toBeTruthy();
  });

  it("hides controls after a revocation, without re-login or sign-out", async () => {
    await mount();
    expect(screen.queryByText("Delete offer")).toBeTruthy();

    server = { permissions: ["offers.view"], version: "v2" };
    await act(async () => {
      vi.advanceTimersByTime(PERMISSION_SYNC_INTERVAL_MS + 100);
    });
    await flush();

    expect(screen.getByTestId("version").textContent).toBe("v2");
    expect(screen.getByTestId("edit").textContent).toBe("false");
    expect(screen.queryByText("Delete offer")).toBeNull();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("shows newly granted controls on the next sync", async () => {
    await mount();
    expect(screen.queryByText("Add offer")).toBeNull();

    server = { permissions: ["offers.view", "offers.create"], version: "v3" };
    await act(async () => {
      vi.advanceTimersByTime(PERMISSION_SYNC_INTERVAL_MS + 100);
    });
    await flush();

    expect(screen.getByText("Add offer")).toBeTruthy();
  });

  it("re-reads immediately when the tab becomes visible again", async () => {
    await mount();
    server = { permissions: ["offers.view"], version: "v4" };
    // past the minimum gap between refreshes
    await act(async () => {
      vi.advanceTimersByTime(5_000);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();
    expect(screen.getByTestId("version").textContent).toBe("v4");
  });

  it("keeps the last known permissions when the request fails or is redirected", async () => {
    await mount();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      fetchCalls++;
      return new Response("<html>login</html>", { status: 200, headers: { "content-type": "text/html" } });
    });
    await act(async () => {
      vi.advanceTimersByTime(PERMISSION_SYNC_INTERVAL_MS + 100);
    });
    await flush();
    expect(screen.getByTestId("edit").textContent).toBe("true");

    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("offline"));
    await act(async () => {
      vi.advanceTimersByTime(PERMISSION_SYNC_INTERVAL_MS + 100);
    });
    await flush();
    expect(screen.getByTestId("edit").textContent).toBe("true");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("does not poll excessively", async () => {
    await mount();
    const initial = fetchCalls;
    await act(async () => {
      vi.advanceTimersByTime(PERMISSION_SYNC_INTERVAL_MS * 2 + 100);
    });
    await flush();
    expect(fetchCalls - initial).toBeLessThanOrEqual(2);
  });

  it("does not fetch for a signed-out visitor and shows nothing gated", async () => {
    useSession.mockReturnValue({ status: "unauthenticated", data: null });
    await mount();
    expect(fetchCalls).toBe(0);
    expect(screen.getByTestId("ready").textContent).toBe("false");
    expect(screen.queryByText("Delete offer")).toBeNull();
  });

  it("an ADMIN response passes every gate", async () => {
    server = { permissions: [], version: "admin", isAdmin: true };
    await mount();
    expect(screen.getByText("Delete offer")).toBeTruthy();
    expect(screen.getByText("Add offer")).toBeTruthy();
  });
});
