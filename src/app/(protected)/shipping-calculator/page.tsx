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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/src/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useTransition, useEffect, useState } from "react";
import {
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
  getAllShippingRates,
  calculateShippingRate as calcShippingRate,
} from "@/src/actions/shipping-rate";
import { Trash2, Edit, Search } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Switch } from "@/src/components/ui/switch";
import { DialogDemo } from "@/src/components/dialog-demo";

const shippingRateSchema = z.object({
  pincode: z.string().min(1, "Pincode is required"),
  rate: z.number().min(0, "Rate must be 0 or greater"),
  type: z.enum(["wildcard", "range", "exact"]).optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ShippingRateFormValues = z.infer<typeof shippingRateSchema>;

interface ShippingRate {
  id: string;
  pincode: string;
  rate: number;
  type: string;
  description?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingCalculatorPage = () => {
  const [isPending, startTransition] = useTransition();
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testPincode, setTestPincode] = useState("");
  const [calculatedRate, setCalculatedRate] = useState<number | null>(null);

  const form = useForm<ShippingRateFormValues>({
    resolver: zodResolver(shippingRateSchema),
    defaultValues: {
      pincode: "",
      rate: 0,
      type: undefined,
      description: "",
      isActive: true,
    },
  });

  // Determine type based on pincode input
  const watchPincode = form.watch("pincode");
  useEffect(() => {
    if (watchPincode) {
      if (watchPincode.includes("*")) {
        form.setValue("type", "wildcard");
      } else if (watchPincode.includes("-")) {
        form.setValue("type", "range");
      } else if (/^\d{6}$/.test(watchPincode)) {
        form.setValue("type", "exact");
      }
    }
  }, [watchPincode, form]);

  // Fetch shipping rates
  const fetchShippingRates = async () => {
    try {
      setLoading(true);
      const result = await getAllShippingRates();
      if (result.success && result.data) {
        setShippingRates(result.data as ShippingRate[]);
      } else if (result.error) {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Error fetching shipping rates:", error);
      toast.error("Failed to fetch shipping rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingRates();
  }, []);

  // Handle edit click
  const handleEditClick = (rate: ShippingRate) => {
    setEditingRate(rate);
    form.reset({
      pincode: rate.pincode,
      rate: rate.rate,
      type: rate.type as "wildcard" | "range" | "exact",
      description: rate.description || "",
      isActive: rate.isActive,
    });
    setEditDialogOpen(true);
  };

  const onSubmit = async (values: ShippingRateFormValues, closeDialog?: () => void) => {
    startTransition(async () => {
      try {
        // Ensure type is determined if not provided
        let finalValues = { ...values };
        if (!finalValues.type && finalValues.pincode) {
          if (finalValues.pincode.includes("*")) {
            finalValues.type = "wildcard";
          } else if (finalValues.pincode.includes("-")) {
            finalValues.type = "range";
          } else {
            finalValues.type = "exact";
          }
        }
        
        // Type assertion since we've ensured type is set
        const submitData = {
          ...finalValues,
          type: finalValues.type as "wildcard" | "range" | "exact",
        };
        
        let result;
        if (editingRate) {
          result = await updateShippingRate(editingRate.id, submitData);
        } else {
          result = await createShippingRate(submitData);
        }

        if (result.success) {
          toast.success(
            editingRate
              ? "Shipping rate updated successfully!"
              : "Shipping rate created successfully!"
          );
          if (editingRate) {
            setEditingRate(null);
            setEditDialogOpen(false);
          }
          form.reset({
            pincode: "",
            rate: 0,
            type: undefined,
            description: "",
            isActive: true,
          });
          closeDialog?.();
          await fetchShippingRates();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error saving shipping rate:", error);
        toast.error("Failed to save shipping rate. Please try again.");
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shipping rate?")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteShippingRate(id);
        if (result.success) {
          toast.success("Shipping rate deleted successfully!");
          await fetchShippingRates();
        } else if (result.error) {
          toast.error(result.error);
        }
      } catch (error) {
        console.error("Error deleting shipping rate:", error);
        toast.error("Failed to delete shipping rate. Please try again.");
      }
    });
  };

  const handleTestCalculate = async () => {
    if (!testPincode || !/^\d{6}$/.test(testPincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return;
    }

    try {
      const rate = await calcShippingRate(testPincode);
      setCalculatedRate(rate);
      if (rate === 0) {
        toast.info("No shipping rate found for this pincode");
      } else {
        toast.success(`Shipping rate: ₹${rate}`);
      }
    } catch (error) {
      console.error("Error calculating shipping rate:", error);
      toast.error("Failed to calculate shipping rate");
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "exact":
        return "bg-blue-500";
      case "range":
        return "bg-green-500";
      case "wildcard":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="rounded-none">
        <CardHeader className="flex py-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <CardTitle className="text-2xl font-semibold">🚚 Shipping Calculator</CardTitle>
            <div className="flex gap-2">
              <DialogDemo
                dialogTrigger={<Button>+ Add Shipping Rate</Button>}
                dialogTitle="Add New Shipping Rate"
                dialogDescription="Configure pincode-based shipping rates"
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
                        name="pincode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pincode Pattern</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., 364001, 364001-364005, or 36**"
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              Enter exact pincode (364001), range (364001-364005), or wildcard
                              (36**)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type (Auto-detected)</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={isPending}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Auto-detected from pincode" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="exact">Exact</SelectItem>
                                <SelectItem value="range">Range</SelectItem>
                                <SelectItem value="wildcard">Wildcard</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Type is auto-detected but can be manually set
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Shipping Rate (₹)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                min="0"
                                step="0.01"
                                value={field.value || ""}
                                onChange={(e) => {
                                  field.onChange(
                                    e.target.value ? parseFloat(e.target.value) : 0
                                  );
                                }}
                                disabled={isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} disabled={isPending} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Active</FormLabel>
                              <FormDescription>
                                Inactive rates won't be used for calculations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isPending}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            form.reset({
                              pincode: "",
                              rate: 0,
                              type: undefined,
                              description: "",
                              isActive: true,
                            });
                            closeDialog();
                          }}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isPending}>
                          {isPending ? "Saving..." : "Create Rate"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </DialogDemo>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Test Calculator */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Test Shipping Calculator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter 6-digit pincode to test (e.g., 364001)"
                  value={testPincode}
                  onChange={(e) => setTestPincode(e.target.value)}
                  maxLength={6}
                  className="max-w-xs"
                />
                <Button onClick={handleTestCalculate} disabled={isPending}>
                  <Search className="mr-2 h-4 w-4" />
                  Calculate
                </Button>
              </div>
              {calculatedRate !== null && (
                <div className="mt-4">
                  <p className="text-lg">
                    Shipping Rate: <span className="font-bold">₹{calculatedRate}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shipping Rates Table */}
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p>Loading...</p>
            </div>
          ) : shippingRates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No shipping rates configured. Add your first shipping rate!
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pincode Pattern</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Rate (₹)</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shippingRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">{rate.pincode}</TableCell>
                      <TableCell>
                        <Badge className={getTypeBadgeColor(rate.type)}>
                          {rate.type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{rate.rate}</TableCell>
                      <TableCell>{rate.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={rate.isActive ? "default" : "secondary"}>
                          {rate.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(rate.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(rate)}
                            disabled={isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(rate.id)}
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] !flex !flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Edit Shipping Rate</DialogTitle>
            <DialogDescription>Update shipping rate configuration</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) => {
                  onSubmit(values, () => setEditDialogOpen(false));
                })}
                className="space-y-6 pr-2"
              >
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode Pattern</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 364001, 364001-364005, or 36**"
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter exact pincode (364001), range (364001-364005), or wildcard (36**)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type (Auto-detected)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-detected from pincode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="exact">Exact</SelectItem>
                          <SelectItem value="range">Range</SelectItem>
                          <SelectItem value="wildcard">Wildcard</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Type is auto-detected but can be manually set
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping Rate (₹)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          step="0.01"
                          value={field.value || ""}
                          onChange={(e) => {
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : 0
                            );
                          }}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isPending} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Inactive rates won't be used for calculations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingRate(null);
                      setEditDialogOpen(false);
                      form.reset({
                        pincode: "",
                        rate: 0,
                        type: undefined,
                        description: "",
                        isActive: true,
                      });
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Update Rate"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingCalculatorPage;
