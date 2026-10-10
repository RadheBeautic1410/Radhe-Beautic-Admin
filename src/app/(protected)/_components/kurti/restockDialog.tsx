"use client";

import { stockAddition } from "@/src/actions/kurti";
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
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  STOCK_LOCATIONS,
  LOCATION_LABELS,
  StockLocation,
  VALID_SIZES,
  addToLocation,
  getLocationQty,
  getTotalQty,
} from "@/src/lib/godown";
import { downloadBarcodePdf } from "@/src/lib/barcodePdf";
import { Loader2, Plus, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type Additions = Record<StockLocation, number>;

interface Row {
  size: string;
  /** True for a size the kurti does not have yet. */
  isNew: boolean;
  add: Additions;
}

/** Sizes shown when the dialog opens; anything else is added with "Add new size". */
const DEFAULT_SIZES = ["M", "L", "XL", "XXL", "3XL"];

const emptyAdditions = (): Additions => ({ FLOOR_1: 0, FLOOR_2: 0, SHOP_316: 0, GODOWN: 0 });

/** Column order in the dialog: the godown first, since new stock lands there. */
const DISPLAY_LOCATIONS: StockLocation[] = ["GODOWN", "FLOOR_1", "FLOOR_2", "SHOP_316"];

const rowTotal = (row: Row) => STOCK_LOCATIONS.reduce((sum, loc) => sum + row.add[loc], 0);

const toQty = (val: string) => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const QTY_INPUT =
  "h-9 px-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

interface RestockDialogProps {
  /** Kurti code. */
  code: string;
  /** The kurti's current `sizes` rows (with per-location counts). */
  sizes: any[];
  /** Called after the stock was saved, so the caller can refresh its data. */
  onSaved?: () => void;
  /** Button that opens the dialog. */
  children: React.ReactNode;
}

export const RestockDialog: React.FC<RestockDialogProps> = ({ code, sizes, onSaved, children }) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const currentRow = (size: string) =>
    (sizes || []).find((s) => String(s.size).toUpperCase() === size.toUpperCase());

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;
    // M to 3XL by default, whether or not the kurti has them yet.
    setRows(
      DEFAULT_SIZES.map((size) => ({
        size,
        isNew: !currentRow(size),
        add: emptyAdditions(),
      }))
    );
  };

  const setAddition = (index: number, loc: StockLocation, qty: number) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, add: { ...r.add, [loc]: qty } } : r))
    );
  };

  const usedSizes = new Set(rows.map((r) => r.size));
  const freeSizes = VALID_SIZES.filter((s) => !usedSizes.has(s));

  const addSizeRow = (size: string) => {
    setRows((prev) => [...prev, { size, isNew: !currentRow(size), add: emptyAdditions() }]);
  };

  const totalAdded = rows.reduce((sum, r) => sum + rowTotal(r), 0);

  const save = async (withBarcodes: boolean) => {
    const changed = rows.filter((r) => rowTotal(r) > 0);
    if (changed.length === 0) {
      toast.error("Enter a quantity for at least one size");
      return;
    }

    // Absolute rows for stockAddition: existing sizes get the new pieces added
    // to the chosen locations, brand-new sizes are appended.
    const next = (sizes || []).map((s) => {
      const r = changed.find((c) => c.size === String(s.size).toUpperCase());
      if (!r) return s;
      return STOCK_LOCATIONS.reduce((acc, loc) => addToLocation(acc, r.add[loc], loc), s);
    });
    for (const r of changed.filter((c) => c.isNew)) {
      next.push(
        STOCK_LOCATIONS.reduce(
          (acc, loc) => addToLocation(acc, r.add[loc], loc),
          { size: r.size, quantity: 0 }
        )
      );
    }

    setSaving(true);
    try {
      const res: any = await stockAddition({ code, sizes: next });
      if (res?.error || !res?.success) {
        toast.error(res?.error || "Failed to update stock");
        return;
      }
      toast.success(`Added ${totalAdded} pieces`);
      onSaved?.();

      if (withBarcodes) {
        try {
          await downloadBarcodePdf(
            code,
            changed.map((r) => ({ size: r.size, quantity: rowTotal(r) }))
          );
          toast.success("Barcodes downloaded!");
        } catch (e: any) {
          console.error(e.message);
          toast.error("Stock saved, but barcodes failed to download");
        }
      }
      setOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error("Something went wrong!");
    } finally {
      setSaving(false);
    }
  };

  const grid = "grid grid-cols-[56px_repeat(4,minmax(64px,1fr))_32px] gap-2 items-start";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Add Stock - {code?.toUpperCase()}</DialogTitle>
          <DialogDescription>
            Enter the pieces to add for each size and where they go. Pieces added to the Godown are
            counted onto a floor or Shop 316 later.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-auto pr-1">
          <div className="min-w-[460px] space-y-2">
            <div
              className={`${grid} sticky top-0 z-10 bg-white pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500`}
            >
              <span className="px-1">Size</span>
              {DISPLAY_LOCATIONS.map((loc) => (
                <span key={loc} className="text-center">
                  {LOCATION_LABELS[loc]}
                </span>
              ))}
              <span />
            </div>

            {rows.length === 0 && (
              <p className="text-sm text-gray-400 py-2">No sizes - add one below.</p>
            )}

            {rows.map((row, index) => {
              const cur = currentRow(row.size);
              return (
                <div key={row.size} className={grid}>
                  <div className="h-9 flex flex-col justify-center px-1">
                    <span className="text-sm font-bold leading-none">{row.size}</span>
                    <span className="text-[10px] text-gray-400 leading-none mt-0.5">
                      has {cur ? getTotalQty(cur) : 0}
                    </span>
                  </div>
                  {DISPLAY_LOCATIONS.map((loc) => (
                    <div key={loc} className="flex flex-col items-center">
                      <Input
                        className={QTY_INPUT}
                        type="number"
                        min={0}
                        placeholder="0"
                        aria-label={`${row.size} add to ${LOCATION_LABELS[loc]}`}
                        value={row.add[loc] || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setAddition(index, loc, toQty(e.target.value))}
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5">
                        now {cur ? getLocationQty(cur, loc) : 0}
                      </span>
                    </div>
                  ))}
                  {row.isNew ? (
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      className="h-9 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                      aria-label={`Remove size ${row.size}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {freeSizes.length > 0 && (
          <Select value="" onValueChange={addSizeRow}>
            <SelectTrigger className="self-start h-8 w-[150px] text-xs font-semibold border-dashed">
              <Plus className="w-3.5 h-3.5 mr-1" />
              <SelectValue placeholder="Add new size" />
            </SelectTrigger>
            <SelectContent>
              {freeSizes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter className="gap-2 sm:items-center">
          <span className="text-xs font-semibold text-gray-500 sm:mr-auto">
            {totalAdded > 0 ? `${totalAdded} pieces to add` : ""}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={saving || totalAdded === 0}
            onClick={() => save(false)}
            className="font-semibold"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save Stock
          </Button>
          <Button
            type="button"
            disabled={saving || totalAdded === 0}
            onClick={() => save(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
            Save & Download Barcodes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
