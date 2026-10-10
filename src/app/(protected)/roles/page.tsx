"use client";

import { useEffect, useState } from "react";
import { deleteRole, listRoles, saveRole } from "@/src/actions/roles";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { MENU_GROUPS, SYSTEM_ROLES } from "@/src/lib/menus";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { UserRole } from "@prisma/client";
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

type RoleRow = {
  id: string;
  name: string;
  baseRole: UserRole;
  menus: string[];
  isSystem: boolean;
  userCount: number;
};

const EMPTY = { id: "", name: "", baseRole: UserRole.SELLER as UserRole, menus: [] as string[] };

function RolesPage() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // id "" = a new role being created
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [selected, setSelected] = useState<RoleRow | null>(null);

  const load = async (keepId?: string) => {
    setLoading(true);
    const res = await listRoles();
    if (res.error || !res.data) {
      toast.error(res.error || "Could not load roles");
      setLoading(false);
      return;
    }
    setRoles(res.data as RoleRow[]);
    const again = keepId ? (res.data as RoleRow[]).find((r) => r.id === keepId) : null;
    if (again) pick(again);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const pick = (role: RoleRow | null) => {
    setSelected(role);
    setForm(
      role
        ? { id: role.id, name: role.name, baseRole: role.baseRole, menus: role.menus }
        : EMPTY
    );
  };

  const locked = !!selected?.isSystem && selected.name === UserRole.ADMIN;
  const nameLocked = !!selected?.isSystem;

  const toggleMenu = (href: string) =>
    setForm((f) => ({
      ...f,
      menus: f.menus.includes(href) ? f.menus.filter((m) => m !== href) : [...f.menus, href],
    }));

  const toggleGroup = (hrefs: string[]) =>
    setForm((f) => {
      const all = hrefs.every((h) => f.menus.includes(h));
      return {
        ...f,
        menus: all
          ? f.menus.filter((m) => !hrefs.includes(m))
          : Array.from(new Set([...f.menus, ...hrefs])),
      };
    });

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
        menus: form.menus,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success);
      await load();
      if (!form.id) pick(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected || selected.isSystem) return;
    if (!window.confirm(`Delete the role "${selected.name}"?`)) return;
    setSaving(true);
    try {
      const res = await deleteRole(selected.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(res.success);
      pick(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const builtIn = roles.filter((r) => r.isSystem);
  const custom = roles.filter((r) => !r.isSystem);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">🔐 Roles & Permissions</h1>
        <p className="text-sm text-white/80">
          Pick the menus a role can open. A role with a menu can view, add and edit everything on
          that page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Role list */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <Button type="button" onClick={() => pick(null)} className="w-full" variant={selected ? "outline" : "default"}>
              <Plus className="w-4 h-4 mr-1" /> New Role
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && <p className="text-sm text-gray-400">Loading...</p>}

            {custom.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Custom roles</p>
                {custom.map((r) => (
                  <RoleButton key={r.id} role={r} active={selected?.id === r.id} onClick={() => pick(r)} />
                ))}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Built-in roles</p>
              {builtIn.map((r) => (
                <RoleButton key={r.id} role={r} active={selected?.id === r.id} onClick={() => pick(r)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>{form.id ? `Edit role - ${form.name}` : "Create role"}</CardTitle>
            <CardDescription>
              {locked
                ? "ADMIN always has every menu and cannot be changed."
                : "Tick the sidebar menus this role should see and be able to open."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name">Role name</Label>
                <Input
                  id="role-name"
                  value={form.name}
                  disabled={nameLocked}
                  placeholder="e.g. Store Manager"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              {!nameLocked && (
                <div className="space-y-1.5">
                  <Label>Works like</Label>
                  <Select
                    value={form.baseRole}
                    onValueChange={(v) => setForm((f) => ({ ...f, baseRole: v as UserRole }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYSTEM_ROLES.filter((r) => r !== UserRole.ADMIN && r !== UserRole.MOD).map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-gray-500">
                    Buttons and actions inside a page (delete, edit...) follow this built-in role.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {MENU_GROUPS.map((group) => {
                const hrefs = group.items.map((i) => i.href);
                const allOn = hrefs.every((h) => locked || form.menus.includes(h));
                return (
                  <div key={group.name} className="rounded-lg border border-gray-200">
                    <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-t-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allOn}
                        disabled={locked}
                        onChange={() => toggleGroup(hrefs)}
                        className="w-4 h-4"
                      />
                      <span className="text-lg">{group.icon}</span>
                      <span className="font-semibold text-sm">{group.name}</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 p-3">
                      {group.items.map((item) => (
                        <label key={item.href} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={locked || form.menus.includes(item.href)}
                            disabled={locked}
                            onChange={() => toggleMenu(item.href)}
                            className="w-4 h-4"
                          />
                          <span>{item.icon}</span>
                          <span>{item.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Button type="button" onClick={handleSave} disabled={saving || locked} className="bg-blue-600 hover:bg-blue-700 text-white">
                {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {form.id ? "Save changes" : "Create role"}
              </Button>
              {selected && !selected.isSystem && (
                <Button type="button" variant="outline" onClick={handleDelete} disabled={saving} className="text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const RoleButton = ({
  role,
  active,
  onClick,
}: {
  role: RoleRow;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
      active ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
    }`}
  >
    <span className="font-semibold truncate flex items-center gap-1.5">
      {role.isSystem && role.name === UserRole.ADMIN && <Lock className="w-3 h-3 text-gray-400" />}
      {role.name}
    </span>
    <span className="text-[11px] text-gray-500 whitespace-nowrap">
      {role.menus.length} menus · {role.userCount} users
    </span>
  </button>
);

export default function RolesPageGate() {
  return (
    <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
      <RolesPage />
    </RoleGateForComponent>
  );
}
