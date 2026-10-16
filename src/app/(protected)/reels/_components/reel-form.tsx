"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createReel,
  getReelFormData,
  getKurtisForCategory,
  updateReel,
  type KurtiPick,
} from "@/src/actions/reels"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { ArrowLeft, Check, Plus, X } from "lucide-react"
import { VALID_SIZES } from "@/src/lib/godown"

type CategoryOption = { code: string | null; name: string; isVisibleForCustomer: boolean }

const emptyForm = {
  title: "",
  youtubeUrl: "",
  kurtiCodes: [] as string[],
  categoryCodes: [] as string[],
  sizes: [] as string[],
  isActive: true,
}

/** Same parsing rules as the server action, only used for the live preview. */
function previewVideoId(raw: string): string | null {
  const m = raw.trim().match(/(?:youtu\.be\/|\/shorts\/|\/embed\/|\/live\/|[?&]v=)([\w-]{11})/)
  if (m) return m[1]
  return /^[\w-]{11}$/.test(raw.trim()) ? raw.trim() : null
}

/** Add (no `reelId`) or edit (`reelId`) a reel on its own page. */
export function ReelForm({ reelId }: { reelId?: string }) {
  const router = useRouter()
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [categorySearch, setCategorySearch] = useState("")

  // code -> thumbnail info, for the picked-kurti chips
  const [kurtiInfo, setKurtiInfo] = useState<Record<string, KurtiPick>>({})

  // Kurti picker popup: choose a category, then tick designs from the card grid
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerCategory, setPickerCategory] = useState("")
  const [pickerKurtis, setPickerKurtis] = useState<KurtiPick[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const pickerSeq = useRef(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await getReelFormData(reelId)
        if (cancelled) return
        setCategories(data.categories as CategoryOption[])
        const info: Record<string, KurtiPick> = {}
        data.kurtis.forEach((k) => (info[k.code] = k))
        setKurtiInfo(info)
        if (reelId) {
          if (!data.reel) {
            setNotFound(true)
          } else {
            setForm({
              title: data.reel.title,
              youtubeUrl: data.reel.youtubeUrl,
              kurtiCodes: data.reel.kurtiCodes,
              categoryCodes: data.reel.categoryCodes,
              sizes: data.reel.sizes ?? [],
              isActive: data.reel.isActive,
            })
          }
        }
      } catch (e) {
        console.error(e)
        alert("Failed to load reel.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reelId])

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

  const openPicker = () => {
    setDraft(form.kurtiCodes)
    setPickerOpen(true)
  }

  const chooseCategory = async (code: string) => {
    const seq = ++pickerSeq.current
    setPickerCategory(code)
    setPickerKurtis([])
    if (!code) {
      setPickerLoading(false)
      return
    }
    setPickerLoading(true)
    try {
      const list = await getKurtisForCategory(code)
      if (seq !== pickerSeq.current) return // category changed while loading
      setPickerKurtis(list)
      setKurtiInfo((prev) => {
        const next = { ...prev }
        list.forEach((k) => (next[k.code] = k))
        return next
      })
    } catch (e) {
      console.error(e)
      alert("Failed to load kurtis.")
    } finally {
      if (seq === pickerSeq.current) setPickerLoading(false)
    }
  }

  const toggleDraft = (code: string) =>
    setDraft((d) => (d.includes(code) ? d.filter((c) => c !== code) : [...d, code]))

  const allInCategoryPicked =
    pickerKurtis.length > 0 && pickerKurtis.every((k) => draft.includes(k.code))

  const toggleAllInCategory = () =>
    setDraft((d) =>
      allInCategoryPicked
        ? d.filter((c) => !pickerKurtis.some((k) => k.code === c))
        : Array.from(new Set([...d, ...pickerKurtis.map((k) => k.code)]))
    )

  const confirmPicker = () => {
    setForm((f) => ({ ...f, kurtiCodes: draft }))
    setPickerOpen(false)
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

  const toggleSize = (size: string) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter((s) => s !== size) : [...f.sizes, size],
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
    const res = reelId ? await updateReel(reelId, form) : await createReel(form)
    setSaving(false)
    if (!res.success) {
      alert(res.error || "Failed to save reel.")
      return
    }
    router.push("/reels")
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 text-left">
      <div className="flex items-center gap-3 border-b pb-5">
        <Button asChild variant="outline" size="icon" aria-label="Back to reels">
          <Link href="/reels">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          {reelId ? "Edit Reel" : "Add Reel"}
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
        </div>
      ) : notFound ? (
        <p className="py-10 text-center text-sm text-gray-500">This reel no longer exists.</p>
      ) : (
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Reel details</CardTitle>
            <CardDescription>
              Paste the YouTube Shorts link, then pick every kurti shown in the reel. Pick categories to also show
              all kurtis of those categories after them.
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
                <div>
                  <Button type="button" variant="outline" onClick={openPicker} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    {form.kurtiCodes.length > 0 ? "Add / change kurtis" : "Add kurtis"}
                  </Button>
                </div>
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

              {/* Sizes: narrow the category kurtis only; picked kurtis always show */}
              {form.categoryCodes.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-600">
                    Sizes {form.sizes.length > 0 && `(${form.sizes.length} selected)`}
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {VALID_SIZES.map((size) => {
                      const on = form.sizes.includes(size)
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            on
                              ? "border-pink-600 bg-pink-600 text-white"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {size}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-xs text-gray-500">
                    {form.sizes.length > 0
                      ? `Category kurtis are shown only if ${form.sizes.join(" or ")} is in stock. Kurtis picked above always show.`
                      : "No size picked: every kurti of the categories is shown."}
                  </p>
                </div>
              )}

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
                  {saving ? "Saving..." : reelId ? "Save Changes" : "Add Reel"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/reels">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add kurtis</DialogTitle>
            <DialogDescription>
              Choose a category, then tap the designs shown in the reel. You can switch category and keep adding.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={pickerCategory}
              onChange={(e) => chooseCategory(e.target.value)}
              className="h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="">Select category...</option>
              {categories
                .filter((c) => c.code)
                .map((c) => (
                  <option key={c.code!} value={c.code!}>
                    {c.name}
                  </option>
                ))}
            </select>
            {pickerKurtis.length > 0 && (
              <Button type="button" variant="outline" onClick={toggleAllInCategory}>
                {allInCategoryPicked ? "Unselect all" : `Select all (${pickerKurtis.length})`}
              </Button>
            )}
          </div>

          <div className="flex-1 min-h-[200px] overflow-y-auto rounded-md border border-gray-200 p-2">
            {!pickerCategory ? (
              <p className="py-12 text-center text-sm text-gray-500">Select a category to see its designs.</p>
            ) : pickerLoading ? (
              <div className="py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto" />
              </div>
            ) : pickerKurtis.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">No kurtis in this category.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {pickerKurtis.map((k) => {
                  const picked = draft.includes(k.code)
                  return (
                    <button
                      key={k.code}
                      type="button"
                      onClick={() => toggleDraft(k.code)}
                      className={`relative overflow-hidden rounded-md border text-left ${
                        picked ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                      }`}
                    >
                      {k.image ? (
                        <img src={k.image} alt={k.code} className="aspect-3/4 w-full object-cover" />
                      ) : (
                        <div className="aspect-3/4 w-full bg-gray-100" />
                      )}
                      {picked && (
                        <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-600 text-white">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                      <div className="px-2 py-1.5">
                        <p className="truncate text-xs font-bold text-gray-800">{k.code}</p>
                        {k.createdAt && (
                          <p className="text-[10px] text-gray-500">
                            {new Date(k.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 sm:items-center">
            <span className="text-sm text-gray-500 sm:mr-auto">{draft.length} selected</span>
            <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmPicker} className="bg-pink-600 hover:bg-pink-700">
              Add selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
