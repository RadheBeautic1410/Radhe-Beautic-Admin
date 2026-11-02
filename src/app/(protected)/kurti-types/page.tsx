"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { uploadImage, removeImage } from "@/src/lib/upload"
import {
  getKurtiTypesForManage,
  createKurtiType,
  updateKurtiTypeNames,
  setKurtiTypeHidden,
  setKurtiTypeImage,
  resetKurtiTypeImage,
  deleteKurtiType,
} from "@/src/actions/kurti-types"
import { PermissionGate } from "@/src/components/auth/permission-gate"
import { Button } from "@/src/components/ui/button"
import { Card } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog"
import { Image as ImageIcon, Trash2, RefreshCw, CheckCircle, Plus, Pencil, Eye, EyeOff, RotateCcw } from "lucide-react"

type KurtiTypeRow = Awaited<ReturnType<typeof getKurtiTypesForManage>>[number]

// null = closed, "new" = adding a type, otherwise the type being renamed
type FormTarget = null | "new" | KurtiTypeRow

export default function KurtiTypesPage() {
  const [types, setTypes] = useState<KurtiTypeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<string | null>(null)

  const [formTarget, setFormTarget] = useState<FormTarget>(null)
  const [name, setName] = useState("")
  const [nameHi, setNameHi] = useState("")
  const [nameGu, setNameGu] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      setTypes(await getKurtiTypesForManage())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const openForm = (target: "new" | KurtiTypeRow) => {
    const row = target === "new" ? null : target
    setName(row?.name ?? "")
    setNameHi(row?.nameHi ?? "")
    setNameGu(row?.nameGu ?? "")
    setFile(null)
    setFormTarget(target)
  }

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a name.")
      return
    }
    const names = { name, nameHi, nameGu }
    setSaving(true)
    try {
      if (formTarget === "new") {
        if (!file) {
          toast.error("Please select a picture.")
          return
        }
        const uploaded = await uploadImage(file)
        const res = await createKurtiType(names, { imageUrl: uploaded.url, imagePath: uploaded.path })
        if (!res.success) {
          await removeImage(uploaded.path).catch(console.error)
          toast.error(res.error)
          return
        }
        toast.success(`${name.trim()} added.`)
      } else if (formTarget) {
        const res = await updateKurtiTypeNames(formTarget.id, names)
        if (!res.success) {
          toast.error(res.error)
          return
        }
        toast.success("Saved.")
      }
      setFormTarget(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error("Could not save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePicture = async (type: KurtiTypeRow, picked: File) => {
    setUploadingId(type.id)
    try {
      const uploaded = await uploadImage(picked)
      const res = await setKurtiTypeImage(type.id, { imageUrl: uploaded.url, imagePath: uploaded.path })
      if (!res.success) {
        await removeImage(uploaded.path).catch(console.error)
        toast.error(res.error)
        return
      }
      // Only drop the old file once the new one is saved
      if (type.imagePath) await removeImage(type.imagePath).catch(console.error)
      loadData()
    } catch (err) {
      console.error(err)
      toast.error("Upload failed.")
    } finally {
      setUploadingId(null)
    }
  }

  const handleResetPicture = async (type: KurtiTypeRow) => {
    if (!confirm(`Go back to the default picture for ${type.name}?`)) return
    const res = await resetKurtiTypeImage(type.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    if (type.imagePath) await removeImage(type.imagePath).catch(console.error)
    loadData()
  }

  const handleToggleHidden = async (type: KurtiTypeRow) => {
    const res = await setKurtiTypeHidden(type.id, !type.isHidden)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    loadData()
  }

  const handleDelete = async (type: KurtiTypeRow) => {
    if (!confirm(`Delete the kurti type "${type.name}"? This cannot be undone.`)) return
    const res = await deleteKurtiType(type.id)
    if (!res.success) {
      toast.error(res.error)
      return
    }
    if (res.imagePath) await removeImage(res.imagePath).catch(console.error)
    toast.success(`${type.name} deleted.`)
    loadData()
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-4 pt-16 md:p-6 lg:pt-6 space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kurti Types</h1>
          <p className="text-sm text-gray-500 mt-1">Add, rename, hide or delete kurti types and set their pictures. Used on the customer storefront, the reseller panel and the category forms here.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </Button>
          <PermissionGate permission="kurtiTypes.create">
            <Button
              onClick={() => openForm("new")}
              className="bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2 font-bold"
            >
              <Plus className="w-4 h-4" />
              Add Kurti Type
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Recommended Image Size Guidelines Note */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <span className="text-lg">📐</span>
        <div className="text-xs text-blue-700 leading-relaxed font-semibold">
          <p className="font-bold mb-1">Good to know:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Picture</strong>: <strong>600px x 800px</strong> (portrait aspect ratio <strong>3:4</strong>) with transparent or clean background for optimal display.</li>
            <li><strong>Hide</strong> removes a type from the storefront and reseller home pages and filters. Its categories keep working.</li>
            <li><strong>Delete</strong> only works when no active category uses the type.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
          <p className="text-sm text-gray-400 mt-3 font-semibold">Loading kurti types...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
          {types.map((type) => {
            const isUploadingThis = uploadingId === type.id
            const canReset = !!type.imageUrl && !!type.defaultImage
            const inputId = `upload-type-${type.id}`

            return (
              <Card
                key={type.id}
                className={`overflow-hidden border border-gray-150 flex flex-col justify-between shadow-xs bg-white ${type.isHidden ? "opacity-70" : ""}`}
              >
                <div className="p-3 bg-gray-50/50 border-b border-gray-100 space-y-1">
                  <h3 className="font-bold text-gray-800 text-xs truncate" title={type.name}>{type.name}</h3>
                  <div className="flex flex-wrap items-center gap-1 min-h-[18px]">
                    <span className="text-[10px] text-gray-500 font-semibold">
                      {type.categoryCount} {type.categoryCount === 1 ? "category" : "categories"}
                    </span>
                    {type.isHidden && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 border border-gray-200 px-1.5 py-0.5 rounded font-bold">
                        Hidden
                      </span>
                    )}
                    {canReset && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                        <CheckCircle className="w-3 h-3" /> Custom
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative aspect-[3/4] w-full overflow-hidden bg-white p-4">
                  <img
                    src={type.imageUrl || type.defaultImage || "/images/no-image.png"}
                    alt={type.name}
                    className="object-contain w-full h-full"
                  />

                  {isUploadingThis && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center flex-col">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600" />
                      <span className="text-[10px] text-pink-600 font-bold mt-2">Uploading...</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-gray-50/30 border-t border-gray-100 space-y-2">
                  <PermissionGate permission="kurtiTypes.edit">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(inputId)?.click()}
                        disabled={isUploadingThis}
                        className="flex-1 text-[11px] h-8 bg-white hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 font-semibold"
                      >
                        Picture
                      </Button>
                      <input
                        id={inputId}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const picked = e.target.files?.[0]
                          if (picked) handleChangePicture(type, picked)
                          e.target.value = ""
                        }}
                        className="hidden"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openForm(type)}
                        className="px-2 h-8 bg-white"
                        title="Rename"
                        aria-label={`Rename ${type.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleHidden(type)}
                        className="px-2 h-8 bg-white"
                        title={type.isHidden ? "Show" : "Hide"}
                        aria-label={`${type.isHidden ? "Show" : "Hide"} ${type.name}`}
                      >
                        {type.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </PermissionGate>

                  <PermissionGate permission="kurtiTypes.delete">
                    <div className="flex gap-2">
                      {canReset && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResetPicture(type)}
                          disabled={isUploadingThis}
                          className="flex-1 text-[11px] h-8 bg-white font-semibold flex items-center gap-1"
                          title="Go back to the default picture"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(type)}
                        disabled={isUploadingThis || type.categoryCount > 0}
                        className="flex-1 text-[11px] h-8 font-semibold flex items-center gap-1"
                        title={type.categoryCount > 0 ? "Move its categories to another type first" : "Delete this kurti type"}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </PermissionGate>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={formTarget !== null} onOpenChange={(open) => !open && !saving && setFormTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{formTarget === "new" ? "Add Kurti Type" : "Rename Kurti Type"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="type-name" className="text-xs font-bold text-gray-600">Name (Required)</Label>
              <Input
                id="type-name"
                placeholder="e.g. Anarkali Suit"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type-name-hi" className="text-xs font-bold text-gray-600">Hindi Name (Optional)</Label>
                <Input
                  id="type-name-hi"
                  value={nameHi}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameHi(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type-name-gu" className="text-xs font-bold text-gray-600">Gujarati Name (Optional)</Label>
                <Input
                  id="type-name-gu"
                  value={nameGu}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameGu(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">The reseller panel shows the English name when a translation is empty.</p>

            {formTarget === "new" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-600 block">Picture (Required)</Label>
                <p className="text-[11px] text-gray-500">Recommended: 600 × 800 px (3:4, portrait).</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("new-type-file")?.click()}
                  className="text-xs flex items-center gap-2 border-dashed border-2 w-full h-20"
                >
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{file ? file.name : "Select Picture"}</span>
                </Button>
                <input
                  id="new-type-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormTarget(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
