"use client";
import * as z from "zod";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { CheckIcon, ChevronsUpDownIcon, Loader2, Trash2, Plus } from "lucide-react";
import { useRef, useState, useTransition, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KurtiSchema } from "@/src/schemas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { DialogDemo } from "@/src/components/dialog-demo";
import { toast } from "sonner";
import { kurtiAddition } from "@/src/actions/kurti";
import { useRouter } from "next/navigation";
import { Category, Party, UserRole } from "@prisma/client";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import PageLoader from "@/src/components/loader";
import DesignUpload from "../_components/upload/deisgnUpload";
import React from "react";
import { v4 as uuidv4 } from "uuid";
import { updateTotalItem, updateTotalPiece } from "@/src/actions/category";
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

interface SizeInput {
  size: string;
  quantity: number;
}

interface ColorVariantInput {
  color: string;
  images: any[];
  sizes: SizeInput[];
}

interface ProductDesignInput {
  id: string;
  name: string;
  description: string;
  fabric: string;
  fitShape: string;
  length: string;
  neck: string;
  occasion: string;
  pattern: string;
  sleeve: string;
  stitchType: string;
  variants: ColorVariantInput[];
}

const BulkUploadPage = () => {
  const [isPending, startTransition] = useTransition();
  const [partyLoader, setPartyLoader] = useState(true);
  const [categoryLoader, setCategoryLoader] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [colors, setColors] = useState<any[]>([]);
  const [colorsLoader, setColorsLoader] = useState(true);
  const router = useRouter();

  // Dynamic colors list addition form state
  const [newColorName, setNewColorName] = useState("");

  const [productDesigns, setProductDesigns] = useState<ProductDesignInput[]>([
    {
      id: uuidv4(),
      name: "",
      description: "",
      fabric: "",
      fitShape: "",
      length: "",
      neck: "",
      occasion: "",
      pattern: "",
      sleeve: "",
      stitchType: "",
      variants: [
        {
          color: "",
          images: [],
          sizes: [
            { size: "XS", quantity: 0 },
            { size: "S", quantity: 0 },
            { size: "M", quantity: 0 },
            { size: "L", quantity: 0 },
            { size: "XL", quantity: 0 },
            { size: "XXL", quantity: 0 },
            { size: "3XL", quantity: 0 },
            { size: "4XL", quantity: 0 },
            { size: "5XL", quantity: 0 },
            { size: "6XL", quantity: 0 },
            { size: "7XL", quantity: 0 },
            { size: "8XL", quantity: 0 },
            { size: "9XL", quantity: 0 },
            { size: "10XL", quantity: 0 },
          ],
        },
      ],
    },
  ]);

  const handleDesignFieldChange = (dIdx: number, field: keyof ProductDesignInput, value: any) => {
    const updated = [...productDesigns];
    updated[dIdx] = { ...updated[dIdx], [field]: value };
    setProductDesigns(updated);
  };

  const handleVariantFieldChange = (dIdx: number, vIdx: number, field: keyof ColorVariantInput, value: any) => {
    const updated = [...productDesigns];
    updated[dIdx].variants[vIdx] = { ...updated[dIdx].variants[vIdx], [field]: value };
    setProductDesigns(updated);
  };

  const handleVariantSizeQtyChange = (dIdx: number, vIdx: number, sIdx: number, qty: number) => {
    const updated = [...productDesigns];
    updated[dIdx].variants[vIdx].sizes[sIdx].quantity = qty;
    setProductDesigns(updated);
  };

  const addColorVariant = (dIdx: number) => {
    const updated = [...productDesigns];
    const design = updated[dIdx];
    
    // Copy sizes from the last variant if it exists, otherwise use defaults
    let initialSizes = [
      { size: "XS", quantity: 0 },
      { size: "S", quantity: 0 },
      { size: "M", quantity: 0 },
      { size: "L", quantity: 0 },
      { size: "XL", quantity: 0 },
      { size: "XXL", quantity: 0 },
      { size: "3XL", quantity: 0 },
      { size: "4XL", quantity: 0 },
      { size: "5XL", quantity: 0 },
      { size: "6XL", quantity: 0 },
      { size: "7XL", quantity: 0 },
      { size: "8XL", quantity: 0 },
      { size: "9XL", quantity: 0 },
      { size: "10XL", quantity: 0 },
    ];
    
    if (design.variants.length > 0) {
      const lastVariant = design.variants[design.variants.length - 1];
      initialSizes = lastVariant.sizes.map(s => ({
        size: s.size,
        quantity: s.quantity
      }));
    }

    updated[dIdx].variants.push({
      color: "",
      images: [],
      sizes: initialSizes,
    });
    setProductDesigns(updated);
  };

  const copySizesFromPreviousVariant = (dIdx: number, vIdx: number) => {
    if (vIdx === 0) return;
    const updated = [...productDesigns];
    const previousVariant = updated[dIdx].variants[vIdx - 1];
    updated[dIdx].variants[vIdx].sizes = previousVariant.sizes.map(s => ({
      size: s.size,
      quantity: s.quantity
    }));
    setProductDesigns(updated);
    toast.success("Copied sizes from previous variant");
  };

  const removeColorVariant = (dIdx: number, vIdx: number) => {
    const updated = [...productDesigns];
    if (updated[dIdx].variants.length <= 1) {
      toast.error("Each product design must have at least one color variant");
      return;
    }
    updated[dIdx].variants.splice(vIdx, 1);
    setProductDesigns(updated);
  };

  const addProductDesign = () => {
    setProductDesigns([
      ...productDesigns,
      {
        id: uuidv4(),
        name: "",
        description: "",
        fabric: "",
        fitShape: "",
        length: "",
        neck: "",
        occasion: "",
        pattern: "",
        sleeve: "",
        stitchType: "",
        variants: [
          {
            color: "",
            images: [],
            sizes: [
              { size: "XS", quantity: 0 },
              { size: "S", quantity: 0 },
              { size: "M", quantity: 0 },
              { size: "L", quantity: 0 },
              { size: "XL", quantity: 0 },
              { size: "XXL", quantity: 0 },
              { size: "3XL", quantity: 0 },
              { size: "4XL", quantity: 0 },
              { size: "5XL", quantity: 0 },
              { size: "6XL", quantity: 0 },
              { size: "7XL", quantity: 0 },
              { size: "8XL", quantity: 0 },
              { size: "9XL", quantity: 0 },
              { size: "10XL", quantity: 0 },
            ],
          },
        ],
      },
    ]);
  };

  const removeProductDesign = (dIdx: number) => {
    if (productDesigns.length <= 1) {
      toast.error("You must have at least one product design");
      return;
    }
    const updated = [...productDesigns];
    updated.splice(dIdx, 1);
    setProductDesigns(updated);
  };

  useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch("/api/party");
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const sorted = json.data.sort((a: any, b: any) =>
            a.name.localeCompare(b.name)
          );
          setParties(sorted);
        }
      } catch (err) {
        console.error("Failed to load parties", err);
      } finally {
        setPartyLoader(false);
      }
    };
    fetchParties();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const query = new URLSearchParams({ page: "1", limit: "500" });
        const res = await fetch(`/api/category?${query.toString()}`);
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setCategories(json.data);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        setCategoryLoader(false);
      }
    };
    fetchCategories();
  }, []);

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
      } finally {
        setColorsLoader(false);
      }
    };
    fetchColors();
  }, []);

  const form = useForm({
    defaultValues: {
      party: "",
      sellingPrice: "0",
      actualPrice: "0",
      customerPrice: "0",
      category: "",
      weight: undefined,
    },
  });

  const handleBulkFormSubmit = async () => {
    const formValues = form.getValues();
    if (!formValues.category) {
      toast.error("Please select a category");
      return;
    }
    if (!formValues.party) {
      toast.error("Please select a party");
      return;
    }
    if (!formValues.sellingPrice || !formValues.actualPrice) {
      toast.error("Please fill in price details");
      return;
    }

    // Validate product designs and variants
    for (let dIdx = 0; dIdx < productDesigns.length; dIdx++) {
      const design = productDesigns[dIdx];
      if (!design.name || !design.name.trim()) {
        toast.error(`Please enter a Product Name for Design #${dIdx + 1}`);
        return;
      }
      if (design.variants.length === 0) {
        toast.error(`Design "${design.name}" must have at least one color variant.`);
        return;
      }

      for (let vIdx = 0; vIdx < design.variants.length; vIdx++) {
        const variant = design.variants[vIdx];
        if (!variant.color) {
          toast.error(`Please select a color for Variant #${vIdx + 1} under "${design.name}".`);
          return;
        }
        if (variant.images.length === 0) {
          toast.error(`Please upload at least one image for Variant "${variant.color}" under "${design.name}".`);
          return;
        }
        const totalQty = variant.sizes.reduce((sum, s) => sum + Number(s.quantity || 0), 0);
        if (totalQty <= 0) {
          toast.error(`Please add at least one size quantity for Variant "${variant.color}" under "${design.name}".`);
          return;
        }
      }
    }

    setBulkProcessing(true);

    try {
      // 1. Calculate total variants to generate codes
      let totalVariants = 0;
      productDesigns.forEach((d) => {
        totalVariants += d.variants.length;
      });

      // 2. Fetch start code from API
      const response = await fetch(`/api/kurti/generateCode?cat=${formValues.category}`);
      const result = await response.json();
      const prefix = result.code.substring(0, 3);
      const codeNumber = result.code.substring(3);
      const startingNum = parseInt(codeNumber);

      let currentGlobalIndex = 0;
      const uploadPromises: Promise<any>[] = [];
      const savedCodesForBarcode: { code: string; sizes: { size: string; quantity: number }[] }[] = [];

      // 3. Map designs and variants to payloads
      productDesigns.forEach((design) => {
        const firstVariantIndex = currentGlobalIndex;
        // The parentCode for all variants of this design will be the code of its first variant
        const parentCode = `${prefix}${(startingNum + firstVariantIndex).toString().padStart(4, "0")}`;

        design.variants.forEach((variant) => {
          const itemIndex = currentGlobalIndex;
          currentGlobalIndex++;

          const itemCode = `${prefix}${(startingNum + itemIndex).toString().padStart(4, "0")}`;
          const totalPieces = variant.sizes.reduce((sum, s) => sum + Number(s.quantity || 0), 0);

          const designData = {
            images: variant.images.map((img) => ({
              url: img.url,
              id: uuidv4(),
              is_hidden: false,
              path: img.path,
            })),
            sizes: variant.sizes.map((s) => ({
              size: s.size,
              quantity: Number(s.quantity || 0),
            })),
            party: formValues.party,
            sellingPrice: formValues.sellingPrice,
            actualPrice: formValues.actualPrice,
            customerPrice: formValues.customerPrice,
            category: formValues.category?.toUpperCase(),
            code: itemCode,
            countOfPiece: totalPieces,
            weight: formValues.weight ? Number(formValues.weight) : undefined,
            name: design.name,
            description: design.description,
            fabric: design.fabric || undefined,
            fitShape: design.fitShape || undefined,
            length: design.length || undefined,
            neck: design.neck || undefined,
            occasion: design.occasion || undefined,
            pattern: design.pattern || undefined,
            sleeve: design.sleeve || undefined,
            stitchType: design.stitchType || undefined,
            color: variant.color,
            parentCode: parentCode,
          };

          uploadPromises.push(kurtiAddition(designData));
          savedCodesForBarcode.push({
            code: itemCode,
            sizes: variant.sizes.map((s) => ({
              size: s.size,
              quantity: Number(s.quantity || 0),
            })),
          });
        });
      });

      // 4. Save everything to DB
      const results = await Promise.all(uploadPromises);
      const successful = results.filter((r) => r.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully uploaded ${successful} color variants!`);
        if (failed > 0) {
          toast.error(`${failed} variants failed to upload.`);
        }

        // 5. Download barcodes
        for (const item of savedCodesForBarcode) {
          try {
            const obj = JSON.stringify(item.sizes);
            const res = await axios.get(
              `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${item.code}`,
              { responseType: "blob" }
            );
            const url = window.URL.createObjectURL(res.data);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${item.code}_barcodes.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
          } catch (err) {
            console.error("Barcode download failed for", item.code, err);
          }
        }

        // Update counts in category state
        await updateTotalItem(formValues.category?.toUpperCase(), totalVariants);
        const totalPiecesCount = productDesigns.reduce((sum, d) =>
          sum + d.variants.reduce((vSum, v) => vSum + v.sizes.reduce((sSum, s) => sSum + Number(s.quantity || 0), 0), 0)
        , 0);
        await updateTotalPiece(formValues.category?.toUpperCase(), totalPiecesCount - totalVariants);

        // Reset state
        setProductDesigns([
          {
            id: uuidv4(),
            name: "",
            description: "",
            fabric: "",
            fitShape: "",
            length: "",
            neck: "",
            occasion: "",
            pattern: "",
            sleeve: "",
            stitchType: "",
            variants: [
              {
                color: "",
                images: [],
                sizes: [
                  { size: "XS", quantity: 0 },
                  { size: "S", quantity: 0 },
                  { size: "M", quantity: 0 },
                  { size: "L", quantity: 0 },
                  { size: "XL", quantity: 0 },
                  { size: "XXL", quantity: 0 },
                  { size: "3XL", quantity: 0 },
                  { size: "4XL", quantity: 0 },
                  { size: "5XL", quantity: 0 },
                  { size: "6XL", quantity: 0 },
                  { size: "7XL", quantity: 0 },
                  { size: "8XL", quantity: 0 },
                  { size: "9XL", quantity: 0 },
                  { size: "10XL", quantity: 0 },
                ],
              },
            ],
          },
        ]);
        form.reset();
        router.refresh();
      } else {
        toast.error("Failed to upload products.");
      }
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error("Bulk upload failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <>
      <PageLoader loading={partyLoader || categoryLoader || colorsLoader} />
      {partyLoader || categoryLoader || colorsLoader ? (
        ""
      ) : (
        <Card className="rounded-none w-full h-full border-none shadow-none text-left bg-gray-50/50">
          <CardHeader className="bg-white border-b py-4">
            <h1 className="text-2xl font-bold text-gray-800 text-center">
              📦 Catalog & Variants Bulk Upload (Meesho Style)
            </h1>
            <p className="text-sm text-gray-500 text-center mt-1">
              Group your colors under unique product designs and configure their stocks individually.
            </p>
          </CardHeader>
          <CardContent className="p-6 max-w-6xl mx-auto space-y-6">
            
            {/* 1. Shared Category & Pricing details */}
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="border-b py-3 bg-gray-50">
                <h2 className="text-md font-semibold text-gray-800">1. Category, Supplier & Pricing Details (Shared)</h2>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Category</label>
                  <Select
                    value={form.watch("category")}
                    onValueChange={(val) => form.setValue("category", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-200">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Supplier / Party</label>
                  <Select
                    value={form.watch("party")}
                    onValueChange={(val) => form.setValue("party", val)}
                  >
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white border border-gray-200">
                      {parties.map((pty) => (
                        <SelectItem key={pty.id} value={pty.name}>
                          {pty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Weight (grams)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 250"
                    value={form.watch("weight") || ""}
                    onChange={(e) => form.setValue("weight", e.target.value ? parseInt(e.target.value) : undefined as any)}
                    className="border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Selling Price (Reseller)</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.watch("sellingPrice") || ""}
                    onChange={(e) => form.setValue("sellingPrice", e.target.value)}
                    className="border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Actual Purchase Price</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.watch("actualPrice") || ""}
                    onChange={(e) => form.setValue("actualPrice", e.target.value)}
                    className="border-gray-300 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Customer Showcase Price</label>
                  <Input
                    type="number"
                    min="0"
                    value={form.watch("customerPrice") || ""}
                    onChange={(e) => form.setValue("customerPrice", e.target.value)}
                    className="border-gray-300 bg-white"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Product Catalogs List */}
            <div className="space-y-6">
              {productDesigns.map((design, dIdx) => (
                <Card key={design.id} className="shadow-sm border-gray-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                  
                  <CardHeader className="border-b py-3 bg-gray-50 flex flex-row items-center justify-between px-6">
                    <h2 className="text-md font-bold text-gray-800">
                      Product Design #{dIdx + 1}
                    </h2>
                    {productDesigns.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProductDesign(dIdx)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 font-medium"
                      >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Delete Design
                      </Button>
                    )}
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Design general specs */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">General Specifications</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-3">
                          <label className="text-xs font-bold text-gray-600 block mb-1">Product Title / Name</label>
                          <Input
                            value={design.name}
                            onChange={(e) => handleDesignFieldChange(dIdx, "name", e.target.value)}
                            placeholder="e.g. Designer Embroidered Rayon Kurta Set"
                            className="border-gray-300 bg-white"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="text-xs font-bold text-gray-600 block mb-1">Description</label>
                          <textarea
                            value={design.description}
                            onChange={(e) => handleDesignFieldChange(dIdx, "description", e.target.value)}
                            placeholder="Describe fabrics, size charts, or styling tips..."
                            className="w-full min-h-[80px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Fabric</label>
                          <Select
                            value={design.fabric}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "fabric", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Fabric" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {FABRICS.map((fab) => (
                                <SelectItem key={fab} value={fab}>
                                  {fab}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Fit / Shape</label>
                          <Select
                            value={design.fitShape}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "fitShape", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Fit" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {FIT_SHAPES.map((fit) => (
                                <SelectItem key={fit} value={fit}>
                                  {fit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Length</label>
                          <Select
                            value={design.length}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "length", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Length" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {LENGTHS.map((len) => (
                                <SelectItem key={len} value={len}>
                                  {len}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Neck</label>
                          <Select
                            value={design.neck}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "neck", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Neck" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {NECKS.map((nk) => (
                                <SelectItem key={nk} value={nk}>
                                  {nk}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Occasion</label>
                          <Select
                            value={design.occasion}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "occasion", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Occasion" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {OCCASIONS.map((occ) => (
                                <SelectItem key={occ} value={occ}>
                                  {occ}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Pattern</label>
                          <Select
                            value={design.pattern}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "pattern", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Pattern" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {PATTERNS.map((pat) => (
                                <SelectItem key={pat} value={pat}>
                                  {pat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Sleeve</label>
                          <Select
                            value={design.sleeve}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "sleeve", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Sleeve" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {SLEEVES.map((slv) => (
                                <SelectItem key={slv} value={slv}>
                                  {slv}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-gray-600 block mb-1">Stitch Type</label>
                          <Select
                            value={design.stitchType}
                            onValueChange={(val) => handleDesignFieldChange(dIdx, "stitchType", val)}
                          >
                            <SelectTrigger className="bg-white border-gray-300">
                              <SelectValue placeholder="Select Stitch Type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-50 overflow-y-auto bg-white border border-gray-200">
                              {STITCH_TYPES.map((st) => (
                                <SelectItem key={st} value={st}>
                                  {st}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Color variants for this design */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Color Variants</h3>
                      
                      <div className="space-y-6">
                        {design.variants.map((variant, vIdx) => (
                          <div key={vIdx} className="bg-white border border-gray-200 rounded-lg p-4 relative shadow-sm">
                            
                            <div className="flex items-center justify-between border-b pb-3 mb-4">
                              <h4 className="text-sm font-bold text-gray-700">Variant #{vIdx + 1}</h4>
                              {design.variants.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeColorVariant(dIdx, vIdx)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 font-medium"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                                  Remove Variant
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                              
                              {/* Color Select */}
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-600 block">Select Color</label>
                                <div className="flex items-center gap-1.5 w-full">
                                  <div className="flex-1">
                                    <Select
                                      value={variant.color}
                                      onValueChange={(val) => handleVariantFieldChange(dIdx, vIdx, "color", val)}
                                    >
                                      <SelectTrigger className="w-full bg-white border-gray-300">
                                        <SelectValue placeholder="Select Color" />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-40 overflow-y-auto bg-white border border-gray-200">
                                        {colors.map((c) => (
                                          <SelectItem key={c.id} value={c.normalizedLowerCase}>
                                            {c.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <DialogDemo
                                    dialogTrigger="+"
                                    bgColor="outline"
                                    dialogTitle="Add New Color"
                                    dialogDescription="Enter color name and click add color"
                                  >
                                    {(closeDialog) => (
                                      <div className="space-y-4 p-1 text-left">
                                        <div>
                                          <label className="text-xs font-semibold text-gray-700">Color Name</label>
                                          <Input
                                            value={newColorName}
                                            onChange={(e) => setNewColorName(e.target.value)}
                                            placeholder="e.g. Navy Blue"
                                            className="mt-1 border-gray-300"
                                          />
                                        </div>
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
                                                handleVariantFieldChange(dIdx, vIdx, "color", json.data.normalizedLowerCase);
                                                setNewColorName("");
                                                closeDialog();
                                              } else {
                                                toast.error(json.error || "Failed to add color");
                                              }
                                            } catch (err) {
                                              toast.error("Failed to add color");
                                            }
                                          }}
                                        >
                                          Add Color
                                        </Button>
                                      </div>
                                    )}
                                  </DialogDemo>
                                </div>
                              </div>

                              {/* Image Upload for this variant */}
                              <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-gray-600 block">Upload Images for this Color</label>
                                <DesignUpload
                                  images={variant.images}
                                  onImageChange={(newImages) => handleVariantFieldChange(dIdx, vIdx, "images", newImages)}
                                />
                              </div>

                              {/* Size Stocks for this variant */}
                              <div className="md:col-span-3 space-y-2 border-t pt-3 mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-xs font-bold text-gray-600 block">Inventory stock quantities per size</label>
                                  {vIdx > 0 && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => copySizesFromPreviousVariant(dIdx, vIdx)}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-6 px-2 text-[10px] font-semibold border-blue-200"
                                    >
                                      Same as last variant
                                    </Button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                  {variant.sizes.map((s, sIdx) => (
                                    <div key={s.size} className="flex flex-col items-center border border-gray-200 rounded p-1.5 bg-white">
                                      <span className="text-xs font-bold text-gray-700">{s.size}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={s.quantity || ""}
                                        onChange={(e) => {
                                          const val = e.target.value ? parseInt(e.target.value) : 0;
                                          handleVariantSizeQtyChange(dIdx, vIdx, sIdx, val);
                                        }}
                                        className="w-14 h-7 text-xs border rounded text-center mt-1 focus:ring-1 focus:ring-blue-500 outline-none"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Color Variant Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addColorVariant(dIdx)}
                        className="w-full border-dashed border-gray-300 text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-1.5 py-3 h-auto mt-4 font-semibold"
                      >
                        <Plus className="w-4 h-4" />
                        Add Color Variant for "{design.name || `Design #${dIdx + 1}`}"
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add Design Catalog Button */}
            <Button
              type="button"
              variant="outline"
              onClick={addProductDesign}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 border-gray-300 flex items-center justify-center gap-1.5 py-4 h-auto text-base font-semibold shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Add Another Product Design
            </Button>

            {/* Submit Barcodes & Upload */}
            <div className="pt-4">
              <Button
                type="button"
                disabled={isPending || bulkProcessing}
                onClick={handleBulkFormSubmit}
                className="w-full py-6 h-auto text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center justify-center gap-2"
              >
                {isPending || bulkProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  ""
                )}
                Upload All Products & Download Barcodes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

const BulkUploadHelper = () => {
  return (
    <>
      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
        <BulkUploadPage />
      </RoleGateForComponent>
      <RoleGateForComponent allowedRole={[UserRole.SELLER, UserRole.RESELLER]}>
        <NotAllowedPage />
      </RoleGateForComponent>
    </>
  );
};

export default BulkUploadHelper;
