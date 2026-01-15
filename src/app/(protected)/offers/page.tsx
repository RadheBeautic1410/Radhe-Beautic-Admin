"use client";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { DialogDemo } from "@/src/components/dialog-demo";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useTransition, useEffect, useState } from "react";
import { createOffer, getAllOffers, deleteOffer, updateOffer } from "@/src/actions/offer";
import ImageUpload2 from "../_components/upload/imageUpload2";
import { Trash2, Check, ChevronsUpDown, X, Pencil } from "lucide-react";
import Image from "next/image";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command";
import { Badge } from "@/src/components/ui/badge";
import { cn } from "@/src/lib/utils";
import { DeleteConfirmationDialog } from "@/src/components/delete-confirmation-dialog";

const offerSchema = z.object({
  name: z.string().min(1, "Offer name is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  totalAmount: z.number().min(0, "Total amount must be 0 or greater").optional(),
  categories: z.array(z.string()).min(1, "At least one category must be selected"),
  image: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerSchema>;

interface Offer {
  id: string;
  name: string;
  qty: number;
  totalAmount?: number | null;
  categories: string[];
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Category {
  id: string;
  name: string;
}

const OffersPage = () => {
  const [isPending, startTransition] = useTransition();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [offerToEdit, setOfferToEdit] = useState<Offer | null>(null);

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerSchema),
    defaultValues: {
      name: "",
      qty: 1,
      totalAmount: undefined,
      categories: [],
      image: "",
    },
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/category?page=1&limit=500");
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setCategories(json.data);
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch offers function
  const fetchOffers = async () => {
    try {
      setLoading(true);
      const result = await getAllOffers();
      if (result.success && result.data) {
        setOffers(result.data as Offer[]);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to fetch offers");
    } finally {
      setLoading(false);
    }
  };

  // Fetch offers on mount
  useEffect(() => {
    fetchOffers();
  }, []);

  const onSubmit = async (values: OfferFormValues, closeDialog?: () => void) => {
    // Validate categories
    if (selectedCategories.length === 0) {
      toast.error("Please select at least one category");
      return;
    }

    // Validate image (only for new offers, not when editing)
    if (!offerToEdit && (images.length === 0 || !images[0]?.url)) {
      toast.error("Please upload an image");
      return;
    }

    startTransition(async () => {
      try {
        const imageUrl = images.length > 0 && images[0]?.url 
          ? images[0].url 
          : (offerToEdit?.image || "");

        const result = offerToEdit
          ? await updateOffer(offerToEdit.id, {
              name: values.name.trim(),
              qty: values.qty,
              totalAmount: values.totalAmount,
              categories: selectedCategories,
              image: imageUrl,
            })
          : await createOffer({
              name: values.name.trim(),
              qty: values.qty,
              totalAmount: values.totalAmount,
              categories: selectedCategories,
              image: imageUrl,
            });

        if (result.success) {
          toast.success(offerToEdit ? "Offer updated successfully!" : "Offer created successfully!");
          
          // Reset form
          form.reset({
            name: "",
            qty: 1,
            totalAmount: undefined,
            categories: [],
            image: "",
          });
          setSelectedCategories([]);
          setImages([]);
          setOfferToEdit(null);
          setEditDialogOpen(false);
          
          // Close dialog
          closeDialog?.();
          
          // Refresh offers list immediately
          await fetchOffers();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error creating offer:", error);
        toast.error("Failed to create offer. Please try again.");
      }
    });
  };

  const handleDeleteClick = (offerId: string) => {
    setOfferToDelete(offerId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!offerToDelete) return;

    startTransition(async () => {
      try {
        const result = await deleteOffer(offerToDelete);
        if (result.success) {
          toast.success("Offer deleted successfully!");
          setDeleteDialogOpen(false);
          setOfferToDelete(null);
          // Refresh offers list
          await fetchOffers();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error deleting offer:", error);
        toast.error("Failed to delete offer. Please try again.");
      }
    });
  };

  const handleEditClick = (offer: Offer) => {
    setOfferToEdit(offer);
    form.reset({
      name: offer.name,
      qty: offer.qty,
      totalAmount: offer.totalAmount ?? undefined,
      categories: offer.categories,
      image: offer.image || "",
    });
    setSelectedCategories(offer.categories);
    if (offer.image) {
      setImages([{ url: offer.image }]);
    } else {
      setImages([]);
    }
    setEditDialogOpen(true);
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const updated = prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId];
      form.setValue("categories", updated);
      return updated;
    });
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="rounded-none">
        <CardHeader className="flex py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 w-full">
            <CardTitle className="text-2xl font-semibold">🎁 Offers</CardTitle>
            <div>
              <Button asChild>
                <DialogDemo
                  dialogTrigger="+ Add Offer"
                  dialogTitle="Add New Offer"
                  dialogDescription="Fill out the form to add a new offer"
                  dialogContentClassName="sm:max-w-[600px]"
                >
                  {(closeDialog) => (
                    <Form {...form}>
                      <form
                        onSubmit={form.handleSubmit((values) => {
                          onSubmit(values, closeDialog);
                        })}
                        className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
                      >
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Offer Name</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                disabled={isPending}
                                placeholder="Enter offer name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                disabled={isPending}
                                placeholder="Enter quantity"
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="totalAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Amount (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                disabled={isPending}
                                placeholder="Enter total amount"
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Categories (Multi-select)</FormLabel>
                        <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between min-h-[42px] h-auto",
                                  !selectedCategories.length && "text-muted-foreground"
                                )}
                                disabled={isPending}
                              >
                                <div className="flex flex-wrap gap-1 flex-1 items-center">
                                  {selectedCategories.length > 0 ? (
                                    selectedCategories.map((categoryId) => {
                                      const category = categories.find((c) => c.id === categoryId);
                                      return (
                                        <Badge
                                          key={categoryId}
                                          variant="secondary"
                                          className="mr-1 mb-1"
                                        >
                                          {category?.name || categoryId}
                                          <button
                                            type="button"
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                toggleCategory(categoryId);
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                            }}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              toggleCategory(categoryId);
                                            }}
                                          >
                                            <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                          </button>
                                        </Badge>
                                      );
                                    })
                                  ) : (
                                    <span>Select categories...</span>
                                  )}
                                </div>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search categories..." />
                              <CommandList>
                                <CommandEmpty>No category found.</CommandEmpty>
                                <CommandGroup>
                                  {categories.map((category) => {
                                    const isSelected = selectedCategories.includes(category.id);
                                    return (
                                      <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => {
                                          toggleCategory(category.id);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <span>{category.name}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {selectedCategories.length === 0 && (
                          <p className="text-sm text-red-500 mt-1">
                            Please select at least one category
                          </p>
                        )}
                        {selectedCategories.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Selected: {selectedCategories.length} category
                            {selectedCategories.length !== 1 ? "ies" : "y"}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>

                      <FormItem>
                        <FormLabel>Image</FormLabel>
                        <ImageUpload2
                          onImageChange={(imgs) => {
                            setImages(imgs);
                            if (imgs.length > 0) {
                              form.setValue("image", imgs[0].url);
                            }
                          }}
                          images={images}
                          singleFile={true}
                        />
                      </FormItem>

                        <Button type="submit" disabled={isPending}>
                          {isPending ? "Submitting..." : "Submit"}
                        </Button>
                      </form>
                    </Form>
                  )}
                </DialogDemo>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading offers...</div>
          ) : offers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No offers found. Create your first offer!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      {offer.image ? (
                        <Image
                          src={offer.image}
                          alt={offer.name}
                          width={50}
                          height={50}
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{offer.name}</TableCell>
                    <TableCell>{offer.qty}</TableCell>
                    <TableCell>
                      {offer.totalAmount !== null && offer.totalAmount !== undefined
                        ? `₹${offer.totalAmount.toFixed(2)}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {offer.categories.slice(0, 3).map((catId) => (
                          <span
                            key={catId}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                          >
                            {getCategoryName(catId)}
                          </span>
                        ))}
                        {offer.categories.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{offer.categories.length - 3} more
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(offer)}
                          disabled={isPending}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(offer.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <DialogDemo
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            // Reset form and state when dialog closes
            form.reset({
              name: "",
              qty: 1,
              totalAmount: undefined,
              categories: [],
              image: "",
            });
            setSelectedCategories([]);
            setImages([]);
            setOfferToEdit(null);
          }
        }}
        dialogTrigger=""
        dialogTitle="Edit Offer"
        dialogDescription="Update the offer details"
        dialogContentClassName="sm:max-w-[600px]"
      >
        {(closeDialog) => (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => {
                onSubmit(values, closeDialog);
              })}
              className="space-y-6 max-h-[70vh] overflow-y-auto pr-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Offer Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isPending}
                        placeholder="Enter offer name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        disabled={isPending}
                        placeholder="Enter quantity"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        disabled={isPending}
                        placeholder="Enter total amount"
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Categories (Multi-select)</FormLabel>
                <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between min-h-[42px] h-auto",
                          !selectedCategories.length && "text-muted-foreground"
                        )}
                        disabled={isPending}
                      >
                        <div className="flex flex-wrap gap-1 flex-1 items-center">
                          {selectedCategories.length > 0 ? (
                            selectedCategories.map((categoryId) => {
                              const category = categories.find((c) => c.id === categoryId);
                              return (
                                <Badge
                                  key={categoryId}
                                  variant="secondary"
                                  className="mr-1 mb-1"
                                >
                                  {category?.name || categoryId}
                                  <button
                                    type="button"
                                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleCategory(categoryId);
                                      }
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleCategory(categoryId);
                                    }}
                                  >
                                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                  </button>
                                </Badge>
                              );
                            })
                          ) : (
                            <span>Select categories...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search categories..." />
                      <CommandList>
                        <CommandEmpty>No category found.</CommandEmpty>
                        <CommandGroup>
                          {categories.map((category) => {
                            const isSelected = selectedCategories.includes(category.id);
                            return (
                              <CommandItem
                                key={category.id}
                                value={category.name}
                                onSelect={() => {
                                  toggleCategory(category.id);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <span>{category.name}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCategories.length === 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    Please select at least one category
                  </p>
                )}
                {selectedCategories.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {selectedCategories.length} category
                    {selectedCategories.length !== 1 ? "ies" : "y"}
                  </p>
                )}
                <FormMessage />
              </FormItem>

              <FormItem>
                <FormLabel>Image</FormLabel>
                <ImageUpload2
                  onImageChange={(imgs) => {
                    setImages(imgs);
                    if (imgs.length > 0) {
                      form.setValue("image", imgs[0].url);
                    }
                  }}
                  images={images}
                  singleFile={true}
                />
              </FormItem>

              <Button type="submit" disabled={isPending}>
                {isPending ? "Updating..." : "Update Offer"}
              </Button>
            </form>
          </Form>
        )}
      </DialogDemo>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Offer"
        itemName={offers.find((o) => o.id === offerToDelete)?.name}
        isLoading={isPending}
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </div>
  );
};

export default OffersPage;

