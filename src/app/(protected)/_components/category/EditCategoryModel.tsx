"use client";

import { useState, useTransition } from "react";
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
import { Button } from "@/src/components/ui/button";
import ImageUpload2 from "../upload/imageUpload2";
import { categoryEditSchema } from "@/src/schemas";
import { categoryUpdate } from "@/src/actions/category";

interface Category {
  id: string;
  name: string;
  count: number;
  type: string;
  countOfPiece: number;
  sellingPrice: number;
  actualPrice: number;
  image?: string;
  bigPrice?: number; // Added bigPrice field
  walletDiscount?: number;
}

interface EditCategoryModalProps {
  category: Category;
  onCategoryUpdate: (updatedCategory: Category) => void;
  trigger?: React.ReactNode;
}

const EditCategoryModal = ({
  category,
  onCategoryUpdate,
  trigger,
}: EditCategoryModalProps) => {
  console.log("🚀 ~ category:", category)
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentImage, setCurrentImage] = useState<string>(
    category.image || "/images/no-image.png"
  );

  const form = useForm<z.infer<typeof categoryEditSchema>>({
    resolver: zodResolver(categoryEditSchema),
    defaultValues: {
      id: category.id,
      name: category.name,
      type: category.type || "",
      image: category.image || "/images/no-image.png",
      bigPrice: category.bigPrice || undefined,
      walletDiscount: category.walletDiscount || undefined,
    },
  });
  

  const handleImageChange = (images: { url: string }[]) => {
    const newImageUrl = images[0]?.url || "/images/no-image.png";
    setCurrentImage(newImageUrl);
    form.setValue("image", newImageUrl);
  };

  const handleSubmit = (values: z.infer<typeof categoryEditSchema>) => {
    startTransition(() => {
      categoryUpdate(category.id, {
        name: values.name,
        type: values.type || "",
        image: values.image,
        bigPrice: values.bigPrice, // Include bigPrice in the update
        walletDiscount: values.walletDiscount || 0,
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
              name: values.name,
              type: values.type || "",
              image: values.image || "/images/no-image.png",
              bigPrice: values.bigPrice, // Include bigPrice in updated category
            };

            onCategoryUpdate(updatedCategory);
            setOpen(false);
            form.reset();
            setTimeout(() => {
              toast.success("Category updated successfully!");

              // Update the category in parent component
              const updatedCategory: Category = {
                ...category,
                name: values.name,
                type: values.type || "",
                image: values.image || "/images/no-image.png",
                bigPrice: values.bigPrice, // Include bigPrice in updated category
              };

              onCategoryUpdate(updatedCategory);
              setOpen(false);
            }, 1000);
          }
        })
        .catch(() => toast.error("Something went wrong!"));
    });
  };

  // Reset form and image when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setCurrentImage(category.image || "/images/no-image.png");
      form.reset({
        id: category.id, // Fixed: should be category.id, not category.name
        name: category.name,
        type: category.type || "",
        image: category.image || "/images/no-image.png",
        bigPrice: category.bigPrice || 0,
        walletDiscount: category.walletDiscount || 0,
      });
    }
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
              name="bigPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Big Price (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={isPending}
                      placeholder="Enter big price"
                      value={field.value || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value ? parseFloat(value) : undefined);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="walletDiscount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Discount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      value={field.value ?? ""}
                      disabled={isPending}
                      placeholder="Enter flat discount in ₹"
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
