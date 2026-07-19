"use client"

import { useState, useEffect } from "react"
import { uploadImage, removeImage } from "@/src/lib/upload"
import { 
  getKurtiTypeImages,
  saveKurtiTypeImage,
  deleteKurtiTypeImage
} from "@/src/actions/customer-settings"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Image as ImageIcon, Trash2, RefreshCw, CheckCircle } from "lucide-react"

const kurtiTypes = [
  { key: 'roundedPair', value: 'Rounded Pair', defaultImage: '/kurti_type/Rounded Pair.png' },
  { key: 'straightPair', value: 'Straight Pair', defaultImage: '/kurti_type/Straight Pair.png' },
  { key: 'plazzaPair', value: 'Plazza Pair', defaultImage: '/kurti_type/Plazza Pair.png' },
  { key: 'sararaPair', value: 'Sarara Pair', defaultImage: '/kurti_type/Sarara Pair.png' },
  { key: 'straightKurtiPent', value: 'Straight Kurti Pent', defaultImage: '/kurti_type/Straight Kurti Pent.png' },
  { key: 'roundKurti', value: 'Round Kurti', defaultImage: '/kurti_type/Round Kurti.png' },
  { key: 'straightKurti', value: 'Straight Kurti', defaultImage: '/kurti_type/Straight Kurti.png' },
  { key: 'straight', value: 'Straight', defaultImage: '/kurti_type/Straight.png' },
  { key: 'onlyPent', value: 'Only Pant', defaultImage: '/kurti_type/Only Pant.png' },
  { key: 'lehengaCholi', value: 'Lehenga Choli', defaultImage: '/kurti_type/Lehenga Choli.png' },
  { key: 'codeSet', value: 'Code-Set', defaultImage: '/kurti_type/Code-Set.png' },
  { key: 'tunique', value: 'Tunique', defaultImage: '/kurti_type/Tunique.png' },
  { key: 'gaune', value: 'Gaune', defaultImage: '/kurti_type/Gown.png' },
  { key: 'aLineKurti', value: 'A-Line Kurti', defaultImage: '/kurti_type/A-Line-Kurti.png' },
  { key: 'aLineKurtiPant', value: 'A-Line Kurti Pant', defaultImage: '/kurti_type/A-Line-Kurti-Pant.png' },
  { key: 'roundedKurtiPant', value: 'Round & Kurti Pant', defaultImage: '/kurti_type/Round & Kurti Pant.png' },
]

export default function KurtiTypesPage() {
  const [customTypeImages, setCustomTypeImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryUploading, setCategoryUploading] = useState<{ [key: string]: boolean }>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const c = await getKurtiTypeImages()
      setCustomTypeImages(c)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleKurtiTypeUpload = async (key: string, file: File) => {
    setCategoryUploading(prev => ({ ...prev, [key]: true }))

    try {
      // 1. Check if there was an old custom image to delete first
      const existing = customTypeImages.find(img => img.key === key)
      if (existing && existing.imagePath) {
        try {
          await removeImage(existing.imagePath)
        } catch (e) {
          console.error("Failed to delete old image:", e)
        }
      }

      // 2. Upload new image
      const uploadRes = await uploadImage(file)

      // 3. Save to database
      const saveRes = await saveKurtiTypeImage({
        key,
        imageUrl: uploadRes.url,
        imagePath: uploadRes.path
      })

      if (saveRes.success) {
        loadData()
      } else {
        alert("Failed to update type image.")
      }
    } catch (err) {
      console.error(err)
      alert("Upload failed.")
    } finally {
      setCategoryUploading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleResetKurtiType = async (key: string) => {
    if (!confirm("Reset to default kurti type illustration?")) return

    try {
      const existing = customTypeImages.find(img => img.key === key)
      if (existing) {
        if (existing.imagePath) {
          await removeImage(existing.imagePath)
        }
        await deleteKurtiTypeImage(key)
        loadData()
      }
    } catch (err) {
      console.error(err)
      alert("Reset failed.")
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kurti Style Illustrations</h1>
          <p className="text-sm text-gray-500 mt-1">Customize illustration drawings for each kurti type style catalog.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reload Illustrations
        </Button>
      </div>

      {/* Recommended Image Size Guidelines Note */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <span className="text-lg">📐</span>
        <div className="text-xs text-blue-700 leading-relaxed font-semibold">
          <p className="font-bold mb-1">Recommended Image Size Guideline:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Illustration Image</strong>: <strong>600px x 800px</strong> (portrait aspect ratio <strong>3:4</strong>) with transparent or clean background for optimal display.</li>
          </ul>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
          <p className="text-sm text-gray-400 mt-3 font-semibold">Loading storefront configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {kurtiTypes.map((type) => {
            const custom = customTypeImages.find(img => img.key === type.key)
            const isUploadingThis = !!categoryUploading[type.key]
            
            return (
              <Card key={type.key} className="overflow-hidden border border-gray-150 flex flex-col justify-between shadow-xs bg-white">
                <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800 text-xs truncate max-w-[80%]">{type.value}</h3>
                  {custom && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Custom
                    </span>
                  )}
                </div>

                <div className="relative aspect-[3/4] w-full overflow-hidden bg-white p-4">
                  <img
                    src={custom ? custom.imageUrl : type.defaultImage}
                    alt={type.value}
                    className="object-contain w-full h-full"
                  />
                  
                  {isUploadingThis && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center flex-col">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600" />
                      <span className="text-[10px] text-pink-600 font-bold mt-2">Uploading...</span>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-gray-50/30 border-t border-gray-100 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => document.getElementById(`upload-cat-${type.key}`)?.click()}
                    disabled={isUploadingThis}
                    className="flex-1 text-[11px] h-8 bg-white hover:bg-pink-50 hover:text-pink-600 hover:border-pink-300 font-semibold"
                  >
                    Change
                  </Button>
                  <input
                    id={`upload-cat-${type.key}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleKurtiTypeUpload(type.key, file)
                    }}
                    className="hidden"
                  />

                  {custom && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleResetKurtiType(type.key)}
                      disabled={isUploadingThis}
                      className="px-2 h-8"
                      title="Reset to default"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
