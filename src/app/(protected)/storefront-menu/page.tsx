"use client"

import { useEffect, useMemo, useState } from "react"
import {
  createStorefrontMenuItem,
  deleteStorefrontMenuItem,
  getStorefrontMenuAdmin,
  moveStorefrontMenuItem,
  updateStorefrontMenuItem,
} from "@/src/actions/storefront-menu"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { ArrowDown, ArrowUp, Pencil, RefreshCw, Trash2 } from "lucide-react"

type MenuItem = {
  id: string
  label: string
  parentId: string | null
  order: number
  categoryCodes: string[]
  href: string | null
  isActive: boolean
}

type CategoryOption = { code: string | null; name: string; isVisibleForCustomer: boolean }

const emptyForm = {
  label: "",
  parentId: "",
  categoryCodes: [] as string[],
  href: "",
  isActive: true,
}

export default function StorefrontMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [categorySearch, setCategorySearch] = useState("")

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getStorefrontMenuAdmin()
      setItems(data.items as MenuItem[])
      setCategories(data.categories as CategoryOption[])
    } catch (e) {
      console.error(e)
      alert("Failed to load the storefront menu.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const topLevel = useMemo(() => items.filter((i) => !i.parentId), [items])
  const childrenOf = (id: string) => items.filter((i) => i.parentId === id)
  const categoryName = useMemo(() => {
    const map = new Map<string, string>()
    categories.forEach((c) => c.code && map.set(c.code, c.name))
    return (code: string) => map.get(code) || code
  }, [categories])

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase()
    return categories.filter(
      (c) => c.code && (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    )
  }, [categories, categorySearch])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setCategorySearch("")
  }

  const startEdit = (item: MenuItem) => {
    setEditingId(item.id)
    setForm({
      label: item.label,
      parentId: item.parentId || "",
      categoryCodes: item.categoryCodes,
      href: item.href || "",
      isActive: item.isActive,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleCategory = (code: string) => {
    setForm((f) => ({
      ...f,
      categoryCodes: f.categoryCodes.includes(code)
        ? f.categoryCodes.filter((c) => c !== code)
        : [...f.categoryCodes, code],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.label.trim()) {
      alert("Please enter a menu label.")
      return
    }
    setSaving(true)
    const input = {
      label: form.label,
      parentId: form.parentId || null,
      categoryCodes: form.categoryCodes,
      href: form.href || null,
      isActive: form.isActive,
    }
    const res = editingId
      ? await updateStorefrontMenuItem(editingId, input)
      : await createStorefrontMenuItem(input)
    setSaving(false)
    if (!res.success) {
      alert(res.error || "Failed to save menu item.")
      return
    }
    resetForm()
    loadData()
  }

  const handleDelete = async (item: MenuItem) => {
    const kids = childrenOf(item.id).length
    const msg = kids
      ? `Delete "${item.label}" and its ${kids} dropdown item(s)?`
      : `Delete "${item.label}"?`
    if (!confirm(msg)) return
    const res = await deleteStorefrontMenuItem(item.id)
    if (!res.success) alert(res.error || "Failed to delete.")
    if (editingId === item.id) resetForm()
    loadData()
  }

  const handleMove = async (item: MenuItem, direction: "up" | "down") => {
    const res = await moveStorefrontMenuItem(item.id, direction)
    if (!res.success) alert(res.error || "Failed to reorder.")
    loadData()
  }

  // Parent options: top-level items other than the one being edited
  const parentOptions = topLevel.filter((i) => i.id !== editingId)
  const editingHasChildren = editingId ? childrenOf(editingId).length > 0 : false

  const linkSummary = (item: MenuItem) => {
    if (item.href) return item.href
    if (item.categoryCodes.length) return item.categoryCodes.map(categoryName).join(", ")
    return "Dropdown only (no link)"
  }

  const renderRow = (item: MenuItem, index: number, siblings: MenuItem[], isChild: boolean) => (
    <div
      key={item.id}
      className={`flex items-center gap-3 rounded-lg border p-3 ${isChild ? "ml-8 bg-gray-50" : "bg-white"} ${
        editingId === item.id ? "border-pink-400 ring-1 ring-pink-200" : "border-gray-200"
      }`}
    >
      <div className="flex flex-col">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => handleMove(item, "up")}
          className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
          aria-label="Move up"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={index === siblings.length - 1}
          onClick={() => handleMove(item, "down")}
          className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
          aria-label="Move down"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">{item.label}</span>
          {!item.isActive && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">HIDDEN</span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">{linkSummary(item)}</p>
      </div>
      <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(item)} aria-label="Edit">
        <Pencil className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => handleDelete(item)}
        className="text-red-500 hover:text-red-600"
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Storefront Menu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Menu bar shown under the logo on the customer website. Hover an item to open its dropdown.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reload
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Add / edit form */}
          <div className="lg:col-span-5">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">{editingId ? "Edit Menu Item" : "Add Menu Item"}</CardTitle>
                <CardDescription>
                  Pick categories to show their products, or enter a custom link. A top item with no link only
                  opens its dropdown.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="label" className="text-xs font-bold text-gray-600">Label</Label>
                    <Input
                      id="label"
                      placeholder="e.g. Sarees Collection"
                      value={form.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, label: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="parent" className="text-xs font-bold text-gray-600">Show in</Label>
                    <select
                      id="parent"
                      value={form.parentId}
                      disabled={editingHasChildren}
                      onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-60"
                    >
                      <option value="">Top menu bar</option>
                      {parentOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          Dropdown of &ldquo;{p.label}&rdquo;
                        </option>
                      ))}
                    </select>
                    {editingHasChildren && (
                      <p className="text-[11px] text-gray-500">This item has a dropdown, so it stays in the top bar.</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-600">
                      Categories {form.categoryCodes.length > 0 && `(${form.categoryCodes.length} selected)`}
                    </Label>
                    {form.categoryCodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.categoryCodes.map((code) => (
                          <button
                            key={code}
                            type="button"
                            onClick={() => toggleCategory(code)}
                            className="rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700 hover:bg-pink-100"
                            title="Remove"
                          >
                            {categoryName(code)} ✕
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      placeholder="Search categories..."
                      value={categorySearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategorySearch(e.target.value)}
                    />
                    <div className="max-h-56 overflow-y-auto rounded-md border border-gray-200 divide-y">
                      {filteredCategories.length === 0 ? (
                        <p className="p-3 text-xs text-gray-500">No categories found.</p>
                      ) : (
                        filteredCategories.map((c) => (
                          <label
                            key={c.code!}
                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={form.categoryCodes.includes(c.code!)}
                              onChange={() => toggleCategory(c.code!)}
                            />
                            <span className="flex-1">{c.name}</span>
                            {!c.isVisibleForCustomer && (
                              <span className="text-[10px] font-bold text-amber-600">HIDDEN FROM CUSTOMERS</span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="href" className="text-xs font-bold text-gray-600">Custom link (optional)</Label>
                    <Input
                      id="href"
                      placeholder="e.g. /about or /kurtis"
                      value={form.href}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, href: e.target.value })}
                    />
                    <p className="text-[11px] text-gray-500">Overrides the categories link when filled.</p>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                    <Label htmlFor="active" className="text-sm">Show on website</Label>
                    <Switch
                      id="active"
                      checked={form.isActive}
                      onCheckedChange={(v: boolean) => setForm({ ...form, isActive: v })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="flex-1 bg-pink-600 hover:bg-pink-700">
                      {saving ? "Saving..." : editingId ? "Save Changes" : "Add Menu Item"}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Current menu */}
          <div className="lg:col-span-7">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Current Menu</CardTitle>
                <CardDescription>Use the arrows to change the order.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {topLevel.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">
                    No menu items yet. The website shows no menu bar until you add one.
                  </p>
                ) : (
                  topLevel.map((item, i) => {
                    const kids = childrenOf(item.id)
                    return (
                      <div key={item.id} className="space-y-2">
                        {renderRow(item, i, topLevel, false)}
                        {kids.map((kid, j) => renderRow(kid, j, kids, true))}
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
