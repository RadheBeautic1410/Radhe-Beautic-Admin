"use client";
import * as z from "zod";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { CheckIcon, ChevronsUpDownIcon, Loader2 } from "lucide-react";
import { useRef, useState, useTransition, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
  FormDescription,
} from "@/src/components/ui/form";
import { KurtiSchema, partyAddSchema } from "@/src/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { DialogDemo } from "@/src/components/dialog-demo";
import { partyAddition } from "@/src/actions/party";
import { toast } from "sonner";
import { kurtiAddition } from "@/src/actions/kurti";
import { useRouter } from "next/navigation";
import { UserRole } from "@prisma/client";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import PageLoader from "@/src/components/loader";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import { AddSizeForm } from "../_components/dynamicFields/sizes";
import ImageUpload2, {
  ImageUploadRef,
} from "../_components/upload/imageUpload2";
import React from "react";
import { Party } from "@prisma/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
type Category = {
  id: string;
  name: string;
  normalizedLowerCase: string;
  type: string;
};

// Extended schema for bulk upload
const BulkKurtiSchema = z.object({
  designs: z
    .array(
      z.object({
        images: z.array(z.any()).min(1, "At least one image required"),
        code: z.string().min(1, "Code is required"),
        sizes: z
          .array(
            z.object({
              size: z.string(),
              quantity: z.number().min(1),
            })
          )
          .min(1, "At least one size required"),
        countOfPiece: z.number().min(1),
      })
    )
    .min(1, "At least one design required"),
  party: z.string().min(1, "Party is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  actualPrice: z.string().min(1, "Actual price is required"),
  category: z.string().min(1, "Category is required"),
});

interface party {
  id: string;
  name: string;
  normalizedLowerCase: string;
}

interface category {
  id: string;
  name: string;
  type: string;
  normalizedLowerCase: string;
}

interface Size {
  size: string;
  quantity: number;
}

interface Design {
  images: any[];
  code: string;
  sizes: Size[];
  countOfPiece: number;
}

const BulkUploadPage = () => {
  const [isPending, startTransition] = useTransition();
  const imageUploadRef = useRef<ImageUploadRef>(null);

  const [party, setParty] = useState<party[]>([]);
  const [partyLoader, setPartyLoader] = useState(true);
  const [categoryLoader, setCategoryLoader] = useState(true);
  const [category, setCategory] = useState<category[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [isPendings, setIsPending] = React.useState(false); // Added to fix error

  const [designs, setDesigns] = useState<Design[]>([]);
  const [generatorLoader, setGeneratorLoader] = useState(false);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [barcodeDownloading, setBarcodeDownloading] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [categories, setCategories] = React.useState<Category[]>([]);
  // Removed duplicate isPending declaration
  const [parties, setParties] = React.useState<Party[]>([]);
  const [selectedParty, setSelectedParty] = React.useState("");
  const [openParty, setOpenParty] = React.useState(false);
  React.useEffect(() => {
    const fetchParties = async () => {
      try {
        const res = await fetch("/api/party");
        const json = await res.json();

        if (Array.isArray(json.data)) {
          const normalizedParties = json.data.map((p: any) => ({
            ...p,
            normalizedLowerCase: p.name?.toLowerCase().replace(/\s+/g, ""),
          }));
          setParties(normalizedParties);
        } else {
          setParties([]);
        }
      } catch (err) {
        console.error("Failed to fetch parties", err);
        setParties([]);
      }
    };

    fetchParties();
  }, []);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/category");
        const json = await res.json();

        if (Array.isArray(json.data)) {
          const normalizedData = json.data.map((cat: Category) => ({
            ...cat,
            normalizedLowerCase: cat.name?.toLowerCase().replace(/\s+/g, ""),
          }));
          setCategories(normalizedData);
        } else {
          console.error("Invalid categories format:", json);
          setCategories([]);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  const onAddSize = (sizes: Size[]) => {
    setSizes(sizes);
  };

  // Generate designs from uploaded images
  const generateDesignsFromImages = async () => {
    if (images.length === 0) {
      toast.error("Please upload images first");
      return;
    }

    if (sizes.length === 0) {
      toast.error("Please add sizes first");
      return;
    }

    const categorySelected = form.getValues().category;
    if (!categorySelected) {
      toast.error("Please select category first");
      return;
    }

    setBulkProcessing(true);
    setGeneratorLoader(true);

    try {
      const newDesigns: Design[] = [];
      const response = await fetch(
        `/api/kurti/generateCode?cat=${categorySelected}`
      );
      const result = await response.json();
      // Process each image as a separate design
      // Extract prefix and number from result.code
      const match = result.code.match(/^([A-Z]+)(\d+)$/);
      if (!match) {
        throw new Error("Invalid code format from API");
      }
      const prefix = match[1]; // e.g., 'CR'
      let codeNumber = parseInt(match[2]); // e.g., 70011

      for (let i = 0; i < images.length; i++) {
        // Calculate total pieces for this design
        let totalPieces = 0;
        sizes.forEach((size) => {
          totalPieces += size.quantity;
        });

        // Generate new code with increment
        const newCode = `${prefix}${(codeNumber + i)
          .toString()
          .padStart(5, "0")}`;

        newDesigns.push({
          images: [images[i]], // Each design gets one image
          code: newCode,
          sizes: [...sizes], // Copy of sizes for each design
          countOfPiece: totalPieces,
        });
      }

      setDesigns(newDesigns);
      toast.success(`Generated ${newDesigns.length} designs successfully!`);
    } catch (error) {
      console.error("Error generating designs:", error);
      toast.error("Failed to generate designs");
    } finally {
      setGeneratorLoader(false);
      setBulkProcessing(false);
    }
  };

  const handleBulkBarcodeDownload = async () => {
    if (designs.length === 0) {
      toast.error("No designs to generate barcodes!");
      return;
    }

    try {
      setBarcodeDownloading(true);

      for (const design of designs) {
        if (!design.sizes || design.sizes.length === 0 || !design.code) {
          console.warn("Skipping invalid design", design);
          continue;
        }

        const obj = JSON.stringify(design.sizes);
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${design.code}`,
          {
            responseType: "blob",
          }
        );

        const blob = res.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${design.code}.pdf`; // unique filename per design
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      toast.success("All barcode PDFs downloaded!");
    } catch (e: any) {
      console.error("Error downloading barcodes:", e.message);
      toast.error("Something went wrong while downloading barcodes.");
    } finally {
      setBarcodeDownloading(false);
    }
  };

  // Handle bulk barcode download
  //   const handleBulkBarcodeDownload = async () => {
  //     if (designs.length === 0) {
  //       toast.error("No designs to download barcodes for");
  //       return;
  //     }

  //     setBarcodeDownloading(true);
  //     try {
  //       // Create bulk barcode data
  //       const barcodeData = designs.map(design => ({
  //         id: design.code,
  //         sizes: design.sizes
  //       }));

  //       const res = await axios.get(
  //         `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-bulk-pdf?data=${JSON.stringify(barcodeData)}`,
  //         {
  //           responseType: "blob",
  //         }
  //       );

  //       const blob = res.data;
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.href = url;
  //       a.download = `bulk-barcodes-${new Date().getTime()}.pdf`;
  //       document.body.appendChild(a);
  //       a.click();
  //       a.remove();
  //       window.URL.revokeObjectURL(url);
  //     } catch (e: any) {
  //       console.log(e.message);
  //       toast.error("Failed to download barcodes");
  //     } finally {
  //       setBarcodeDownloading(false);
  //     }
  //   };

  const handleImageChange = (data: any) => {
    setImages([...data]);
    // Reset designs when images change
    setDesigns([]);
  };
  // Handle bulk form submission
  const handleBulkFormSubmit = async () => {
    if (designs.length === 0) {
      toast.error("Please generate designs first");
      return;
    }

    const formValues = form.getValues();
    setBulkProcessing(true);

    try {
      // Submit each design individually
      const promises = designs.map((design) => {
        const designData = {
          images: design.images,
          sizes: design.sizes,
          party: formValues.party,
          sellingPrice: formValues.sellingPrice,
          actualPrice: formValues.actualPrice,
          category: formValues.category,
          code: design.code,
          countOfPiece: design.countOfPiece,
        };
        return kurtiAddition(designData);
      });

      const results = await Promise.all(promises);

      // Check if all submissions were successful
      const successful = results.filter((result) => result.success).length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(`Successfully uploaded ${successful} designs!`);
        if (failed > 0) {
          toast.error(`${failed} designs failed to upload`);
        }

        // Download barcodes for successful uploads
        await handleBulkBarcodeDownload();

        // Reset form
        form.reset();
        setSizes([]);
        setDesigns([]);
        setImages([]);
        if (imageUploadRef.current) {
          imageUploadRef.current.reset();
        }
        router.refresh();
      } else {
        toast.error("All designs failed to upload");
      }
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Bulk upload failed");
    } finally {
      setBulkProcessing(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/party");
        const result = await response.json();
        const sortedParties = (result.data || []).sort((a: party, b: party) =>
          a.name.localeCompare(b.name)
        );
        setParty(sortedParties);
      } catch (error) {
        console.error("Error fetching parties:", error);
      } finally {
        setPartyLoader(false);
      }

      try {
        const response = await fetch("/api/category");
        const result = await response.json();
        const sortedCategory = (result.data || []).sort(
          (a: category, b: category) => a.name.localeCompare(b.name)
        );
        setCategory(sortedCategory);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setCategoryLoader(false);
      }
    };
    fetchData();
  }, []);

  const form = useForm<z.infer<typeof KurtiSchema>>({
    resolver: zodResolver(KurtiSchema),
    defaultValues: {
      images: [],
      sizes: [],
      party: "",
      sellingPrice: "0",
      actualPrice: "0",
      category: "",
      code: "",
      countOfPiece: 0,
    },
  });

  const formParty = useForm({
    defaultValues: {
      name: "",
    },
  });

  return (
    <>
      <PageLoader loading={partyLoader || categoryLoader} />
      {partyLoader || categoryLoader ? (
        ""
      ) : (
        <Card className="w-[90%] grid justify-center mx-auto my-10">
          <CardHeader>
            <p className="text-2xl font-semibold text-center">
              ⬆️ UPLOAD ({images.length} Images)
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <ImageUpload2
              ref={imageUploadRef}
              images={images}
              onImageChange={handleImageChange}
            />

            <div className="text-left w-[100%] mt-6">
              <Form {...form}>
                <form className="space-y-8 w-full">
                  {/* Category Selection */}
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Category</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {field.value
                                  ? categories.find(
                                      (c) =>
                                        c.normalizedLowerCase === field.value
                                    )?.name || "Select category"
                                  : "Select category"}
                                <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto">
                              <Command>
                                <CommandInput placeholder="Search category..." />
                                <CommandEmpty>No category found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandList>
                                    {categories.map((category, idx) => (
                                      <CommandItem
                                        key={idx}
                                        value={category.name}
                                        onSelect={(currentValue) => {
                                          const selected = categories.find(
                                            (c) => c.name === currentValue
                                          );
                                          if (selected)
                                            field.onChange(
                                              selected.normalizedLowerCase
                                            );
                                          setOpen(false);
                                        }}
                                      >
                                        <CheckIcon
                                          className={`mr-2 h-4 w-4 ${
                                            field.value ===
                                            category.normalizedLowerCase
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        <span className="truncate">
                                          {category.name}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <DialogDemo
                            dialogTrigger="Add Category"
                            dialogTitle="Add New Category"
                            dialogDescription="Fill out the form to add a new category."
                          >
                            {(closeDialog) => (
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget
                                  );
                                  const name = formData
                                    .get("name")
                                    ?.toString()
                                    .trim();
                                  const type = formData
                                    .get("type")
                                    ?.toString()
                                    .trim();
                                  if (!name)
                                    return alert("Category name is required");
                                  try {
                                    setIsPending(true);
                                    const res = await fetch(
                                      "/api/category/add",
                                      {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({ name, type }),
                                      }
                                    );
                                    const json = await res.json();
                                    if (!res.ok)
                                      throw new Error(
                                        json.error || "Failed to add category"
                                      );
                                    alert("Category added!");
                                    const updated = await fetch(
                                      "/api/category"
                                    );
                                    const { data } = await updated.json();
                                    setCategories(data || []);
                                    closeDialog();
                                  } catch (err) {
                                    // alert(err.message);
                                  } finally {
                                    setIsPending(false);
                                  }
                                }}
                                className="space-y-4"
                              >
                                <Input
                                  name="name"
                                  placeholder="e.g. Chocolate"
                                />
                                <Input name="type" placeholder="e.g. Food" />
                                <Button type="submit" disabled={isPending}>
                                  {isPending ? "Adding..." : "Add Category"}
                                </Button>
                              </form>
                            )}
                          </DialogDemo>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Party Field */}
                  <FormField
                    control={form.control}
                    name="party"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Party</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <Popover open={openParty} onOpenChange={setOpenParty}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between"
                              >
                                {parties.find(
                                  (p) => p.normalizedLowerCase === field.value
                                )?.name || "Select party"}
                                <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 max-h-60 overflow-y-auto">
                              <Command>
                                <CommandInput placeholder="Search party..." />
                                <CommandEmpty>No party found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandList>
                                    {parties.map((party) => (
                                      <CommandItem
                                        key={party.id}
                                        value={party.name}
                                        onSelect={() => {
                                          field.onChange(
                                            party.normalizedLowerCase
                                          );
                                          setOpenParty(false);
                                        }}
                                      >
                                        <CheckIcon
                                          className={`mr-2 h-4 w-4 ${
                                            field.value ===
                                            party.normalizedLowerCase
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                        <span className="truncate">
                                          {party.name}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <DialogDemo
                            dialogTrigger="Add Party"
                            dialogTitle="Add New Party"
                            dialogDescription="Fill out the form to add a new party."
                          >
                            {(closeDialog) => (
                              <form
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget
                                  );
                                  const name = formData
                                    .get("name")
                                    ?.toString()
                                    .trim();
                                  const type = formData
                                    .get("type")
                                    ?.toString()
                                    .trim();
                                  if (!name)
                                    return alert("Party name is required");
                                  try {
                                    setIsPending(true);
                                    const res = await fetch("/api/party/add", {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                      },
                                      body: JSON.stringify({ name, type }),
                                    });
                                    const json = await res.json();
                                    if (!res.ok)
                                      throw new Error(
                                        json.error || "Failed to add party"
                                      );
                                    alert("Party added!");
                                    const updated = await fetch("/api/party");
                                    const { data } = await updated.json();
                                    setParties(data || []);
                                    closeDialog();
                                  } catch (err) {
                                    // alert(err.message);
                                  } finally {
                                    setIsPending(false);
                                  }
                                }}
                                className="space-y-4"
                              >
                                <Input
                                  name="name"
                                  placeholder="e.g. Distributor A"
                                />
                                <Input name="type" placeholder="e.g. Retail" />
                                <Button type="submit" disabled={isPending}>
                                  {isPending ? "Adding..." : "Add Party"}
                                </Button>
                              </form>
                            )}
                          </DialogDemo>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Prices */}
                  <div className="flex flex-col sm:flex-row gap-6">
                    <FormField
                      control={form.control}
                      name="actualPrice"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Actual Price</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter price per piece.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sellingPrice"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormLabel>Selling Price</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              disabled={isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Enter selling price per piece.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Sizes */}
                  <div className="w-full">
                    <h3 className="text-md font-semibold mb-2">
                      Sizes (All Designs)
                    </h3>
                    <AddSizeForm
                      preSizes={[]}
                      onAddSize={onAddSize}
                      sizes={sizes}
                    />
                  </div>

                  {/* Design Generator */}
                  <Button
                    onClick={generateDesignsFromImages}
                    disabled={generatorLoader || bulkProcessing}
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {generatorLoader ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Generate {images.length} Designs
                  </Button>

                  {/* Show Designs */}
                  {designs.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">
                        Generated Designs ({designs.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                        {designs.map((design, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={design.images[0]?.url}
                                alt={`Design ${index + 1}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div>
                                <p className="font-medium">
                                  Code: {design.code}
                                </p>
                                <p className="text-sm text-gray-600">
                                  Pieces: {design.countOfPiece}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Sizes:{" "}
                                  {design.sizes
                                    .map((s) => `${s.size}(${s.quantity})`)
                                    .join(", ")}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Final Submit */}
                  <Button
                    type="button"
                    disabled={isPending || barcodeDownloading || bulkProcessing}
                    onClick={handleBulkFormSubmit}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isPending || barcodeDownloading || bulkProcessing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Upload {designs.length} Designs & Download Barcodes
                  </Button>
                </form>
              </Form>
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
