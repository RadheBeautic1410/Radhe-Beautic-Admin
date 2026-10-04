"use client";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { LOCATION_LABELS, StockLocation, getLocationQty } from "@/src/lib/godown";
import axios from "axios";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

interface BulkMoveDialogProps {
  /** Design code as typed or scanned, with or without the size. */
  code: string;
  from: StockLocation;
  to: StockLocation;
  /** Called with the updated product after a successful move. */
  onMoved: (kurti: any) => void;
}

/**
 * "Move multiple sizes" for /godown, like Hall Sales' "Add multiple sizes": pick
 * sizes (or all of them, for a full set) and how many pieces of each to move
 * from `from` to `to` in one go.
 */
export const BulkMoveDialog: React.FC<BulkMoveDialogProps> = ({ code, from, to, onMoved }) => {
  const [open, setOpen] = useState(false);
  const [kurti, setKurti] = useState<any>(null);
  // size -> pieces to move; a size is selected while it has a quantity
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const sizes: { size: string; available: number }[] = (kurti?.sizes || [])
    .filter((s: any) => s)
    .map((s: any) => ({
      size: String(s.size).toUpperCase(),
      available: getLocationQty(s, from),
    }));
  const movable = sizes.filter((s) => s.available > 0);
  const selected = Object.entries(qty).filter(([, n]) => n > 0);
  const pieces = selected.reduce((sum, [, n]) => sum + n, 0);
  const allSelected = movable.length > 0 && movable.every((s) => (qty[s.size] || 0) > 0);

  const openFor = async () => {
    if (code.trim().length < 6) {
      toast.error("Enter the design code first, e.g. JR41223");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.post(`/api/kurti/find-kurti`, { code: code.trim() });
      const data = res.data.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setKurti(data.kurti);
      setQty({});
      setOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Error finding product");
    } finally {
      setLoading(false);
    }
  };

  const setSize = (size: string, n: number, available: number) =>
    setQty((prev) => ({ ...prev, [size]: Math.max(0, Math.min(available, n)) }));

  const move = async () => {
    if (!selected.length) {
      toast.error("Select at least one size");
      return;
    }
    try {
      setSaving(true);
      const res = await axios.post(`/api/kurti/godown/move`, {
        code: kurti.code,
        from,
        to,
        sizes: selected.map(([size, quantity]) => ({ size, quantity })),
      });
      const data = res.data.data;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(data.success);
      setOpen(false);
      onMoved(data.data);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className="mt-5" onClick={openFor} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
        Move multiple sizes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Move multiple sizes - {kurti?.code}</DialogTitle>
            <DialogDescription>
              From <b>{LOCATION_LABELS[from]}</b> to <b>{LOCATION_LABELS[to]}</b>. Numbers show
              the pieces in {LOCATION_LABELS[from]}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={!movable.length}
                  onChange={(e) =>
                    setQty(
                      e.target.checked
                        ? Object.fromEntries(movable.map((s) => [s.size, 1]))
                        : {}
                    )
                  }
                />
                <span className="text-sm font-medium">Full set (1 of each size)</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-auto"
                disabled={!movable.length}
                onClick={() =>
                  setQty(Object.fromEntries(movable.map((s) => [s.size, s.available])))
                }
              >
                All pieces
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto"
                disabled={!selected.length}
                onClick={() => setQty({})}
              >
                Clear
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sizes.map((s) => {
                const n = qty[s.size] || 0;
                return (
                  <div
                    key={s.size}
                    className={`flex items-center gap-2 rounded-md border px-2 py-2 ${
                      s.available ? "" : "opacity-50"
                    } ${n > 0 ? "border-slate-800 bg-slate-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={n > 0}
                      disabled={!s.available}
                      onChange={(e) => setSize(s.size, e.target.checked ? 1 : 0, s.available)}
                    />
                    <span className="text-sm font-medium">{s.size}</span>
                    {n > 0 ? (
                      <Input
                        type="number"
                        min={1}
                        max={s.available}
                        value={n}
                        onChange={(e) =>
                          setSize(s.size, parseInt(e.target.value, 10) || 1, s.available)
                        }
                        className="ml-auto h-7 w-14 px-1 text-sm"
                      />
                    ) : (
                      <span className="ml-auto text-xs text-gray-500">{s.available}</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <span className="text-sm text-gray-600">
                {pieces} piece(s) in {selected.length} size(s)
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={move} disabled={saving || !selected.length}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
                  Move to {LOCATION_LABELS[to]}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
