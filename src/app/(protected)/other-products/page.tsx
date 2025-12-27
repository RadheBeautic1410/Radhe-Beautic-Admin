"use client";

import { Button } from "@/components/ui/button";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { UserRole } from "@prisma/client";
import {
  Edit,
  Plus,
  Trash2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Share2,
} from "lucide-react";
import React, { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { DialogDemo } from "@/src/components/dialog-demo";
import { Dialog, DialogContent } from "@/src/components/ui/dialog";
import ImageUpload2 from "../_components/upload/imageUpload2";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createOtherProduct,
  updateOtherProduct,
  deleteOtherProduct,
} from "@/src/actions/other-products";
import axios from "axios";
import Image from "next/image";
import JSZip from "jszip";

interface OtherProduct {
  id: string;
  categoryName: string;
  productType: string;
  subType?: string;
  description?: string;
  images: { url: string }[];
  createdAt: string;
  updatedAt: string;
}

const otherProductSchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  productType: z.string().min(1, "Product type is required"),
  subType: z.string().optional(),
  description: z.string().optional(),
  images: z
    .array(z.object({ url: z.string() }))
    .min(1, "At least one image is required"),
});

type OtherProductFormValues = z.infer<typeof otherProductSchema>;

const productTypes = [
  { key: "sadi", value: "Sadi" },
  { key: "choli", value: "Choli" },
  { key: "lehenga", value: "Lehenga" },
  { key: "threePiece", value: "3 Piece" },
  { key: "kurtiPant", value: "Kurti Pant" },
  { key: "gown", value: "Gown" },
  { key: "tunique", value: "Tunique" },
  { key: "chaniya", value: "Chaniya" },
  { key: "dupatta", value: "Dupatta" },
  { key: "kurti", value: "Kurti" },
  { key: "mensKurta", value: "Mens Kurta" },
  { key: "kidsWear", value: "kids Wear" },
  { key: "other", value: "Other" },
];

// Subtype mapping based on product type key
const productSubTypes: Record<string, Array<{ key: string; value: string }>> = {
  sadi: [
    { key: "cotton-saree", value: "Cotton Saree" },
    { key: "dola-saree", value: "Dola Saree" },
    { key: "bandhani-saree", value: "Bandhani Saree" },
    { key: "gaji-silk-saree", value: "Gaji Silk Saree" },
    { key: "cotton-silk-saree", value: "Cotton Silk saree" },
    { key: "viscose-saree", value: "Viscose saree" },
    { key: "chinon-silk-saree", value: "Chinon silk  saree" },
    { key: "banarasi-saree", value: "Banarasi saree" },
    { key: "georgette-saree", value: "Georgette saree" },
    { key: "ready-to-wear-saree", value: "Ready to wear saree" },
    { key: "kanjivaram-sadi", value: "Kanjivaram Sadi" },
    { key: "tussar-sadi", value: "Tussar Sadi" },
  ],
  choli: [
    { key: "heavy", value: "Heavy" },
    { key: "medium", value: "Medium" },
    { key: "low", value: "Low" },
  ],
  threePiece: [
    { key: "jaypuri-cotton-round", value: "Jaypuri Cotton Round" },
    { key: "jaypuri-cotton-pair", value: "Jaypuri Cotton Pair" },
    { key: "heavy", value: "Heavy" },
    { key: "anarkali", value: "Anarkali" },
    { key: "sarara-pair", value: "Sarara Pair" },
  ],
  kurtiPant: [
    { key: "plazza-pair", value: "Plazza Pair" },
    { key: "codeset", value: "Codeset" },
    { key: "a-line-kurit-pant", value: "A-line Kurit Pant" },
  ],
  chaniya: [
    { key: "chaniya", value: "Only Chaniya" },
    { key: "chaniya-duppata", value: "Chaniya Duppata" },
    { key: "chaniya-blouse-duppata", value: "Chaniya Blouse Duppata" },
  ],
  gown: [
    { key: "gown", value: "Only Gown" },
    { key: "gown-duppata", value: "Gown Duppata" },
  ],
  other: [],
};

// Helper functions to convert between key and value
const getProductTypeKey = (type: string): string => {
  const found = productTypes.find((t) => t.value === type || t.key === type);
  return found ? found.key : type.toLowerCase();
};

const getProductTypeValue = (key: string): string => {
  const found = productTypes.find((t) => t.key === key || t.value === key);
  return found ? found.value : key;
};

// Helper functions for subtype conversion
const getSubTypeKey = (subType: string, productTypeKey: string): string => {
  const subtypes = productSubTypes[productTypeKey] || [];
  const found = subtypes.find(
    (st) => st.value === subType || st.key === subType
  );
  return found ? found.key : subType.toLowerCase().replace(/\s+/g, "-");
};

const getSubTypeValue = (key: string, productTypeKey: string): string => {
  const subtypes = productSubTypes[productTypeKey] || [];
  const found = subtypes.find((st) => st.key === key || st.value === key);
  return found ? found.value : key;
};

interface EditProductDialogProps {
  product: OtherProduct;
  onSuccess: () => void;
}

const EditProductDialog = ({ product, onSuccess }: EditProductDialogProps) => {
  const [isPending, startTransition] = useTransition();
  const [images, setImages] = useState<{ url: string }[]>(product.images);
  const [dialogOpen, setDialogOpen] = useState(false);
  const imageUploadRef = React.useRef<any>(null);

  const form = useForm<OtherProductFormValues>({
    resolver: zodResolver(otherProductSchema),
    defaultValues: {
      categoryName: product.categoryName,
      productType: getProductTypeKey(product.productType), // Convert stored value to key
      subType: product.subType
        ? getSubTypeKey(product.subType, getProductTypeKey(product.productType))
        : "",
      description: product.description || "",
      images: product.images,
    },
  });

  const selectedProductType = form.watch("productType");
  const productTypeKey = selectedProductType
    ? getProductTypeKey(selectedProductType)
    : "";
  const availableSubTypes = productTypeKey
    ? productSubTypes[productTypeKey] || []
    : [];

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset({
        categoryName: product.categoryName,
        productType: getProductTypeKey(product.productType), // Convert stored value to key
        subType: product.subType
          ? getSubTypeKey(
              product.subType,
              getProductTypeKey(product.productType)
            )
          : "",
        description: product.description || "",
        images: product.images,
      });
      setImages(product.images);
      imageUploadRef.current?.reset();
    }
  };

  const handleSubmit = (values: OtherProductFormValues) => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    startTransition(async () => {
      try {
        const productData = {
          ...values,
          images: images,
        };

        const result = await updateOtherProduct(product.id, productData);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success || "Product updated successfully!");
          // Close dialog
          setDialogOpen(false);
          // Wait a bit for the database to be ready, then fetch
          setTimeout(async () => {
            await onSuccess();
          }, 500);
        }
      } catch (error: any) {
        console.error("Error updating product:", error);
        toast.error(error.message || "Failed to update product");
      }
    });
  };

  return (
    <DialogDemo
      isTriggerElement
      dialogTrigger={
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      }
      dialogTitle="Edit Product"
      dialogDescription="Update product information"
      bgColor="default"
      open={dialogOpen}
      onOpenChange={handleOpenChange}
      dialogContentClassName="sm:max-w-2xl max-h-[85vh] !flex !flex-col"
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="categoryName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter category name"
                    disabled={isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Reset subtype when product type changes
                    form.setValue("subType", "");
                  }}
                  value={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {availableSubTypes.length > 0 && (
            <FormField
              control={form.control}
              name="subType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableSubTypes.map((subType) => (
                        <SelectItem key={subType.key} value={subType.key}>
                          {subType.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (WhatsApp Message)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter product description/message (as-is, plain text)"
                    disabled={isPending}
                    rows={6}
                    className="resize-none"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="images"
            render={() => (
              <FormItem>
                <FormLabel>Images</FormLabel>
                <FormControl>
                  <ImageUpload2
                    ref={imageUploadRef}
                    onImageChange={(newImages) => {
                      setImages(newImages);
                      form.setValue("images", newImages);
                    }}
                    images={images}
                    watermarkText={form.watch("categoryName")}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating..." : "Update"}
          </Button>
        </form>
      </Form>
    </DialogDemo>
  );
};

function OtherProductsPage() {
  const [products, setProducts] = useState<OtherProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterProductType, setFilterProductType] = useState<string>("");
  const [filterSubType, setFilterSubType] = useState<string>("");
  const [editingProduct, setEditingProduct] = useState<OtherProduct | null>(
    null
  );
  const [images, setImages] = useState<{ url: string }[]>([]);
  const imageUploadRef = React.useRef<any>(null);
  const [downloadingProductId, setDownloadingProductId] = useState<
    string | null
  >(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{ url: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareProductType, setShareProductType] = useState<string>("");
  const [shareSubType, setShareSubType] = useState<string>("");

  const form = useForm<OtherProductFormValues>({
    resolver: zodResolver(otherProductSchema),
    defaultValues: {
      categoryName: "",
      productType: "",
      subType: "",
      description: "",
      images: [],
    },
  });

  const selectedProductType = form.watch("productType");
  const productTypeKey = selectedProductType
    ? getProductTypeKey(selectedProductType)
    : "";
  const availableSubTypes = productTypeKey
    ? productSubTypes[productTypeKey] || []
    : [];

  const fetchProducts = async (pageNum?: number) => {
    try {
      setLoading(true);
      const currentPage = pageNum !== undefined ? pageNum : page;
      console.log("Fetching products with params:", {
        page: currentPage,
        search,
        productType: filterProductType,
        subType: filterSubType,
      });
      const response = await axios.get(`/api/other-products`, {
        params: {
          page: currentPage,
          limit: 20,
          search,
          searchType: "category",
          productType: filterProductType || undefined,
          subType: filterSubType || undefined,
        },
      });
      console.log("Fetched products response:", response.data);
      if (response.data && response.data.data) {
        setProducts(response.data.data);
        setTotalPages(response.data.pagination?.totalPages || 1);
      } else {
        console.error("Invalid response format:", response.data);
        setProducts([]);
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast.error(error.response?.data?.error || "Failed to fetch products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, filterProductType, filterSubType]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset();
      setImages([]);
      setEditingProduct(null);
      imageUploadRef.current?.reset();
    }
  };

  const handleEditClick = (product: OtherProduct) => {
    setEditingProduct(product);
    form.reset({
      categoryName: product.categoryName,
      productType: getProductTypeKey(product.productType), // Convert stored value to key
      subType: product.subType
        ? getSubTypeKey(product.subType, getProductTypeKey(product.productType))
        : "",
      description: product.description || "",
      images: product.images,
    });
    setImages(product.images);
  };

  const handleSubmit = async (values: OtherProductFormValues) => {
    if (images.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    startTransition(async () => {
      try {
        const productData = {
          ...values,
          images: images,
        };

        console.log("Saving product data:", productData);

        if (editingProduct) {
          const result = await updateOtherProduct(
            editingProduct.id,
            productData
          );
          console.log("Update result:", result);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success(result.success || "Product updated successfully!");
            form.reset();
            setImages([]);
            setEditingProduct(null);
            imageUploadRef.current?.reset();
            // Close dialog
            setDialogOpen(false);
            // Wait a moment for database to be ready, then refresh
            setTimeout(async () => {
              await fetchProducts();
            }, 300);
          }
        } else {
          const result = await createOtherProduct(productData);
          console.log("Create result:", result);
          if (result.error) {
            toast.error(result.error);
          } else {
            toast.success(result.success || "Product created successfully!");
            form.reset();
            setImages([]);
            imageUploadRef.current?.reset();
            // Close dialog
            setDialogOpen(false);
            // Reset to first page to see the new product and refresh
            setPage(1);
            // Wait a moment for database to be ready, then refresh with page 1
            setTimeout(async () => {
              await fetchProducts(1);
            }, 300);
          }
        }
      } catch (error: any) {
        console.error("Error saving product:", error);
        toast.error(error.message || "Failed to save product");
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteOtherProduct(id);
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(result.success || "Product deleted successfully!");
          fetchProducts();
        }
      } catch (error: any) {
        toast.error(error.message || "Failed to delete product");
      }
    });
  };

  const handleDownloadImages = async (product: OtherProduct) => {
    if (!product.images || product.images.length === 0) {
      toast.error("No images to download");
      return;
    }

    setDownloadingProductId(product.id);
    const loadingToast = toast.loading("Preparing download...");

    try {
      const zip = new JSZip();

      // Download all images
      for (let i = 0; i < product.images.length; i++) {
        const image = product.images[i];
        toast.loading(
          `Downloading image ${i + 1}/${product.images.length}...`,
          {
            id: loadingToast,
          }
        );

        try {
          const response = await fetch(image.url);
          if (!response.ok) {
            console.warn(`Failed to download image: ${image.url}`);
            continue;
          }

          const blob = await response.blob();

          // Get file extension from Content-Type header
          const contentType =
            response.headers.get("content-type") || blob.type || "";
          let extension = "jpg"; // default extension

          if (
            contentType.includes("image/jpeg") ||
            contentType.includes("image/jpg")
          ) {
            extension = "jpg";
          } else if (contentType.includes("image/png")) {
            extension = "png";
          } else if (contentType.includes("image/gif")) {
            extension = "gif";
          } else if (contentType.includes("image/webp")) {
            extension = "webp";
          } else if (contentType.includes("image/svg")) {
            extension = "svg";
          } else {
            // Fallback: try to extract from URL if content type is not available
            const urlExtension = image.url
              .split(".")
              .pop()
              ?.split("?")[0]
              ?.toLowerCase();
            if (
              urlExtension &&
              ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
                urlExtension
              )
            ) {
              extension = urlExtension;
            }
          }

          // Ensure filename has no path separators to keep files in root
          const filename = `${product.categoryName.replace(
            /[^a-z0-9]/gi,
            "_"
          )}_image_${i + 1}.${extension}`.replace(/[/\\]/g, "_");
          // Add file directly to root of zip (no folder path)
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading image ${i + 1}:`, error);
        }
      }

      toast.loading("Generating zip file...", {
        id: loadingToast,
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });

      toast.loading("Starting download...", {
        id: loadingToast,
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${product.categoryName.replace(
        /[^a-z0-9]/gi,
        "_"
      )}_images_${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success("Images downloaded successfully!");
    } catch (error) {
      console.error("Error downloading images:", error);
      toast.dismiss(loadingToast);
      toast.error("Failed to download images");
    } finally {
      setDownloadingProductId(null);
    }
  };

  const handleShareProduct = async (product: OtherProduct) => {
    try {
      // Get base URL from environment variable
      const baseUrl =
        process.env.NEXT_PUBLIC_OTHER_PRODUCTS_URL ||
        "https://www.indianweargallery.in/products";

      // Get product type and sub type keys
      const productTypeKey = getProductTypeKey(product.productType);
      const subTypeKey = product.subType
        ? getSubTypeKey(product.subType, productTypeKey)
        : "";

      // Build query parameters
      const params = new URLSearchParams();
      params.append("category", product.categoryName);
      params.append("productType", productTypeKey);
      if (subTypeKey) {
        params.append("productSubType", subTypeKey);
      }

      // Build the shareable URL with query parameters
      const shareUrl = `${baseUrl}?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Shareable link copied to clipboard!");
    } catch (error) {
      console.error("Error copying share link:", error);
      toast.error("Failed to copy share link");
    }
  };

  const handleGenerateShareLink = async () => {
    if (!shareProductType) {
      toast.error("Please select a product type");
      return;
    }

    try {
      // Get base URL from environment variable
      const baseUrl =
        process.env.NEXT_PUBLIC_OTHER_PRODUCTS_URL ||
        "https://www.indianweargallery.in/products";

      // Get product type key (already in key format from select)
      const productTypeKey = shareProductType;

      // Build query parameters
      const params = new URLSearchParams();
      params.append("productType", productTypeKey);
      if (shareSubType) {
        params.append("productSubType", shareSubType);
      }

      // Build the shareable URL with query parameters
      const shareLink = `${baseUrl}?${params.toString()}`;

      // Copy to clipboard
      await navigator.clipboard.writeText(shareLink);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Error copying share link:", error);
      toast.error("Failed to copy share link");
    }
  };

  const shareProductTypeKey = shareProductType
    ? getProductTypeKey(shareProductType)
    : "";
  const shareAvailableSubTypes = shareProductTypeKey
    ? productSubTypes[shareProductTypeKey] || []
    : [];

  const openImageGallery = (
    productImages: { url: string }[],
    initialIndex: number = 0
  ) => {
    setGalleryImages(productImages);
    setCurrentImageIndex(initialIndex);
    setGalleryOpen(true);
  };

  const closeImageGallery = () => {
    setGalleryOpen(false);
    setGalleryImages([]);
    setCurrentImageIndex(0);
  };

  const goToPreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : galleryImages.length - 1
    );
  };

  const goToNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < galleryImages.length - 1 ? prev + 1 : 0
    );
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!galleryOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentImageIndex((prev) =>
          prev > 0 ? prev - 1 : galleryImages.length - 1
        );
      } else if (e.key === "ArrowRight") {
        setCurrentImageIndex((prev) =>
          prev < galleryImages.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "Escape") {
        setGalleryOpen(false);
        setGalleryImages([]);
        setCurrentImageIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryOpen, galleryImages.length]);

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h1 className="text-2xl font-bold">Other Products Catalog</h1>
          <div className="flex gap-2">
            <DialogDemo
              isTriggerElement
              dialogTrigger={
                <Button variant="default">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              }
              dialogTitle="Generate Share Link"
              dialogDescription="Select product type and subtype to generate a shareable link"
              bgColor="default"
              open={shareModalOpen}
              onOpenChange={(open) => {
                setShareModalOpen(open);
                if (!open) {
                  setShareProductType("");
                  setShareSubType("");
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Product Type
                  </label>
                  <Select
                    value={shareProductType}
                    onValueChange={(value) => {
                      setShareProductType(value);
                      setShareSubType(""); // Reset subtype when product type changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product type" />
                    </SelectTrigger>
                    <SelectContent>
                      {productTypes.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {shareAvailableSubTypes.length > 0 && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Sub Type (Optional)
                    </label>
                    <Select
                      value={shareSubType}
                      onValueChange={setShareSubType}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sub type" />
                      </SelectTrigger>
                      <SelectContent>
                        {shareAvailableSubTypes.map((subType) => (
                          <SelectItem key={subType.key} value={subType.key}>
                            {subType.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={handleGenerateShareLink}
                  className="w-full"
                  disabled={!shareProductType}
                >
                  Generate Link & Copy
                </Button>
              </div>
            </DialogDemo>
            <DialogDemo
              dialogTrigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              }
              dialogTitle="Add New Product"
              dialogDescription="Add a new product to the catalog"
              bgColor="default"
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                handleOpenChange(open);
              }}
              dialogContentClassName="sm:max-w-2xl max-h-[85vh] !flex !flex-col"
            >
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="categoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter category name"
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Reset subtype when product type changes
                            form.setValue("subType", "");
                          }}
                          value={field.value}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {productTypes.map((type) => (
                              <SelectItem key={type.key} value={type.key}>
                                {type.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {availableSubTypes.length > 0 && (
                    <FormField
                      control={form.control}
                      name="subType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={isPending}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select sub type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableSubTypes.map((subType) => (
                                <SelectItem
                                  key={subType.key}
                                  value={subType.key}
                                >
                                  {subType.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (WhatsApp Message)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter product description/message (as-is, plain text)"
                            disabled={isPending}
                            rows={6}
                            className="resize-none"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="images"
                    render={() => (
                      <FormItem>
                        <FormLabel>Images</FormLabel>
                        <FormControl>
                          <ImageUpload2
                            ref={imageUploadRef}
                            onImageChange={(newImages) => {
                              setImages(newImages);
                              form.setValue("images", newImages);
                            }}
                            images={images}
                            watermarkText={form.watch("categoryName")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isPending}>
                    {isPending
                      ? "Saving..."
                      : editingProduct
                      ? "Update"
                      : "Create"}
                  </Button>
                </form>
              </Form>
            </DialogDemo>
          </div>
        </CardHeader>

        <CardContent>
          <div className="mb-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by category name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>

            {/* Filter Section */}
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">
                  Product Type
                </label>
                <Select
                  value={filterProductType || "all"}
                  onValueChange={(value) => {
                    setFilterProductType(value === "all" ? "" : value);
                    setFilterSubType(""); // Reset sub type when product type changes
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Product Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Product Types</SelectItem>
                    {productTypes.map((type) => (
                      <SelectItem key={type.key} value={type.key}>
                        {type.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterProductType &&
                (() => {
                  const filterProductTypeKey =
                    getProductTypeKey(filterProductType);
                  const filterAvailableSubTypes =
                    productSubTypes[filterProductTypeKey] || [];
                  return filterAvailableSubTypes.length > 0 ? (
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Sub Type
                      </label>
                      <Select
                        value={filterSubType || "all"}
                        onValueChange={(value) => {
                          setFilterSubType(value === "all" ? "" : value);
                          setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Sub Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sub Types</SelectItem>
                          {filterAvailableSubTypes.map((subType) => (
                            <SelectItem key={subType.key} value={subType.key}>
                              {subType.value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null;
                })()}

              {(filterProductType || filterSubType) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterProductType("");
                    setFilterSubType("");
                    setPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p>Loading...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No products found. Add your first product!
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category Name</TableHead>
                      <TableHead>Product Type</TableHead>
                      <TableHead>Sub Type</TableHead>
                      <TableHead>Images</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.categoryName}
                        </TableCell>
                        <TableCell>
                          {getProductTypeValue(product.productType)}
                        </TableCell>
                        <TableCell>
                          {product.subType
                            ? getSubTypeValue(
                                product.subType,
                                getProductTypeKey(product.productType)
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {product.images.slice(0, 3).map((img, idx) => (
                              <div
                                key={idx}
                                className="relative w-16 h-16 rounded overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() =>
                                  openImageGallery(product.images, idx)
                                }
                              >
                                <Image
                                  src={img.url}
                                  alt={`${product.categoryName} ${idx + 1}`}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            ))}
                            {product.images.length > 3 && (
                              <div
                                className="w-16 h-16 rounded border flex items-center justify-center text-xs text-gray-500 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() =>
                                  openImageGallery(product.images, 3)
                                }
                              >
                                +{product.images.length - 3}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(product.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <EditProductDialog
                              product={product}
                              onSuccess={fetchProducts}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleShareProduct(product)}
                              disabled={isPending}
                              title="Copy shareable link"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadImages(product)}
                              disabled={
                                isPending || downloadingProductId === product.id
                              }
                              title="Download images"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(product.id)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination className="mt-4">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={
                          page === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pageNum) => (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            onClick={() => setPage(pageNum)}
                            isActive={page === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        className={
                          page === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Image Gallery Modal */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden !translate-x-[-50%] !translate-y-[-50%]">
          <div
            className="relative w-full h-full flex flex-col bg-black"
            style={{ maxHeight: "95vh" }}
          >
            {/* Close Button */}
            <button
              onClick={closeImageGallery}
              className="absolute top-4 right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
              aria-label="Close gallery"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Main Image Container - takes remaining space but leaves room for thumbnails */}
            <div
              className="flex items-center justify-center relative overflow-hidden"
              style={{
                height:
                  galleryImages.length > 1 ? "calc(95vh - 120px)" : "95vh",
                maxHeight:
                  galleryImages.length > 1 ? "calc(95vh - 120px)" : "95vh",
              }}
            >
              {galleryImages.length > 0 && (
                <>
                  {/* Previous Button */}
                  {galleryImages.length > 1 && (
                    <button
                      onClick={goToPreviousImage}
                      className="absolute left-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-colors"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </button>
                  )}

                  {/* Main Image */}
                  <div className="w-full h-full flex items-center justify-center p-4 box-border">
                    <img
                      src={galleryImages[currentImageIndex]?.url || ""}
                      alt={`Image ${currentImageIndex + 1}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain"
                      style={{ maxHeight: "100%", maxWidth: "100%" }}
                    />
                  </div>

                  {/* Next Button */}
                  {galleryImages.length > 1 && (
                    <button
                      onClick={goToNextImage}
                      className="absolute right-4 z-50 text-white bg-black/50 hover:bg-black/70 rounded-full p-3 transition-colors"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-8 w-8" />
                    </button>
                  )}

                  {/* Image Counter */}
                  {galleryImages.length > 1 && (
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 text-white bg-black/50 px-4 py-2 rounded-full text-sm">
                      {currentImageIndex + 1} / {galleryImages.length}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Thumbnail Strip - fixed height at bottom */}
            {galleryImages.length > 1 && (
              <div
                className="w-full bg-black/80 border-t border-gray-800 p-4 overflow-x-auto flex-shrink-0"
                style={{ height: "120px", minHeight: "120px" }}
              >
                <div className="flex gap-2 justify-center items-center h-full">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`relative w-20 h-20 rounded overflow-hidden border-2 transition-all flex-shrink-0 ${
                        idx === currentImageIndex
                          ? "border-white scale-110"
                          : "border-gray-600 hover:border-gray-400 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const OtherProductsPageHelper = () => {
  return (
    <>
      <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
        <OtherProductsPage />
      </RoleGateForComponent>
      <RoleGateForComponent
        allowedRole={[
          UserRole.SELLER,
          UserRole.RESELLER,
          UserRole.SHOP_SELLER,
          UserRole.SELLER_MANAGER,
        ]}
      >
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">
                You don't have permission to access this page.
              </p>
            </CardContent>
          </Card>
        </div>
      </RoleGateForComponent>
    </>
  );
};

export default OtherProductsPageHelper;
