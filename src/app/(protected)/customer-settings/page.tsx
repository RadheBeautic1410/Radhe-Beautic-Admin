"use client"

import { useState, useEffect } from "react"
import { uploadImage, removeImage } from "@/src/lib/upload"
import { 
  getHomepageSliders, 
  addHomepageSlider, 
  deleteHomepageSlider,
  getKurtiTypeImages,
  saveKurtiTypeImage,
  deleteKurtiTypeImage
} from "@/src/actions/customer-settings"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Image as ImageIcon, Trash2, Plus, RefreshCw, Layers, Sliders, CheckCircle } from "lucide-react"

// Source of truth for ethnic wear styles to customize
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

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState<"sliders" | "categories">("sliders")
  const [sliders, setSliders] = useState<any[]>([])
  const [customTypeImages, setCustomTypeImages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form states for adding a new banner
  const [desktopFile, setDesktopFile] = useState<File | null>(null)
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")

  // Map of upload loading states per category key
  const [categoryUploading, setCategoryUploading] = useState<{ [key: string]: boolean }>({})

  const loadData = async () => {
    setLoading(true)
    try {
      const s = await getHomepageSliders()
      const c = await getKurtiTypeImages()
      setSliders(s)
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

  const handleAddSlider = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!desktopFile) {
      alert("Please select a desktop banner image.")
      return
    }

    setIsUploading(true)
    setUploadProgress("Uploading desktop banner...")

    try {
      // 1. Upload desktop image
      const desktopRes = await uploadImage(desktopFile)
      
      let mobileUrl = undefined
      let mobilePath = undefined

      // 2. Upload mobile image if provided
      if (mobileFile) {
        setUploadProgress("Uploading mobile banner...")
        const mobileRes = await uploadImage(mobileFile)
        mobileUrl = mobileRes.url
        mobilePath = mobileRes.path
      }

      // 3. Save Slider settings
      setUploadProgress("Saving slider details...")
      const saveRes = await addHomepageSlider({
        imageUrl: desktopRes.url,
        imagePath: desktopRes.path,
        mobileUrl,
        mobilePath,
        title: title || undefined,
        subtitle: subtitle || undefined
      })

      if (saveRes.success) {
        // Reset states
        setDesktopFile(null)
        setMobileFile(null)
        setTitle("")
        setSubtitle("")
        loadData()
      } else {
        alert(saveRes.error || "Failed to add slider banner.")
      }
    } catch (err) {
      console.error(err)
      alert("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
      setUploadProgress("")
    }
  }

  const handleDeleteSlider = async (slider: any) => {
    if (!confirm("Are you sure you want to delete this slider banner?")) return

    try {
      // Remove from Firebase Storage
      if (slider.imagePath) {
        await removeImage(slider.imagePath)
      }
      if (slider.mobilePath) {
        await removeImage(slider.mobilePath)
      }

      // Remove from DB
      await deleteHomepageSlider(slider.id)
      loadData()
    } catch (err) {
      console.error(err)
      alert("Failed to delete slider.")
    }
  }

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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Storefront Design Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure slider banners and custom illustrations for ethnic styles.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Reload Settings
        </Button>
      </div>

      {/* Tabs Controller */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("sliders")}
          className={`pb-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "sliders"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-gray-500 hover:text-gray-950"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Homepage Banners
        </button>
        <button
          onClick={() => setActiveTab("categories")}
          className={`pb-3.5 text-sm font-semibold tracking-wide flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "categories"
              ? "border-pink-600 text-pink-600"
              : "border-transparent text-gray-500 hover:text-gray-950"
          }`}
        >
          <Layers className="w-4 h-4" />
          Style Type Illustrations
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mx-auto" />
          <p className="text-sm text-gray-400 mt-3 font-semibold">Loading storefront configurations...</p>
        </div>
      ) : activeTab === "sliders" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add Slider Banner Form */}
          <div className="lg:col-span-4">
            <Card className="shadow-sm border-gray-200">
              <CardHeader>
                <CardTitle className="text-lg">Add Banner Slide</CardTitle>
                <CardDescription>Upload responsive banner images for the homepage slider.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddSlider} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-bold text-gray-600">Slide Title (Optional)</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Trendy Cotton Pairs"
                      value={title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="subtitle" className="text-xs font-bold text-gray-600">Slide Subtitle (Optional)</Label>
                    <Input
                      id="subtitle"
                      placeholder="e.g. Handcrafted floral prints"
                      value={subtitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-600 block">Desktop Image (Required)</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("desktop-file")?.click()}
                        className="text-xs flex items-center gap-2 border-dashed border-2 w-full h-20"
                      >
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        {desktopFile ? desktopFile.name : "Select Desktop Banner"}
                      </Button>
                      <input
                        id="desktop-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setDesktopFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-600 block">Mobile Image (Optional)</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("mobile-file")?.click()}
                        className="text-xs flex items-center gap-2 border-dashed border-2 w-full h-20"
                      >
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                        {mobileFile ? mobileFile.name : "Select Mobile Banner"}
                      </Button>
                      <input
                        id="mobile-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMobileFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {isUploading && (
                    <div className="bg-pink-50 border border-pink-100 p-3 rounded-lg text-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-600 mx-auto" />
                      <p className="text-xs text-pink-600 font-bold mt-2">{uploadProgress}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={isUploading || !desktopFile}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Upload & Add Slide
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Active Slider Banners List */}
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Active Slider Banners ({sliders.length})</h2>
            
            {sliders.length === 0 ? (
              <div className="bg-gray-50 border rounded-2xl p-12 text-center text-gray-400">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-sm">No slider images uploaded.</p>
                <p className="text-xs mt-1">Default backup images are active on the customer portal.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sliders.map((slider) => (
                  <Card key={slider.id} className="overflow-hidden border border-gray-150 flex flex-col justify-between shadow-xs">
                    <div>
                      {/* Banner image preview */}
                      <div className="relative aspect-[16/9] w-full bg-gray-50 border-b border-gray-100">
                        <img 
                          src={slider.imageUrl} 
                          alt="Banner Preview" 
                          className="object-cover w-full h-full"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                          Desktop
                        </div>
                        {slider.mobileUrl && (
                          <div className="absolute top-2 right-2 bg-pink-600 text-white text-[9px] px-2 py-0.5 rounded font-bold">
                            + Mobile Image
                          </div>
                        )}
                      </div>

                      <div className="p-4 space-y-1">
                        <h3 className="font-bold text-gray-800 text-sm">{slider.title || "No Title"}</h3>
                        <p className="text-xs text-gray-400">{slider.subtitle || "No Subtitle"}</p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteSlider(slider)}
                        className="flex items-center gap-1 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Banner
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-pink-50 border border-pink-100 p-4 rounded-xl flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className="text-xs text-pink-700 leading-relaxed font-medium">
              You can upload custom product illustrations for each style category below. Custom images override the system default drawings shown on the customer storefront. Deleting custom uploads automatically falls back to default drawings.
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {kurtiTypes.map((type) => {
              const custom = customTypeImages.find(img => img.key === type.key)
              const isUploadingThis = !!categoryUploading[type.key]
              
              return (
                <Card key={type.key} className="overflow-hidden border border-gray-150 flex flex-col justify-between shadow-xs">
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
        </div>
      )}
    </div>
  )
}
