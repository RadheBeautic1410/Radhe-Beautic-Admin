"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createStorefrontMenuItem,
  getStorefrontMenuAdmin,
  updateStorefrontMenuItem,
} from "@/src/actions/storefront-menu"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { ArrowLeft } from "lucide-react"

export type MenuItem = {
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

/**
 * Add (no `itemId`) or edit (`itemId`) a storefront menu item on its own page.
 * `defaultParentId` pre-selects the dropdown a new item goes into.
 */
export function MenuItemForm({ itemId, defaultParentId }: { itemId?: string; defaultParentId?: string }) {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categorySearch, setCategorySearch] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getStorefrontMenuAdmin()
        if (cancelled) return
        const all = data.items as MenuItem[]
        setItems(all)
        setCategories(data.categories as CategoryOption[])
        if (itemId) {
          const item = all.find((i) => i.id === itemId)
          if (!item) {
            setNotFound(true)
            return
          }
          setForm({
            label: item.label,
            parentId: item.parentId || "",
            categoryCodes: item.categoryCodes,
            href: item.href || "",
            isActive: item.isActive,
          })
        } else if (defaultParentId && all.some((i) => i.id === defaultParentId && !i.parentId)) {
          setForm((f) => ({ ...f, parentId: defaultParentId }))
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) alert("Failed to load the storefront menu.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [itemId, defaultParentId])

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

  // Parent options: top-level items other than the one being edited
  const parentOptions = items.filter((i) => !i.parentId && i.id !== itemId)
  const hasChildren = itemId ? items.some((i) => i.parentId === itemId) : false

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
    const res = itemId ? await updateStorefrontMenuItem(itemId, input) : await createStorefrontMenuItem(input)
    if (!res.success) {
      setSaving(false)
      alert(res.error || "Failed to save menu item.")
      return
    }
    router.push("/storefront-menu")
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 pt-16 md:p-6 lg:pt-6 space-y-6 text-left">
      <div className="flex items-center gap-3 border-b pb-5">
        <Button asChild variant="outline" size="icon" aria-label="Back to storefront menu">
          <Link href="/storefront-menu">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {itemId ? "Edit Menu Item" : "Add Menu Item"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pick categories to show their products, or enter a custom link. A top item with no link only opens its
            dropdown.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : notFound ? (
        <p className="py-10 text-center text-sm text-gray-500">This menu item no longer exists.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card className="shadow-sm border-gray-200">
            <CardContent className="pt-6 grid gap-x-8 gap-y-5 lg:grid-cols-2">
              <div className="space-y-5">
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
                    disabled={hasChildren}
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
                  {hasChildren && (
                    <p className="text-[11px] text-gray-500">This item has a dropdown, so it stays in the top bar.</p>
                  )}
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
                <div className="max-h-56 lg:max-h-96 overflow-y-auto rounded-md border border-gray-200 divide-y">
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

              <div className="flex gap-2 border-t pt-5 lg:col-span-2 lg:justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 lg:flex-none lg:min-w-48 bg-pink-600 hover:bg-pink-700"
                >
                  {saving ? "Saving..." : itemId ? "Save Changes" : "Add Menu Item"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/storefront-menu">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  )
}
