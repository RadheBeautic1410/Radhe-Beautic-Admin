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
import { AlertTriangle } from "lucide-react";
import { LOCATION_LABELS, STOCK_LOCATIONS, StockLocation } from "@/src/lib/godown";

const clearStockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

interface ClearStockModalProps {
  categoryCode: string;
  categoryName?: string;
  /** `location` empty = clear every location (the whole category). */
  onClearStock: (
    categoryCode: string,
    password: string,
    location?: StockLocation
  ) => Promise<{ success?: boolean; error?: string }>;
  trigger?: React.ReactNode;
}

const ClearStockModal = ({
  categoryCode,
  categoryName,
  onClearStock,
  trigger,
}: ClearStockModalProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [location, setLocation] = useState<StockLocation | "ALL">("ALL");
  const where = location === "ALL" ? "every location" : LOCATION_LABELS[location];

  const form = useForm<z.infer<typeof clearStockSchema>>({
    resolver: zodResolver(clearStockSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof clearStockSchema>) => {
    startTransition(() => {
      onClearStock(
        categoryCode,
        values.password,
        location === "ALL" ? undefined : location
      )
        .then((data) => {
        //   if (data.error) {
        //     toast.error(data.error);
        //     return;
        //   }
        //   if (data.success) {
        //     toast.success(data.success);
        //     form.reset();
        //   }
            setOpen(false);
        })
        .catch((error) => {
          console.error("Clear stock error:", error);
          toast.error("Something went wrong!");
        });
    });
  };

  // Reset form when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      form.reset({
        password: "",
      });
      setLocation("ALL");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive" size="sm">
            Clear Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] overflow-auto max-h-[90%]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-red-600">Clear Stock</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600">
            {categoryName
              ? `You are about to clear the stock of "${categoryName}" (${categoryCode}) in ${where}.`
              : `You are about to clear the stock of category "${categoryCode}" in ${where}.`}
            <br />
            <span className="font-semibold text-red-600">
              This action cannot be undone. Please enter your password to
              confirm.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="bg-gray-50 p-3 rounded-lg border">
              <div className="text-sm text-gray-600 mb-1">Category Code:</div>
              <div className="font-mono font-semibold text-gray-900">
                {categoryCode}
              </div>
              {categoryName && (
                <>
                  <div className="text-sm text-gray-600 mb-1 mt-2">
                    Category Name:
                  </div>
                  <div className="font-semibold text-gray-900">
                    {categoryName}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-gray-700">What to clear</div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", ...STOCK_LOCATIONS] as (StockLocation | "ALL")[]).map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    disabled={isPending}
                    onClick={() => setLocation(loc)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-semibold ${
                      location === loc
                        ? "bg-red-600 border-red-600 text-white"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {loc === "ALL" ? "All locations" : LOCATION_LABELS[loc]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-600">
                For a stock-take of one place, clear only that location, then
                re-scan its pieces in Add Stock with &quot;Add to&quot; set to the same
                location.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <div className="font-semibold mb-1">Warning:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      {location === "ALL"
                        ? "All stock quantities will be set to 0"
                        : `Stock in ${where} will be set to 0 - other locations keep their pieces`}
                    </li>
                    <li>This action is permanent and cannot be undone</li>
                  </ul>
                </div>
              </div>
            </div>

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-red-600 font-semibold">
                    Enter Password to Confirm *
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      disabled={isPending}
                      placeholder="Enter your password"
                      className="border-red-300 focus:border-red-500 focus:ring-red-500"
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isPending}
                className="min-w-[120px]"
              >
                {isPending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Clearing...</span>
                  </div>
                ) : (
                  "Clear Stock"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClearStockModal;
