"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  createVendorPurchase,
  getVendorParties,
  getVendorPurchase,
  updateVendorPurchase,
} from "@/src/actions/vendor-purchase"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react"
import { removeImage, uploadImage } from "@/src/lib/upload"
import { KURTI_TYPE_NAMES } from "@/src/lib/kurti-types"
import { formatRupees, todayIST } from "./format"
import { CreatableCombobox } from "./creatable-combobox"

type Line = {
  key: number
  design: string
  kurtiType: string
  pieces: string
  price: string
  imageUrl: string | null
  imagePath: string | null
  uploading: boolean
}

let nextKey = 1
const emptyLine = (): Line => ({
  key: nextKey++,
  design: "",
  kurtiType: "",
  pieces: "",
  price: "",
  imageUrl: null,
  imagePath: null,
  uploading: false,
})

const lineAmount = (l: Line) => (Number(l.pieces) || 0) * (Number(l.price) || 0)

/** Add (no `purchaseId`) or edit (`purchaseId`) a vendor purchase bill. */
export function PurchaseForm({ purchaseId }: { purchaseId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parties, setParties] = useState<{ id: string; name: string }[]>([])
  const [partyName, setPartyName] = useState("")
  const [date, setDate] = useState(todayIST())
  const [lines, setLines] = useState<Line[]>([emptyLine()])
  const [error, setError] = useState("")

  // Photos already saved on this bill are only removed from storage once the edit is saved.
  const savedPaths = useRef<Set<string>>(new Set())
  const [removedSavedPaths, setRemovedSavedPaths] = useState<string[]>([])
  const focusKey = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [partyRes, purchaseRes] = await Promise.all([
          getVendorParties(),
          purchaseId ? getVendorPurchase(purchaseId) : Promise.resolve(null),
        ])
        if (cancelled) return
        setParties(partyRes.parties)
        if (purchaseRes) {
          if (!("purchase" in purchaseRes) || !purchaseRes.purchase) {
            setNotFound(true)
            return
          }
          const p = purchaseRes.purchase
          setPartyName(p.partyName)
          setDate(new Date(p.date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }))
          setLines(
            p.items.map((it) => ({
              key: nextKey++,
              design: it.design,
              kurtiType: it.kurtiType ?? "",
              pieces: String(it.pieces),
              price: String(it.price),
              imageUrl: it.imageUrl ?? null,
              imagePath: it.imagePath ?? null,
              uploading: false,
            }))
          )
          savedPaths.current = new Set(p.items.map((it) => it.imagePath).filter((x): x is string => !!x))
        }
      } catch (e) {
        console.error(e)
        if (!cancelled) setError("Failed to load. Please reload the page.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [purchaseId])

  // Focus the design box of a line that was just added.
  useEffect(() => {
    if (focusKey.current == null) return
    document.getElementById(`design-${focusKey.current}`)?.focus()
    focusKey.current = null
  }, [lines])

  const totals = useMemo(() => {
    let pieces = 0
    let amount = 0
    const byType = new Map<string, { pieces: number; amount: number }>()
    for (const l of lines) {
      const p = Number(l.pieces) || 0
      const a = lineAmount(l)
      pieces += p
      amount += a
      const type = l.kurtiType.trim() || "Not set"
      const t = byType.get(type) ?? { pieces: 0, amount: 0 }
      t.pieces += p
      t.amount += a
      byType.set(type, t)
    }
    return {
      pieces,
      amount,
      designs: lines.filter((l) => l.design.trim()).length,
      byType: Array.from(byType.entries()).filter(([, t]) => t.pieces > 0),
    }
  }, [lines])

  const partyNames = useMemo(() => parties.map((p) => p.name), [parties])

  // The standard types plus any custom ones already typed on this bill.
  const kurtiTypeOptions = useMemo(() => {
    const out: string[] = [...KURTI_TYPE_NAMES]
    for (const l of lines) {
      const t = l.kurtiType.trim()
      if (t && !out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t)
    }
    return out
  }, [lines])

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  const addLine = () => {
    const line = emptyLine()
    focusKey.current = line.key
    setLines((prev) => [...prev, line])
  }

  const discardPhoto = (path: string | null) => {
    if (!path) return
    if (savedPaths.current.has(path)) setRemovedSavedPaths((prev) => [...prev, path])
    else removeImage(path).catch(() => {})
  }

  const removeLine = (line: Line) => {
    discardPhoto(line.imagePath)
    setLines((prev) => (prev.length === 1 ? [emptyLine()] : prev.filter((l) => l.key !== line.key)))
  }

  const handlePhoto = async (line: Line, file: File | undefined) => {
    if (!file) return
    updateLine(line.key, { uploading: true })
    try {
      const { url, path } = await uploadImage(file)
      discardPhoto(line.imagePath)
      updateLine(line.key, { imageUrl: url, imagePath: path, uploading: false })
    } catch (e) {
      console.error(e)
      alert("Photo upload failed. Please try again.")
      updateLine(line.key, { uploading: false })
    }
  }

  const clearPhoto = (line: Line) => {
    discardPhoto(line.imagePath)
    updateLine(line.key, { imageUrl: null, imagePath: null })
  }

  const handleSave = async () => {
    setError("")
    if (lines.some((l) => l.uploading)) {
      setError("Wait for the photos to finish uploading.")
      return
    }
    // A completely blank line (e.g. the last one) is ignored rather than an error.
    const filled = lines.filter((l) => l.design.trim() || l.pieces || l.price || l.imagePath)
    const payload = {
      partyName,
      date,
      items: filled.map((l) => ({
        design: l.design,
        kurtiType: l.kurtiType,
        pieces: Number(l.pieces),
        price: Number(l.price),
        imageUrl: l.imageUrl,
        imagePath: l.imagePath,
      })),
    }
    setSaving(true)
    const res = purchaseId ? await updateVendorPurchase(purchaseId, payload) : await createVendorPurchase(payload)
    if ("error" in res) {
      setSaving(false)
      setError(res.error ?? "Failed to save purchase")
      return
    }
    removedSavedPaths.forEach((p) => removeImage(p).catch(() => {}))
    router.push("/vendor-purchases")
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 text-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen w-full bg-gray-50 p-6 pt-20 text-center space-y-4">
        <p className="text-gray-600">This purchase was not found. It may have been deleted.</p>
        <Button asChild variant="outline">
          <Link href="/vendor-purchases">Back to purchases</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 text-left">
      <div className="flex-1 overflow-y-auto p-4 pt-16 md:p-6 lg:pt-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-5">
        <Button asChild variant="ghost" size="icon">
          <Link href="/vendor-purchases" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            {purchaseId ? "Edit Purchase" : "New Purchase"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Add every design you are buying with its pieces and price per piece.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="vendor">Vendor (party)</Label>
            <CreatableCombobox
              id="vendor"
              value={partyName}
              onChange={setPartyName}
              options={partyNames}
              placeholder="Select a vendor"
              searchPlaceholder="Search or type a new vendor..."
              createLabel="Add new vendor"
            />
            <p className="text-xs text-gray-500">A new vendor is added to the party list when you save.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Purchase date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Designs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden md:grid md:grid-cols-[64px_minmax(0,1.4fr)_minmax(0,1.4fr)_90px_110px_120px_40px] gap-3 px-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            <span>Photo</span>
            <span>Design</span>
            <span>Kurti type</span>
            <span className="text-right">Pieces</span>
            <span className="text-right">Price / pc</span>
            <span className="text-right">Amount</span>
            <span />
          </div>

          {lines.map((line, index) => (
            <div
              key={line.key}
              className="grid grid-cols-[64px_minmax(0,1fr)_40px] md:grid-cols-[64px_minmax(0,1.4fr)_minmax(0,1.4fr)_90px_110px_120px_40px] gap-3 items-center rounded-lg border border-gray-200 p-3 md:border-0 md:p-1"
            >
              <PhotoCell line={line} onPick={(f) => handlePhoto(line, f)} onClear={() => clearPhoto(line)} />

              <Input
                id={`design-${line.key}`}
                placeholder={`Design ${index + 1} name / number`}
                value={line.design}
                onChange={(e) => updateLine(line.key, { design: e.target.value })}
                aria-label="Design"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-red-600 md:order-last"
                onClick={() => removeLine(line)}
                aria-label="Remove design"
              >
                <Trash2 className="w-4 h-4" />
              </Button>

              <div className="col-span-3 md:col-span-1 grid grid-cols-2 md:contents gap-3">
                <div className="col-span-2 md:col-span-1 min-w-0">
                  <CreatableCombobox
                    value={line.kurtiType}
                    onChange={(v) => updateLine(line.key, { kurtiType: v })}
                    options={kurtiTypeOptions}
                    placeholder="Kurti type"
                    searchPlaceholder="Search or type a kurti type..."
                    createLabel="Use"
                    ariaLabel="Kurti type"
                  />
                </div>
                <Input
                  className="md:text-right"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  placeholder="Pieces"
                  value={line.pieces}
                  onChange={(e) => updateLine(line.key, { pieces: e.target.value })}
                  aria-label="Pieces"
                />
                <Input
                  className="md:text-right"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="Price / pc"
                  value={line.price}
                  onChange={(e) => updateLine(line.key, { price: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && index === lines.length - 1) {
                      e.preventDefault()
                      addLine()
                    }
                  }}
                  aria-label="Price per piece"
                />
                <div className="col-span-2 md:col-span-1 flex justify-between md:justify-end text-sm">
                  <span className="md:hidden text-gray-500">Amount</span>
                  <span className="font-semibold tabular-nums">{formatRupees(lineAmount(line))}</span>
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addLine} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add design
          </Button>
        </CardContent>
      </Card>

      {totals.byType.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">By kurti type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y text-sm">
              {totals.byType.map(([type, t]) => (
                <div key={type} className="flex justify-between py-2">
                  <span className="text-gray-700">{type}</span>
                  <span className="tabular-nums text-gray-900">
                    {t.pieces} pcs · <span className="font-semibold">{formatRupees(t.amount)}</span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>

      <div className="shrink-0 border-t bg-white shadow-[0_-2px_6px_rgba(0,0,0,0.04)]">
        <div className="px-4 md:px-6 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{totals.designs}</span> designs ·{" "}
            <span className="font-semibold text-gray-900">{totals.pieces}</span> pieces
          </div>
          <div className="text-lg font-bold text-gray-900 tabular-nums">Total {formatRupees(totals.amount)}</div>
          {error && <p className="text-sm text-red-600 w-full md:w-auto">{error}</p>}
          <div className="ml-auto flex gap-2">
            <Button asChild variant="outline">
              <Link href="/vendor-purchases">Cancel</Link>
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-pink-600 hover:bg-pink-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {purchaseId ? "Save changes" : "Save purchase"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PhotoCell({ line, onPick, onClear }: { line: Line; onPick: (f: File | undefined) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="relative h-16 w-16">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={line.uploading}
        className="h-16 w-16 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden hover:border-pink-400"
        aria-label={line.imageUrl ? "Change photo" : "Add photo"}
      >
        {line.uploading ? (
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        ) : line.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={line.imageUrl} alt={line.design || "Design photo"} className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {line.imageUrl && !line.uploading && (
        <button
          type="button"
          onClick={onClear}
          className="absolute -top-1.5 -right-1.5 rounded-full bg-white border shadow p-0.5 text-gray-500 hover:text-red-600"
          aria-label="Remove photo"
        >
          <X className="w-3 h-3" />
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
    </div>
  )
}
