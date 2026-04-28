"use client";

import { useCallback, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Button } from "@/src/components/ui/button";
import ImageUpload2 from "../upload/imageUpload2";
import { categoryEditSchema } from "@/src/schemas";
import { categoryUpdate } from "@/src/actions/category";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  count: number;
  type: string;
  kurtiType?: string;
  countTotal: number;
  totalItems: number;
  sellingPrice: number;
  actualPrice: number;
  customerPrice?: number;
  customerBigPrice?: number;
  image?: string;
  bigPrice?: number; // Added bigPrice field
  walletDiscount?: number;
  isStockReady: boolean;
}

interface EditCategoryModalProps {
  category: Category;
  onCategoryUpdate: (updatedCategory: Category) => void;
  trigger?: React.ReactNode;
}

type PriceDraft = {
  actualPrice: string;
  sellingPrice: string;
  customerPrice: string;
  bigPrice: string;
  customerBigPrice: string;
  walletDiscount: string;
};

function categoryToPriceDraft(cat: Category): PriceDraft {
  const toStr = (n: number | undefined | null) =>
    n != null && Number.isFinite(n) ? String(n) : "";

  return {
    actualPrice: toStr(cat.actualPrice),
    sellingPrice: toStr(cat.sellingPrice),
    customerPrice: toStr(cat.customerPrice),
    bigPrice: toStr(cat.bigPrice),
    customerBigPrice: toStr(cat.customerBigPrice),
    walletDiscount: toStr(cat.walletDiscount),
  };
}

function parseDraftNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

const EditCategoryModal = ({
  category,
  onCategoryUpdate,
  trigger,
}: EditCategoryModalProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentImage, setCurrentImage] = useState<string>(
    category.image || "/images/no-image.png"
  );
  const [priceDraft, setPriceDraft] = useState<PriceDraft>(() =>
    categoryToPriceDraft(category)
  );

  const form = useForm<z.infer<typeof categoryEditSchema>>({
    resolver: zodResolver(categoryEditSchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      type: category.type || "",
      image: category.image || "/images/no-image.png",
      sellingPrice: category.sellingPrice ?? undefined,
      actualPrice: category.actualPrice ?? undefined,
      customerPrice: category.customerPrice ?? undefined,
      bigPrice: category.bigPrice ?? undefined,
      customerBigPrice: category.customerBigPrice ?? undefined,
      walletDiscount: category.walletDiscount ?? undefined,
      kurtiType: category.kurtiType || "",
    },
  });

  const handleImageChange = (images: { url: string }[]) => {
    const newImageUrl = images[0]?.url || "/images/no-image.png";
    setCurrentImage(newImageUrl);
    form.setValue("image", newImageUrl);
  };

  const resetFormFromCategory = useCallback(
    (cat: Category) => {
      setPriceDraft(categoryToPriceDraft(cat));
      setCurrentImage(cat.image || "/images/no-image.png");
      form.reset({
        id: cat.id,
        name: cat.name,
        type: cat.type || "",
        image: cat.image || "/images/no-image.png",
        actualPrice: cat.actualPrice ?? undefined,
        sellingPrice: cat.sellingPrice ?? undefined,
        customerPrice: cat.customerPrice ?? undefined,
        bigPrice: cat.bigPrice ?? undefined,
        customerBigPrice: cat.customerBigPrice ?? undefined,
        walletDiscount: cat.walletDiscount ?? 0,
        kurtiType: cat.kurtiType || "",
      });
    },
    [form]
  );

  const handleSubmit = (values: z.infer<typeof categoryEditSchema>) => {
    const merged: z.infer<typeof categoryEditSchema> = {
      ...values,
      actualPrice: parseDraftNumber(priceDraft.actualPrice),
      sellingPrice: parseDraftNumber(priceDraft.sellingPrice),
      customerPrice: parseDraftNumber(priceDraft.customerPrice),
      bigPrice: parseDraftNumber(priceDraft.bigPrice),
      customerBigPrice: parseDraftNumber(priceDraft.customerBigPrice),
      walletDiscount: parseDraftNumber(priceDraft.walletDiscount) ?? 0,
    };

    const parsed = categoryEditSchema.safeParse(merged);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg = Object.values(first).flat()[0] || "Please check price fields";
      toast.error(String(msg));
      return;
    }

    startTransition(() => {
      console.log("values", parsed.data);

      categoryUpdate(category.id, {
        name: parsed.data.name,
        type: parsed.data.type || "",
        image: parsed.data.image,
        sellingPrice: parsed.data.sellingPrice,
        actualPrice: parsed.data.actualPrice,
        customerPrice: parsed.data.customerPrice,
        bigPrice: parsed.data.bigPrice, // Include bigPrice in the update
        customerBigPrice: parsed.data.customerBigPrice, // Include customerBigPrice in the update
        walletDiscount: parsed.data.walletDiscount || 0,
        kurtiType: parsed.data.kurtiType,
      })
        .then((data) => {
          console.log("🚀 ~ .then ~ data:", data);
          if (data.error) {
            toast.error(data.error);
            return;
          }
          if (data.success) {
            toast.success(data.success);

            const updatedCategory: Category = {
              ...category,
              name: parsed.data.name,
              type: parsed.data.type || "",
              image: parsed.data.image || "/images/no-image.png",
              bigPrice: parsed.data.bigPrice,
            };

            onCategoryUpdate(updatedCategory);
            setOpen(false);
            form.reset();
            setTimeout(() => {
              toast.success("Category updated successfully!");

              // Update the category in parent component
              const updatedCategory2: Category = {
                ...category,
                name: parsed.data.name,
                type: parsed.data.type || "",
                image: parsed.data.image || "/images/no-image.png",
                bigPrice: parsed.data.bigPrice,
              };

              onCategoryUpdate(updatedCategory2);
              setOpen(false);
            }, 1000);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  // Reset only when transitioning closed -> open (Radix may call onOpenChange(true) again while open)
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !open) {
      resetFormFromCategory(category);
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[95%] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update category information and click save changes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={true}
                      placeholder="Enter category name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      disabled={isPending}
                      placeholder="Enter category type"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kurtiType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kurti Type</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select kurti type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="roundedPair">
                          Rounded Pair
                        </SelectItem>
                        <SelectItem value="straightPair">
                          Straight Pair
                        </SelectItem>
                        <SelectItem value="plazzaPair">Plazza Pair</SelectItem>
                        <SelectItem value="sararaPair">Sarara Pair</SelectItem>
                        <SelectItem value="straightKurtiPent">
                          Straight kurti Pent
                        </SelectItem>
                        <SelectItem value="roundKurti">Round kurti</SelectItem>
                        <SelectItem value="straightKurti">
                          Straight kurti
                        </SelectItem>
                        <SelectItem value="onlyPent">Only Pent</SelectItem>
                        <SelectItem value="lehengaCholi">Lehenga Choli</SelectItem>
                        <SelectItem value="straight">Straight</SelectItem>
                        <SelectItem value="codeSet">Code-Set</SelectItem>
                        <SelectItem value="tunique">Tunique</SelectItem>
                        <SelectItem value="gaune">Gaune</SelectItem>
                        <SelectItem value="aLineKurti">
                          A-Line Kurti
                        </SelectItem>
                        <SelectItem value="roundedKurtiPant">
                          Round & Kurti Pant
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <Label htmlFor="edit-cat-actual-price">Actual Price</Label>
              <Input
                id="edit-cat-actual-price"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter actual price"
                value={priceDraft.actualPrice}
                onChange={(e) =>
                  setPriceDraft((d) => ({
                    ...d,
                    actualPrice: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-selling-price">
                Selling Price (Reseller)
              </Label>
              <Input
                id="edit-cat-selling-price"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter selling price for reseller"
                value={priceDraft.sellingPrice}
                onChange={(e) =>
                  setPriceDraft((d) => ({
                    ...d,
                    sellingPrice: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-customer-price">Customer Price</Label>
              <Input
                id="edit-cat-customer-price"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter customer price"
                value={priceDraft.customerPrice}
                onChange={(e) =>
                  setPriceDraft((d) => ({
                    ...d,
                    customerPrice: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-big-price">Big Price (Optional)</Label>
              <Input
                id="edit-cat-big-price"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter big price"
                value={priceDraft.bigPrice}
                onChange={(e) =>
                  setPriceDraft((d) => ({ ...d, bigPrice: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-customer-big-price">
                Customer Big Price (Optional)
              </Label>
              <Input
                id="edit-cat-customer-big-price"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter customer big price"
                value={priceDraft.customerBigPrice}
                onChange={(e) =>
                  setPriceDraft((d) => ({
                    ...d,
                    customerBigPrice: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cat-wallet-discount">
                Wallet Discount (₹)
              </Label>
              <Input
                id="edit-cat-wallet-discount"
                type="text"
                inputMode="decimal"
                disabled={isPending}
                placeholder="Enter flat discount in ₹"
                value={priceDraft.walletDiscount}
                onChange={(e) =>
                  setPriceDraft((d) => ({
                    ...d,
                    walletDiscount: e.target.value,
                  }))
                }
              />
            </div>

            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Current Image Preview */}
                      <div className="flex items-center space-x-4">
                        <div className="relative w-20 h-20 border rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={currentImage}
                            alt="Category preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/no-image.png";
                            }}
                          />
                        </div>
                      </div>

                      {/* Image Upload Component */}
                      <ImageUpload2
                        images={
                          field.value && field.value !== "/images/no-image.png"
                            ? [{ url: field.value }]
                            : []
                        }
                        singleFile
                        onImageChange={handleImageChange}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCategoryModal;
