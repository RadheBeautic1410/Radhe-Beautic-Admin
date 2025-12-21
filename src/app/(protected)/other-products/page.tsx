"use client";

import { Button } from "@/components/ui/button";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCaption,
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
} from "lucide-react";
import React, { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import * as z from "zod";
import { DialogDemo } from "@/src/components/dialog-demo";
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
import { createOtherProduct, updateOtherProduct, deleteOtherProduct } from "@/src/actions/other-products";
import axios from "axios";
import Image from "next/image";

interface OtherProduct {
  id: string;
  categoryName: string;
  productType: string;
  images: { url: string }[];
  createdAt: string;
  updatedAt: string;
}

const otherProductSchema = z.object({
  categoryName: z.string().min(1, "Category name is required"),
  productType: z.string().min(1, "Product type is required"),
  images: z.array(z.object({ url: z.string() })).min(1, "At least one image is required"),
});

type OtherProductFormValues = z.infer<typeof otherProductSchema>;

const productTypes = [
  "Sadi",
  "Choli",
  "Lehenga",
  "Dupatta",
  "Other",
];

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
      productType: product.productType,
      images: product.images,
    },
  });

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      form.reset({
        categoryName: product.categoryName,
        productType: product.productType,
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
                  onValueChange={field.onChange}
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
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
  const [editingProduct, setEditingProduct] = useState<OtherProduct | null>(null);
  const [images, setImages] = useState<{ url: string }[]>([]);
  const imageUploadRef = React.useRef<any>(null);

  const form = useForm<OtherProductFormValues>({
    resolver: zodResolver(otherProductSchema),
    defaultValues: {
      categoryName: "",
      productType: "",
      images: [],
    },
  });

  const fetchProducts = async (pageNum?: number) => {
    try {
      setLoading(true);
      const currentPage = pageNum !== undefined ? pageNum : page;
      console.log("Fetching products with params:", { page: currentPage, search });
      const response = await axios.get(`/api/other-products`, {
        params: {
          page: currentPage,
          limit: 20,
          search,
          searchType: "category",
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
  }, [page, search]);

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
      productType: product.productType,
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
          const result = await updateOtherProduct(editingProduct.id, productData);
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

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h1 className="text-2xl font-bold">Other Products Catalog</h1>
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
                        onValueChange={field.onChange}
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
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving..." : editingProduct ? "Update" : "Create"}
                </Button>
              </form>
            </Form>
          </DialogDemo>
        </CardHeader>

        <CardContent>
          <div className="mb-4">
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
                        <TableCell>{product.productType}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {product.images.slice(0, 3).map((img, idx) => (
                              <div
                                key={idx}
                                className="relative w-16 h-16 rounded overflow-hidden border"
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
                              <div className="w-16 h-16 rounded border flex items-center justify-center text-xs text-gray-500">
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
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>
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

