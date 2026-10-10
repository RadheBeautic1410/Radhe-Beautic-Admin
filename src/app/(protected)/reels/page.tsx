"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  createReel,
  deleteReel,
  getReelsAdmin,
  moveReel,
  searchKurtisForReel,
  updateReel,
  type KurtiPick,
} from "@/src/actions/reels"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { ArrowDown, ArrowUp, Pencil, RefreshCw, Trash2, X } from "lucide-react"

type ReelRow = {
  id: string
  title: string
  youtubeUrl: string
  videoId: string
  kurtiCodes: string[]
  categoryCodes: string[]
  order: number
  isActive: boolean
}

type CategoryOption = { code: string | null; name: string; isVisibleForCustomer: boolean }

const emptyForm = {
  title: "",
  youtubeUrl: "",
  kurtiCodes: [] as string[],
  categoryCodes: [] as string[],
  isActive: true,
}

/** Same parsing rules as the server action, only used for the live preview. */
function previewVideoId(raw: string): string | null {
  const m = raw.trim().match(/(?:youtu\.be\/|\/shorts\/|\/embed\/|\/live\/|[?&]v=)([\w-]{11})/)
  if (m) return m[1]
  return /^[\w-]{11}$/.test(raw.trim()) ? raw.trim() : null
}

export default function ReelsPage() {
  const [reels, setReels] = useState<ReelRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [categorySearch, setCategorySearch] = useState("")

  // code -> thumbnail info, for chips and the reel list
  const [kurtiInfo, setKurtiInfo] = useState<Record<string, KurtiPick>>({})
  const [kurtiSearch, setKurtiSearch] = useState("")
  const [kurtiResults, setKurtiResults] = useState<KurtiPick[]>([])
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getReelsAdmin()
      setReels(data.reels as ReelRow[])
      setCategories(data.categories as CategoryOption[])
      setKurtiInfo((prev) => {
        const next = { ...prev }
        data.kurtis.forEach((k) => (next[k.code] = k))
        return next
      })
    } catch (e) {
      console.error(e)
      alert("Failed to load reels.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Debounced kurti search
  useEffect(() => {
    const q = kurtiSearch.trim()
    if (!q) {
      setKurtiResults([])
      return
    }
    const seq = ++searchSeq.current
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await searchKurtisForReel(q)
        if (seq === searchSeq.current) setKurtiResults(res)
      } catch (e) {
        console.error(e)
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [kurtiSearch])

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

  const videoId = previewVideoId(form.youtubeUrl)

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
    setCategorySearch("")
    setKurtiSearch("")
    setKurtiResults([])
  }

  const startEdit = (reel: ReelRow) => {
    setEditingId(reel.id)
    setForm({
      title: reel.title,
      youtubeUrl: reel.youtubeUrl,
      kurtiCodes: reel.kurtiCodes,
      categoryCodes: reel.categoryCodes,
      isActive: reel.isActive,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleKurti = (k: KurtiPick) => {
    setKurtiInfo((prev) => ({ ...prev, [k.code]: k }))
    setForm((f) => ({
      ...f,
      kurtiCodes: f.kurtiCodes.includes(k.code)
        ? f.kurtiCodes.filter((c) => c !== k.code)
        : [...f.kurtiCodes, k.code],
    }))
  }

  const removeKurti = (code: string) =>
    setForm((f) => ({ ...f, kurtiCodes: f.kurtiCodes.filter((c) => c !== code) }))

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
    if (!form.title.trim()) return alert("Please enter a title.")
    if (!videoId) return alert("Please paste a valid YouTube link.")
    if (form.kurtiCodes.length === 0 && form.categoryCodes.length === 0) {
      return alert("Pick at least one kurti or one category.")
    }
    setSaving(true)
    const res = editingId ? await updateReel(editingId, form) : await createReel(form)
    setSaving(false)
    if (!res.success) {
      alert(res.error || "Failed to save reel.")
      return
    }
    resetForm()
    loadData()
  }

  const handleDelete = async (reel: ReelRow) => {
    if (!confirm(`Delete reel "${reel.title}"?`)) return
    const res = await deleteReel(reel.id)
    if (!res.success) alert(res.error || "Failed to delete.")
    if (editingId === reel.id) resetForm()
    loadData()
  }

  const handleMove = async (reel: ReelRow, direction: "up" | "down") => {
    const res = await moveReel(reel.id, direction)
    if (!res.success) alert(res.error || "Failed to reorder.")
    loadData()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reels</h1>
          <p className="text-sm text-gray-500 mt-1">
            YouTube Shorts shown in the &ldquo;Watch &amp; Shop&rdquo; section of the customer website. Tapping a
            reel opens a page with the kurtis and categories you pick here.
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
                <CardTitle className="text-lg">{editingId ? "Edit Reel" : "Add Reel"}</CardTitle>
                <CardDescription>
                  Paste the YouTube Shorts link, then pick every kurti shown in the reel. Pick categories to also
                  show all kurtis of those categories after them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="url" className="text-xs font-bold text-gray-600">YouTube link</Label>
                    <Input
                      id="url"
                      placeholder="https://youtube.com/shorts/xxxxxxxxxxx"
                      value={form.youtubeUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setForm({ ...form, youtubeUrl: e.target.value })
                      }
                    />
                    {form.youtubeUrl.trim() && !videoId && (
                      <p className="text-[11px] text-red-600">This doesn&apos;t look like a YouTube link.</p>
                    )}
                    {videoId && (
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                        alt="Video preview"
                        className="h-32 rounded-md border object-cover"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-bold text-gray-600">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Festive Anarkali Sets"
                      value={form.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>

                  {/* Kurtis */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-600">
                      Kurtis shown in the reel {form.kurtiCodes.length > 0 && `(${form.kurtiCodes.length})`}
                    </Label>
                    {form.kurtiCodes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {form.kurtiCodes.map((code) => {
                          const info = kurtiInfo[code]
                          return (
                            <div
                              key={code}
                              className="flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 py-0.5 pl-0.5 pr-2 text-xs font-semibold text-pink-700"
                            >
                              {info?.image ? (
                                <img src={info.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                              ) : (
                                <span className="h-6 w-6 rounded-full bg-pink-100" />
                              )}
                              {code}
                              <button type="button" onClick={() => removeKurti(code)} aria-label={`Remove ${code}`}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <Input
                      placeholder="Search kurti by code or category..."
                      value={kurtiSearch}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKurtiSearch(e.target.value)}
                    />
                    {kurtiSearch.trim() && (
                      <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200">
                        {searching && kurtiResults.length === 0 ? (
                          <p className="p-3 text-xs text-gray-500">Searching...</p>
                        ) : kurtiResults.length === 0 ? (
                          <p className="p-3 text-xs text-gray-500">No kurtis found.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 p-2">
                            {kurtiResults.map((k) => {
                              const picked = form.kurtiCodes.includes(k.code)
                              return (
                                <button
                                  key={k.code}
                                  type="button"
                                  onClick={() => toggleKurti(k)}
                                  className={`overflow-hidden rounded-md border text-left ${
                                    picked ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                                  }`}
                                >
                                  {k.image ? (
                                    <img src={k.image} alt={k.code} className="aspect-3/4 w-full object-cover" />
                                  ) : (
                                    <div className="aspect-3/4 w-full bg-gray-100" />
                                  )}
                                  <div className="px-1.5 py-1">
                                    <p className="truncate text-[11px] font-bold text-gray-800">{k.code}</p>
                                    <p className="truncate text-[10px] text-gray-500">{k.category}</p>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Categories */}
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
                      {saving ? "Saving..." : editingId ? "Save Changes" : "Add Reel"}
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

          {/* Current reels */}
          <div className="lg:col-span-7">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Current Reels</CardTitle>
                <CardDescription>Shown in this order on the website. Use the arrows to change it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {reels.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">
                    No reels yet. The &ldquo;Watch &amp; Shop&rdquo; section stays hidden until you add one.
                  </p>
                ) : (
                  reels.map((reel, index) => (
                    <div
                      key={reel.id}
                      className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${
                        editingId === reel.id ? "border-pink-400 ring-1 ring-pink-200" : "border-gray-200"
                      }`}
                    >
                      <div className="flex flex-col">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(reel, "up")}
                          className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === reels.length - 1}
                          onClick={() => handleMove(reel, "down")}
                          className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-30"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <img
                        src={`https://img.youtube.com/vi/${reel.videoId}/mqdefault.jpg`}
                        alt=""
                        className="h-16 w-12 rounded object-cover bg-gray-100"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-sm text-gray-900">{reel.title}</span>
                          {!reel.isActive && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                              HIDDEN
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {reel.kurtiCodes.length} kurti(s)
                          {reel.categoryCodes.length > 0 &&
                            ` · ${reel.categoryCodes.map(categoryName).join(", ")}`}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => startEdit(reel)} aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(reel)}
                        className="text-red-500 hover:text-red-600"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
