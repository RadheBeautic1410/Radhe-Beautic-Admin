"use client";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { AddSizeForm } from "../dynamicFields/sizes";
import { downloadBarcodePdf } from "@/src/lib/barcodePdf";

interface CustomBarcodeDialogProps {
  /** Kurti code - used as the barcode text and the PDF file name. */
  code: string;
  /** The kurti's sizes; the dialog opens with these at quantity 0. */
  sizes: { size: string }[];
  /** Button that opens the dialog. */
  children: React.ReactNode;
}

export const CustomBarcodeDialog: React.FC<CustomBarcodeDialogProps> = ({
  code,
  sizes,
  children,
}) => {
  const [rows, setRows] = useState<{ size: string; quantity: number }[]>([]);
  const [downloading, setDownloading] = useState(false);

  // Pre-fill with the kurti's own sizes at quantity 0, so the user only types
  // the number of labels per size.
  const handleOpenChange = (open: boolean) => {
    if (!open || rows.length > 0) return;
    setRows((sizes || []).map((s) => ({ size: s.size, quantity: 0 })));
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const done = await downloadBarcodePdf(code, rows);
      if (!done) {
        toast.error("Enter a quantity for at least one size");
        return;
      }
      toast.success("Barcodes downloaded!");
    } catch (e: any) {
      console.error(e.message);
      toast.error("Failed to download barcodes");
    } finally {
      setDownloading(false);
    }
  };


  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Download Custom Barcodes</DialogTitle>
          <DialogDescription>
            Enter the number of labels for each size of {code?.toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-60 overflow-y-auto pr-1">
          <AddSizeForm preSizes={[]} sizes={rows} onAddSize={setRows} />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {downloading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Generate & Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
