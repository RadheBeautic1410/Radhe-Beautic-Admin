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
// import { categoryUpdate } from "@/src/actions/category";

interface Category {
  name: string;
  count: number;
  type: string;
  countOfPiece: number;
  sellingPrice: number;
  actualPrice: number;
  image?: string;
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [currentImage, setCurrentImage] = useState<string>(
    category.image || "/images/no-image.png"
  );

  const form = useForm<z.infer<typeof categoryEditSchema>>({
    resolver: zodResolver(categoryEditSchema),
    defaultValues: {
      id: category.name, // Using name as ID, adjust if you have actual ID
      name: category.name,
      type: category.type || "",
      image: category.image || "/images/no-image.png",
    },
  });

  const handleImageChange = (images: { url: string }[]) => {
    const newImageUrl = images[0]?.url || "/images/no-image.png";
    setCurrentImage(newImageUrl);
    form.setValue("image", newImageUrl);
  };

  const handleSubmit = (values: z.infer<typeof categoryEditSchema>) => {
    startTransition(() => {
      categoryUpdate(values.id, {
        name: values.name,
        type: values.type || "",
        image: values.image,
      })
        .then((data) => {
          if (data.error) {
            toast.error(data.error);
            return;
          }
          if (data.success) {
            toast.success(data.success);

            // Update the category in parent component
            const updatedCategory: Category = {
              ...category,
              name: values.name,
              type: values.type || "",
              image: values.image || "/images/no-image.png",
            };

            onCategoryUpdate(updatedCategory);
            setOpen(false);
            form.reset();
          }
        })
        .catch(() => toast.error("Something went wrong!"));

      // Temporary simulation for demonstration
      setTimeout(() => {
        toast.success("Category updated successfully!");

        // Update the category in parent component
        const updatedCategory: Category = {
          ...category,
          name: values.name,
          type: values.type || "",
          image: values.image || "/images/no-image.png",
        };

        onCategoryUpdate(updatedCategory);
        setOpen(false);
      }, 1000);
    });
  };

  // Reset form and image when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setCurrentImage(category.image || "/images/no-image.png");
      form.reset({
        id: category.name,
        name: category.name,
        type: category.type || "",
        image: category.image || "/images/no-image.png",
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
      <DialogContent className="sm:max-w-[500px]">
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
                      disabled={isPending}
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
                        {/* <div className="flex-1">
                          <p className="text-sm text-gray-600">Current Image</p>
                          <p className="text-xs text-gray-400 break-all">
                            {currentImage}
                          </p>
                        </div> */}
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
