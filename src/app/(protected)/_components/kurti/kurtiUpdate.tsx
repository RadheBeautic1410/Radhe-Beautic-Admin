"use client";

import {
  addNewImages,
  categoryChange,
  priceChange,
  stockAddition,
  toggleKurtiBigPrice,
  specificationsChange,
} from "@/src/actions/kurti";
import {
  FABRICS,
  FIT_SHAPES,
  LENGTHS,
  NECKS,
  OCCASIONS,
  PATTERNS,
  SLEEVES,
  STITCH_TYPES,
} from "@/src/lib/constants";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandList,
  CommandItem,
} from "@/src/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AddSizeForm } from "../dynamicFields/sizes";
import ImageUpload2, { ImageUploadRef } from "../upload/imageUpload2";
import { v4 as uuidv4 } from "uuid";
import { Switch } from "@/src/components/ui/switch";
import PageLoader from "@/src/components/loader";

interface category {
  id: string;
  name: string;
  normalizedLowerCase: string;
}

interface KurtiUpdateProps {
  data: any;
  onKurtiUpdate: (data: any) => void;
}

interface Size {
  size: string;
  quantity: number;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  emptyText?: string;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder,
  emptyText = "No results found.",
  className = ""
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value.toLowerCase() === (value || "").toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between bg-white border-gray-300 font-normal text-xs h-10 px-3 text-left ${className}`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[--radix-popover-trigger-width] p-0 bg-white border border-gray-200 shadow-md z-50"
      >
        <Command className="bg-white">
          <CommandInput placeholder={`Search...`} className="h-9" />
          <CommandEmpty className="py-2 text-center text-xs text-gray-500">{emptyText}</CommandEmpty>
          <CommandGroup>
            <CommandList className="max-h-50 overflow-y-auto">
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={(currentValue) => {
                    const matched = options.find(
                      (o) => o.label.toLowerCase() === currentValue.toLowerCase()
                    );
                    if (matched) {
                      onValueChange(matched.value);
                    } else {
                      const matchedVal = options.find(
                        (o) => o.value.toLowerCase() === currentValue.toLowerCase()
                      );
                      if (matchedVal) onValueChange(matchedVal.value);
                    }
                    setOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <span className="truncate">{opt.label}</span>
                  <Check
                    className={`h-4 w-4 text-blue-600 ${
                      (value || "").toLowerCase() === opt.value.toLowerCase() ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </CommandItem>
              ))}
            </CommandList>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const KurtiUpdate: React.FC<KurtiUpdateProps> = ({ data, onKurtiUpdate }) => {
  const [sizes, setSizes] = useState<Size[]>(data?.sizes || []);
  const [isPending, startTransition] = useTransition();
  const [actualPrice, setActualPrice] = useState(data?.actualPrice);
  const [sellingPrice, setSellingPrice] = useState(data?.sellingPrice);
  const [customerPrice, setCustomerPrice] = useState(data?.customerPrice);
  const [weight, setWeight] = useState(data?.weight);
  const [downloadSize, setDownloadSize] = useState("");
  const [downloadQuantity, setDownloadQuantity] = useState(0);
  const [downloading1, setDownloading1] = useState(false);
  const [downloading2, setDownloading2] = useState(false);
  const [allCategory, setAllCategory] = useState<any[]>([]);
  const [changedCategory, setCategory] = useState(data?.category?.toLowerCase() || "");
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState(data?.name || "");
  const [description, setDescription] = useState(data?.description || "");
  const [fabric, setFabric] = useState(data?.fabric || "");
  const [fitShape, setFitShape] = useState(data?.fitShape || "");
  const [length, setLength] = useState(data?.length || "");
  const [neck, setNeck] = useState(data?.neck || "");
  const [occasion, setOccasion] = useState(data?.occasion || "");
  const [pattern, setPattern] = useState(data?.pattern || "");
  const [sleeve, setSleeve] = useState(data?.sleeve || "");
  const [stitchType, setStitchType] = useState(data?.stitchType || "");
  const [color, setColor] = useState(data?.color || "");
  const [parentCode, setParentCode] = useState(data?.parentCode || "");
  const [colors, setColors] = useState<any[]>([]);
  const [newColorName, setNewColorName] = useState("");
  const [isBigPrice, setIsBigPrice] = useState(data?.isBigPrice || false);
  const router = useRouter();

  const [sizesDownload, setSizesDownload] = useState<Size[]>([]);
  const selectSizes = [
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "3XL",
    "4XL",
    "5XL",
    "6XL",
    "7XL",
    "8XL",
    "9XL",
    "10XL",
  ];
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const [images, setImages] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [bigPrice, setBigPrice] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<{
    size: string;
    quantity: number;
  }[]>([]);
  const [allSizes, setAllSizes] = useState([]);

  useEffect(() => {
    if (data?.sizes) {
      setAllSizes(data.sizes);
    }
  }, [data?.sizes]);

  useEffect(() => {
    if (data?.actualPrice !== undefined) {
      setActualPrice(data.actualPrice);
    }
  }, [data?.actualPrice]);

  useEffect(() => {
    if (data?.sellingPrice !== undefined) {
      setSellingPrice(data.sellingPrice);
    }
  }, [data?.sellingPrice]);

  useEffect(() => {
    if (data?.customerPrice !== undefined) {
      setCustomerPrice(data.customerPrice);
    }
  }, [data?.customerPrice]);

  useEffect(() => {
    if (data?.weight !== undefined) {
      setWeight(data.weight);
    }
  }, [data?.weight]);

  useEffect(() => {
    setName(data?.name || "");
    setDescription(data?.description || "");
    setFabric(data?.fabric || "");
    setFitShape(data?.fitShape || "");
    setLength(data?.length || "");
    setNeck(data?.neck || "");
    setOccasion(data?.occasion || "");
    setPattern(data?.pattern || "");
    setSleeve(data?.sleeve || "");
    setStitchType(data?.stitchType || "");
    setColor(data?.color || "");
    setParentCode(data?.parentCode || "");
    setCategory(data?.category?.toLowerCase() || "");
  }, [data]);

  useEffect(() => {
    const fetchColors = async () => {
      try {
        const res = await fetch("/api/color");
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setColors(json.data);
        }
      } catch (err) {
        console.error("Failed to load colors", err);
      }
    };
    fetchColors();
  }, []);

  const handleImageChange = (data: any) => {
    setImages(data);
  };

  const handleVideoChange = (data: any) => {
    setVideos(data);
  };

  const handleAddSize = (sizes: Size[]) => {
    setSizes(sizes);
  };

  const handleAddSizeDownload = (sizes: Size[]) => {
    setSizesDownload(sizes);
  };

  const handleDownload = async () => {
    if (sizesDownload.length === 0) {
      toast.error("Please add sizes first");
      return;
    }
    try {
      setDownloading2(true);
      const obj = JSON.stringify(sizesDownload);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${data?.code}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.code}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Barcodes downloaded!");
    } catch (e: any) {
      console.error(e.message);
      toast.error("Failed to download barcodes");
    } finally {
      setDownloading2(false);
    }
  };

  const handleDownload2 = async () => {
    try {
      setDownloading1(true);
      const obj = JSON.stringify(sizes);
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${data?.code}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.code}_full_stock.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Full stock barcode downloaded!");
    } catch (e: any) {
      console.error(e.message);
      toast.error("Failed to download barcodes");
    } finally {
      setDownloading1(false);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const res = await addNewImages({
        code: data?.code,
        images: images,
        videos: videos,
      });
      if (res && (res as any).error) {
        toast.error((res as any).error);
      }
      if (res && res.success) {
        toast.success(res.success);
        onKurtiUpdate(res.kurti);
        setImages([]);
        setVideos([]);
        if (imageUploadRef.current) {
          imageUploadRef.current.reset();
        }
      }
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const query = new URLSearchParams({ page: "1", limit: "500" });
        const response = await fetch(`/api/category?${query.toString()}`);
        const result = await response.json();
        const sortedCategory = (result.data || []).sort((a: any, b: any) =>
          a.name.localeCompare(b.name)
        );
        setAllCategory(sortedCategory);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchData();
  }, []);

  const handleStockUpdate = () => {
    startTransition(() => {
      stockAddition({ code: data?.code, sizes: sizes })
        .then((res: any) => {
          if (res.error) {
            toast.error(res.error);
          }
          if (res.success) {
            toast.success(res.success);
            setSizes(res.data);
          }
        })
        .catch(() => {
          toast.error("Something went wrong!");
        });
    });
  };

  const handlePriceChange = () => {
    startTransition(() => {
      priceChange({
        code: data?.code,
        sellingPrice: sellingPrice,
        actualPrice: actualPrice,
        customerPrice: customerPrice,
        weight: weight,
      })
        .then((res: any) => {
          if (res.error) {
            toast.error(res.error);
          }
          if (res.success) {
            toast.success(res.success);
            setSizes(res.data);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  const handleSpecificationsChange = () => {
    startTransition(() => {
      specificationsChange({
        code: data?.code,
        name,
        description,
        fabric,
        fitShape,
        length,
        neck,
        occasion,
        pattern,
        sleeve,
        stitchType,
        color,
        parentCode: parentCode || "",
      })
        .then((res: any) => {
          if (res.error) {
            toast.error(res.error);
          }
          if (res.success) {
            toast.success(res.success);
            onKurtiUpdate(res.data);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  const [generatedCode, setGeneratedCode] = useState("");
  const [generatorLoader, setGeneratorLoader] = useState(false);
  const CodeGenerator = async () => {
    try {
      if (changedCategory === data?.category?.toLowerCase()) {
        setGeneratorLoader(true);
        setGeneratedCode(data?.code || "");
        setGeneratorLoader(false);
        return;
      }

      const categorySelected = changedCategory;
      if (categorySelected === "") {
        toast.error("Please select a category first");
        return;
      }
      setGeneratorLoader(true);
      const response = await fetch(
        `/api/kurti/generateCode?cat=${categorySelected}`
      );
      const result = await response.json();
      setGeneratedCode(result.code);
      return result;
    } catch (error) {
      console.error("Error generating code:", error);
    } finally {
      setGeneratorLoader(false);
    }
  };

  const handleCategoryChange = async () => {
    const generated = await CodeGenerator();
    if (!generated || !generated.code) {
      return;
    }

    const isPartialMove =
      selectedSizes.length > 0 && selectedSizes.length < allSizes.length;

    startTransition(() => {
      categoryChange({
        code: data?.code,
        category: changedCategory,
        newCode: generated.code,
        selectedSizes: selectedSizes,
        isPartialMove: isPartialMove,
        bigPrice: bigPrice,
      })
        .then((res: any) => {
          if (res.error) {
            toast.error(res.error);
          }
          if (res.success) {
            toast.success(res.success);
            router.replace(
              `/catalogue/${res.category}/${res.code.toLowerCase()}`
            );
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  return (
    <>
      <PageLoader loading={isPending || uploading} />
      {data ? (
        <div className="space-y-6 w-full text-left">
          
          {/* Top Options Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Product Specifications & Controls: <span className="text-blue-600 uppercase">{data.code}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Category: {data.category?.toUpperCase()} | Normalized Color: {data.color || "None"}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Big Size Price Toggle */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-gray-600">Big Size Price Modifier</span>
                <Switch
                  checked={isBigPrice}
                  onCheckedChange={async (e: boolean) => {
                    const res = await toggleKurtiBigPrice(data?.id, e);
                    if (!res.success) {
                      toast.error(res.error);
                      return;
                    }
                    setIsBigPrice(e);
                    onKurtiUpdate({ ...data, isBigPrice: e });
                  }}
                />
              </div>

              {/* Barcode / Print */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-xs h-9 border-gray-200 hover:bg-gray-50 font-semibold">
                    🏷️ Custom Barcodes
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Download Custom Barcodes</DialogTitle>
                    <DialogDescription>Add size and quantity to generate custom barcode labels</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 max-h-60 overflow-y-auto pr-1">
                    <AddSizeForm
                      preSizes={[]}
                      sizes={sizesDownload}
                      onAddSize={handleAddSizeDownload}
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloading2}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    >
                      {downloading2 && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Generate & Download
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                type="button"
                variant="outline"
                onClick={handleDownload2}
                disabled={downloading1}
                className="text-xs h-9 border-gray-200 hover:bg-gray-50 font-semibold"
              >
                {downloading1 && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                📥 Print Full Stock Barcodes
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Card 1: Specifications */}
            <Card className="shadow-sm border-gray-200 bg-white">
              <CardHeader className="border-b py-3 bg-gray-50">
                <CardTitle className="text-sm font-bold text-gray-800">👗 Specs & Attributes</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Product Title</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Product Title"
                    className="border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Product Description"
                    className="w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Color</label>
                    <div className="flex items-center gap-1.5">
                        <SearchableSelect
                          value={color}
                          onValueChange={(val) => setColor(val)}
                          options={colors.map((c) => ({ value: c.normalizedLowerCase, label: c.name }))}
                          placeholder="Select Color"
                          emptyText="No color found."
                        />
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="px-2.5 border-gray-300 font-bold">+</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Add New Color</DialogTitle>
                          </DialogHeader>
                          <div className="py-4 space-y-2">
                            <label className="text-xs font-semibold text-gray-700">Color Name</label>
                            <Input
                              value={newColorName}
                              onChange={(e) => setNewColorName(e.target.value)}
                              placeholder="e.g. Navy Blue"
                              className="border-gray-300"
                            />
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!newColorName) return toast.error("Name is required");
                                try {
                                  const res = await fetch("/api/color/add", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ name: newColorName }),
                                  });
                                  const json = await res.json();
                                  if (res.ok && json.data) {
                                    toast.success("Color Added!");
                                    setColors((prev) =>
                                      [...prev, json.data].sort((a, b) =>
                                        a.name.localeCompare(b.name)
                                      )
                                    );
                                    setColor(json.data.normalizedLowerCase);
                                    setNewColorName("");
                                    // Click active overlay close
                                    const closeBtn = document.querySelector('[data-radix-collection-item]') as HTMLElement;
                                    closeBtn?.click();
                                  } else {
                                    toast.error(json.error || "Failed to add color");
                                  }
                                } catch (err) {
                                  toast.error("Failed to add color");
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                            >
                              Add Color
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Fabric</label>
                    <SearchableSelect
                      value={fabric}
                      onValueChange={(val) => setFabric(val)}
                      options={FABRICS.map((fab) => ({ value: fab, label: fab }))}
                      placeholder="Select Fabric"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Fit / Shape</label>
                    <SearchableSelect
                      value={fitShape}
                      onValueChange={(val) => setFitShape(val)}
                      options={FIT_SHAPES.map((fit) => ({ value: fit, label: fit }))}
                      placeholder="Select Fit"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Length</label>
                    <SearchableSelect
                      value={length}
                      onValueChange={(val) => setLength(val)}
                      options={LENGTHS.map((len) => ({ value: len, label: len }))}
                      placeholder="Select Length"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Neck</label>
                    <SearchableSelect
                      value={neck}
                      onValueChange={(val) => setNeck(val)}
                      options={NECKS.map((nk) => ({ value: nk, label: nk }))}
                      placeholder="Select Neck"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Occasion</label>
                    <SearchableSelect
                      value={occasion}
                      onValueChange={(val) => setOccasion(val)}
                      options={OCCASIONS.map((occ) => ({ value: occ, label: occ }))}
                      placeholder="Select Occasion"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Pattern</label>
                    <SearchableSelect
                      value={pattern}
                      onValueChange={(val) => setPattern(val)}
                      options={PATTERNS.map((pat) => ({ value: pat, label: pat }))}
                      placeholder="Select Pattern"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Sleeve</label>
                    <SearchableSelect
                      value={sleeve}
                      onValueChange={(val) => setSleeve(val)}
                      options={SLEEVES.map((slv) => ({ value: slv, label: slv }))}
                      placeholder="Select Sleeve"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Stitch Type</label>
                    <SearchableSelect
                      value={stitchType}
                      onValueChange={(val) => setStitchType(val)}
                      options={STITCH_TYPES.map((st) => ({ value: st, label: st }))}
                      placeholder="Select Stitch Type"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Parent Product Code / Variant Grouping (Optional)</label>
                    <Input
                      placeholder="e.g. cr70020"
                      value={parentCode}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParentCode(e.target.value)}
                      className="bg-white border-gray-300 text-xs h-9"
                    />
                    <span className="text-[10px] text-gray-400 block mt-1 font-semibold leading-tight">
                      Set this to a shared product code to group multiple color variants together.
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSpecificationsChange}
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm"
                  >
                    Save Specifications
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Column Cards */}
            <div className="space-y-6">
              
              {/* Card 2: Pricing & Weight */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="border-b py-3 bg-gray-50">
                  <CardTitle className="text-sm font-bold text-gray-800">💰 Pricing & Weight</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Selling Price (Reseller)</label>
                      <Input
                        type="number"
                        min="0"
                        value={sellingPrice}
                        onChange={(e) => setSellingPrice(e.target.value)}
                        className="border-gray-300 bg-white"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Actual Purchase Price</label>
                      <Input
                        type="number"
                        min="0"
                        value={actualPrice}
                        onChange={(e) => setActualPrice(e.target.value)}
                        className="border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Customer Showcase Price</label>
                      <Input
                        type="number"
                        min="0"
                        value={customerPrice ?? ""}
                        onChange={(e) => setCustomerPrice(e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="border-gray-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Weight (grams)</label>
                      <Input
                        type="number"
                        min="0"
                        value={weight ?? ""}
                        onChange={(e) => setWeight(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="border-gray-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      type="button"
                      onClick={handlePriceChange}
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm"
                    >
                      Save Pricing & Weight
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 3: Stock Inventory */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="border-b py-3 bg-gray-50">
                  <CardTitle className="text-sm font-bold text-gray-800">📊 Size Stocks Inventory</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="max-h-60 overflow-y-auto pr-1">
                    <AddSizeForm
                      preSizes={sizes}
                      sizes={sizes}
                      onAddSize={handleAddSize}
                    />
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleStockUpdate}
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm"
                    >
                      Save Stock
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 4: Upload Media */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="border-b py-3 bg-gray-50">
                  <CardTitle className="text-sm font-bold text-gray-800">📸 Upload New Media</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="max-h-60 overflow-y-auto pr-1">
                    <ImageUpload2
                      allowVideos
                      onImageChange={handleImageChange}
                      images={images}
                      ref={imageUploadRef}
                      onVideoChange={handleVideoChange}
                      videos={videos}
                    />
                  </div>
                  
                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading || isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Upload files
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card 5: Migrate Category */}
              <Card className="shadow-sm border-gray-200 bg-white">
                <CardHeader className="border-b py-3 bg-gray-50">
                  <CardTitle className="text-sm font-bold text-gray-800">🔄 Migrate Product Category</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">New Category</label>
                    <SearchableSelect
                      value={changedCategory}
                      onValueChange={(val) => setCategory(val)}
                      options={allCategory.map((org) => ({ value: org.name, label: org.name }))}
                      placeholder="Select Category"
                      emptyText="No category found."
                    />
                  </div>

                  {/* Size Checklist */}
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-2">
                      Select Sizes to Move (Leave empty to move all)
                    </label>
                    <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      {allSizes.map((size: { size: string; quantity: number }) => (
                        <label
                          key={size.size}
                          className="flex items-center space-x-2 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSizes.includes(size)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSizes([...selectedSizes, size]);
                              } else {
                                setSelectedSizes(
                                  selectedSizes.filter((s) => s !== size)
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-gray-700">{size.size}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {data?.isBigPrice && !changedCategory.bigPrice && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Big Size Price Modifier</label>
                      <Input
                        placeholder="Set big price"
                        disabled={changedCategory?.bigPrice}
                        type="number"
                        min="0"
                        onChange={(e) => setBigPrice(e.target.value ? parseFloat(e.target.value) : 0)}
                        className="border-gray-300 bg-white"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 block">Generated Migration Code</label>
                    <div className="flex gap-2">
                      <Input
                        disabled
                        className="border-gray-300 bg-gray-50"
                        placeholder="Generate the code"
                        value={generatedCode.toUpperCase()}
                      />
                      <Button
                        type="button"
                        onClick={CodeGenerator}
                        disabled={generatorLoader}
                        variant="outline"
                        className="text-xs border-gray-300 h-9 font-semibold flex items-center justify-center gap-1.5"
                      >
                        {generatorLoader && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleCategoryChange}
                      disabled={isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-sm"
                    >
                      Save Migration
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </>
  );
};

export default KurtiUpdate;
