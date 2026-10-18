"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  deleteStorefrontMenuItem,
  getStorefrontMenuAdmin,
  moveStorefrontMenuItem,
} from "@/src/actions/storefront-menu"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { ArrowDown, ArrowUp, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useCan } from "@/src/components/auth/permissions-provider"
import type { MenuItem } from "./_components/menu-item-form"

type CategoryOption = { code: string | null; name: string }

export default function StorefrontMenuPage() {
  const canCreate = useCan("storefrontMenu.create")
  const canEdit = useCan("storefrontMenu.edit")
  const canDelete = useCan("storefrontMenu.delete")
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)

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

  const handleDelete = async (item: MenuItem) => {
    const kids = childrenOf(item.id).length
    const msg = kids
      ? `Delete "${item.label}" and its ${kids} dropdown item(s)?`
      : `Delete "${item.label}"?`
    if (!confirm(msg)) return
    const res = await deleteStorefrontMenuItem(item.id)
    if (!res.success) alert(res.error || "Failed to delete.")
    loadData()
  }

  const handleMove = async (item: MenuItem, direction: "up" | "down") => {
    const res = await moveStorefrontMenuItem(item.id, direction)
    if (!res.success) alert(res.error || "Failed to reorder.")
    loadData()
  }

  const linkSummary = (item: MenuItem) => {
    if (item.href) return item.href
    if (item.categoryCodes.length) return item.categoryCodes.map(categoryName).join(", ")
    return "Dropdown only (no link)"
  }

  const renderRow = (item: MenuItem, index: number, siblings: MenuItem[], isChild: boolean) => (
    <div
      key={item.id}
      className={`flex items-center gap-3 rounded-lg border border-gray-200 p-3 ${isChild ? "ml-8 bg-gray-50" : "bg-white"}`}
    >
      {canEdit && (
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
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-900">{item.label}</span>
          {!item.isActive && (
            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">HIDDEN</span>
          )}
        </div>
        <p className="truncate text-xs text-gray-500">{linkSummary(item)}</p>
      </div>
      {!isChild && canCreate && (
        <Button asChild variant="ghost" size="sm" className="hidden sm:flex text-pink-600 hover:text-pink-700">
          <Link href={`/storefront-menu/new?parent=${item.id}`} className="flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            Dropdown item
          </Link>
        </Button>
      )}
      {canEdit && (
        <Button asChild variant="ghost" size="icon" aria-label="Edit">
          <Link href={`/storefront-menu/${item.id}/edit`}>
            <Pencil className="w-4 h-4" />
          </Link>
        </Button>
      )}
      {canDelete && (
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
      )}
    </div>
  )

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 pt-16 md:p-6 lg:pt-6 space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Storefront Menu</h1>
          <p className="text-sm text-gray-500 mt-1">
            Menu bar shown under the logo on the customer website. Hover an item to open its dropdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          {canCreate && (
            <Button asChild className="bg-pink-600 hover:bg-pink-700">
              <Link href="/storefront-menu/new" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Menu Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : (
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Current Menu</CardTitle>
            <CardDescription>
              Top menu bar items, each followed by its dropdown items.
              {canEdit && " Use the arrows to change the order."}
            </CardDescription>
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
      )}
    </div>
  )
}
