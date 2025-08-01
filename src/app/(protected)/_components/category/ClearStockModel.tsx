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

const clearStockSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

interface ClearStockModalProps {
  categoryCode: string;
  categoryName?: string;
  onClearStock: (
    categoryCode: string,
    password: string
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

  const form = useForm<z.infer<typeof clearStockSchema>>({
    resolver: zodResolver(clearStockSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof clearStockSchema>) => {
    startTransition(() => {
      onClearStock(categoryCode, values.password)
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
              ? `You are about to clear all stock for "${categoryName}" (${categoryCode}).`
              : `You are about to clear all stock for category "${categoryCode}".`}
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

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <div className="font-semibold mb-1">Warning:</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All stock quantities will be set to 0</li>
                    <li>This action is permanent and cannot be undone</li>
                    <li>
                      All inventory data for this category will be cleared
                    </li>
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
