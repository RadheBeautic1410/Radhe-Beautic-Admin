"use client";

import { useEffect, useMemo, useState } from "react";
import { convertLegacyRoles, deleteRole, listRoles, saveRole } from "@/src/actions/roles";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { MODULES, permissionKey, type ModuleDef } from "@/src/lib/permissions/registry";
import { PermissionGate } from "@/src/components/auth/permission-gate";
import {
  announcePermissionChange,
  usePermissions,
} from "@/src/components/auth/permissions-provider";
import { UserRole } from "@prisma/client";
import { ArrowLeft, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RoleRow = {
  id: string;
  name: string;
  baseRole: UserRole;
  permissions: string[];
  legacy: boolean;
  isSystem: boolean;
  userCount: number;
  updatedAt: string;
};

type Form = {
  id: string;
  name: string;
  baseRole: UserRole;
  permissions: string[];
  updatedAt?: string;
};

// New roles start with no fixed-role identity: what they can do is exactly what is ticked.
const EMPTY: Form = { id: "", name: "", baseRole: UserRole.USER, permissions: [] };

const CRUD = ["view", "create", "edit", "delete"] as const;
const GROUPS = Array.from(new Set(MODULES.map((m) => m.group)));

const modulePerms = (m: ModuleDef) => m.actions.map((a) => permissionKey(m.key, a.key));

const isAdminRole = (r: RoleRow | null) => !!r && r.isSystem && r.name === UserRole.ADMIN;

function RolesPage() {
  const { can, isAdmin, refresh } = usePermissions();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  // "list" = the roles table; "edit" = the permission page for one role (or a new one)
  const [view, setView] = useState<"list" | "edit">("list");
  // id "" = a new role being created
  const [form, setForm] = useState<Form>(EMPTY);
  const [selected, setSelected] = useState<RoleRow | null>(null);

  const canCreate = can("roles.create");
  const canEdit = can("roles.edit");
  const canDelete = can("roles.delete");

  const load = async () => {
    setLoading(true);
    const res = await listRoles();
    if ("error" in res || !res.data) {
      toast.error(("error" in res && res.error) || "Could not load roles");
      setLoading(false);
      return;
    }
    setRoles(res.data as RoleRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEditor = (role: RoleRow | null) => {
    setSelected(role);
    setForm(
      role
        ? {
            id: role.id,
            name: role.name,
            baseRole: role.baseRole,
            permissions: role.permissions,
            updatedAt: role.updatedAt,
          }
        : EMPTY
    );
    setView("edit");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const backToList = () => {
    setView("list");
    setSelected(null);
    setForm(EMPTY);
  };

  // The ADMIN role is editable; the server refuses a change that would leave
  // nobody able to open this page.
  const locked = false;
  const nameLocked = !!selected?.isSystem;
  const readOnly = locked || (form.id ? !canEdit : !canCreate);
  const have = useMemo(() => new Set(form.permissions), [form.permissions]);

  // You can only tick what you hold yourself (the server enforces the same).
  const grantable = (key: string) => isAdmin || can(key);

  const set = (updater: (current: Set<string>) => void) =>
    setForm((f) => {
      const next = new Set(f.permissions);
      updater(next);
      return { ...f, permissions: Array.from(next) };
    });

  const toggle = (m: ModuleDef, action: string) => {
    const key = permissionKey(m.key, action);
    if (!grantable(key)) return;
    set((next) => {
      if (next.has(key)) {
        next.delete(key);
        // Without view the other actions are unreachable, so clear them too.
        if (action === "view") modulePerms(m).forEach((k) => next.delete(k));
      } else {
        next.add(key);
        if (action !== "view" && grantable(permissionKey(m.key, "view"))) {
          next.add(permissionKey(m.key, "view"));
        }
      }
    });
  };

  const setModule = (m: ModuleDef, on: boolean) =>
    set((next) => {
      modulePerms(m).forEach((k) => {
        if (!on) next.delete(k);
        else if (grantable(k)) next.add(k);
      });
    });

  const setGroup = (group: string, on: boolean) =>
    MODULES.filter((m) => m.group === group).forEach((m) => setModule(m, on));

  const setAll = (on: boolean) => MODULES.forEach((m) => setModule(m, on));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Enter a role name");
      return;
    }
    setSaving(true);
    try {
      const res = await saveRole({
        id: form.id || undefined,
        name: form.name,
        baseRole: form.baseRole,
        permissions: form.permissions,
        expectedUpdatedAt: form.updatedAt,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success);
      // Pick up our own change straight away, and nudge our other tabs.
      await refresh();
      announcePermissionChange();
      await load();
      backToList();
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    setSaving(true);
    try {
      const res = await convertLegacyRoles();
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RoleRow) => {
    if (role.isSystem) return;
    if (!window.confirm(`Delete the role "${role.name}"?`)) return;
    setSaving(true);
    try {
      const res = await deleteRole(role.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success);
      if (view === "edit") backToList();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const legacyCount = roles.filter((r) => r.legacy && !isAdminRole(r)).length;

  // One list: built-in and custom roles are the same thing to an admin. ADMIN
  // stays on top, the rest are alphabetical.
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...roles]
      .filter((r) => !q || r.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const rank = (r: RoleRow) => (isAdminRole(r) ? 0 : 1);
        return rank(a) - rank(b) || a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
  }, [roles, search]);

  // ───────── permission page for one role ─────────
  if (view === "edit") {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={backToList} disabled={saving}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to roles
          </Button>
          <h1 className="text-2xl font-bold text-white">
            {form.id ? `Permissions - ${form.name}` : "Create role"}
          </h1>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>{form.id ? `Edit role - ${form.name}` : "New role"}</CardTitle>
            <CardDescription>
              {readOnly
                ? "You can view this role but do not have permission to change it."
                : "Tick what this role may do. Special actions are listed in the last column."}
              {selected?.isSystem &&
                selected.name === UserRole.ADMIN &&
                " Everyone on the built-in ADMIN role is limited to what is ticked here. To keep full access for yourself, create a Super Admin role and move your user to it first."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {selected?.legacy && !locked && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                This role has not been saved with the new permission model yet. The boxes show the
                access it has today; saving will store them as explicit permissions.
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Role name</Label>
                <Input
                  id="role-name"
                  value={form.name}
                  disabled={nameLocked || readOnly}
                  placeholder="e.g. Store Manager"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAll(true)}>
                  Select all{isAdmin ? "" : " I can grant"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setAll(false)}>
                  Clear all
                </Button>
              </div>
            )}

            <div className="space-y-4">
              {GROUPS.map((group) => {
                const modules = MODULES.filter((m) => m.group === group);
                return (
                  <div key={group} className="rounded-lg border border-gray-200 overflow-x-auto">
                    <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-t-lg">
                      <span className="font-semibold text-sm">{group}</span>
                      {!readOnly && (
                        <span className="flex gap-3 text-xs">
                          <button type="button" className="text-blue-600 hover:underline" onClick={() => setGroup(group, true)}>
                            All
                          </button>
                          <button type="button" className="text-gray-500 hover:underline" onClick={() => setGroup(group, false)}>
                            None
                          </button>
                        </span>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left font-medium px-3 py-1.5">Module</th>
                          {CRUD.map((c) => (
                            <th key={c} className="font-medium px-2 py-1.5 capitalize w-16">
                              {c}
                            </th>
                          ))}
                          <th className="text-left font-medium px-3 py-1.5">Special</th>
                          <th className="font-medium px-2 py-1.5 w-16">Row</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((m) => {
                          const all = modulePerms(m);
                          const allOn = locked || all.every((k) => have.has(k));
                          return (
                            <tr key={m.key} className="border-b last:border-b-0 align-top">
                              <td className="px-3 py-2 font-medium whitespace-nowrap">{m.label}</td>
                              {CRUD.map((c) => {
                                const def = m.actions.find((a) => a.key === c && !a.special);
                                const key = permissionKey(m.key, c);
                                return (
                                  <td key={c} className="text-center px-2 py-2">
                                    {def ? (
                                      <input
                                        type="checkbox"
                                        aria-label={`${m.label} ${def.label}`}
                                        className="w-4 h-4"
                                        checked={locked || have.has(key)}
                                        disabled={readOnly || !grantable(key)}
                                        onChange={() => toggle(m, c)}
                                      />
                                    ) : null}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2">
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  {m.actions
                                    .filter((a) => a.special)
                                    .map((a) => {
                                      const key = permissionKey(m.key, a.key);
                                      return (
                                        <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4"
                                            checked={locked || have.has(key)}
                                            disabled={readOnly || !grantable(key)}
                                            onChange={() => toggle(m, a.key)}
                                          />
                                          {a.label}
                                        </label>
                                      );
                                    })}
                                </div>
                              </td>
                              <td className="text-center px-2 py-2">
                                <input
                                  type="checkbox"
                                  aria-label={`${m.label} everything`}
                                  className="w-4 h-4"
                                  checked={allOn}
                                  disabled={readOnly}
                                  onChange={() => setModule(m, !allOn)}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                type="button"
                onClick={handleSave}
                disabled={saving || readOnly}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {form.id ? "Save changes" : "Create role"}
              </Button>
              <Button type="button" variant="outline" onClick={backToList} disabled={saving}>
                Cancel
              </Button>
              {selected && !selected.isSystem && canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDelete(selected)}
                  disabled={saving}
                  className="text-red-600 border-red-200 hover:bg-red-50 ml-auto"
                >
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ───────── roles table ─────────
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">🔐 Roles & Permissions</h1>
          <p className="text-sm text-white/80">
            Choose exactly what each role can do in every module. Changes apply to people who are
            already signed in within moments - nobody has to log in again.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => openEditor(null)}
          disabled={!canCreate}
          className="bg-white text-blue-700 hover:bg-white/90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> Create role
        </Button>
      </div>

      <Card className="bg-white">
        <CardContent className="p-4 space-y-4">
          {isAdmin && legacyCount > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="flex-1">
                {legacyCount} role(s) still use the old menu model. Converting stores their current
                access as permissions; nobody gains or loses anything.
              </p>
              <Button type="button" size="sm" variant="outline" onClick={handleConvert} disabled={saving}>
                Convert {legacyCount} role(s)
              </Button>
            </div>
          )}

          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Permissions</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-400">
                    No roles found
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const canChange = canEdit;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">
                      <span className="flex items-center gap-1.5">
                        {r.name}
                        {r.legacy && !isAdminRole(r) && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                            not converted
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{r.permissions.length}</TableCell>
                    <TableCell className="text-center">{r.userCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditor(r)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> {canChange ? "Edit" : "View"}
                        </Button>
                        {/* Always shown so every row looks the same; the title says why it is off. */}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={saving || r.isSystem || !canDelete || r.userCount > 0}
                          title={
                            r.isSystem
                              ? "Built-in roles cannot be deleted"
                              : !canDelete
                              ? "You do not have permission to delete roles"
                              : r.userCount > 0
                              ? `${r.userCount} user(s) still have this role - move them to another role first`
                              : "Delete role"
                          }
                          onClick={() => handleDelete(r)}
                          className="text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RolesPageGate() {
  return (
    <PermissionGate permission="roles.view">
      <RolesPage />
    </PermissionGate>
  );
}
