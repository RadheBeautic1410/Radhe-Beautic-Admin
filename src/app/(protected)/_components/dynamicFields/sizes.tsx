"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
    COUNTED_LOCATIONS,
    LOCATION_KEYS,
    LOCATION_LABELS,
    STOCK_LOCATIONS,
    StockLocation,
    getGodownQty,
    getLocationQty,
    getTotalQty,
    needsFloorMove,
    normalizeSizeLocations,
} from "@/src/lib/godown";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];

// Header, rows and footer share one grid so the columns always line up.
// Columns: size | ground floor | 1st floor | shop 316 | godown | total | remove
const GRID_WITH_LOCATIONS = "grid grid-cols-[72px_repeat(4,minmax(52px,1fr))_minmax(52px,1fr)_32px] gap-2 items-center";
// Columns: size | total | remove
const GRID_PLAIN = "grid grid-cols-[96px_minmax(64px,1fr)_32px] gap-2 items-center";

// Hide the browser spinners - they cover the digits in narrow cells.
const QTY_INPUT =
    "h-9 px-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

interface SingleSizeProps {
    row: any;
    onChange: (row: any) => void;
    showGodown?: boolean;
}

const toQty = (val: string) => {
    const n = parseInt(val, 10);
    return Number.isFinite(n) ? n : 0;
};

const SingleSize: React.FC<SingleSizeProps> = ({ row, onChange, showGodown }) => {
    const emit = (patch: any) => onChange({ ...row, ...patch });

    // With locations on, the total is not typed: it is ground + 1st + 316 + godown.
    // Editing one location leaves the others (godown included) as they are.
    const emitLocation = (location: StockLocation, qty: number) => {
        const counts: Record<string, number> = {};
        for (const loc of STOCK_LOCATIONS) counts[loc] = getLocationQty(row, loc);
        counts[location] = qty;
        const next = normalizeSizeLocations(row);
        for (const loc of COUNTED_LOCATIONS) next[LOCATION_KEYS[loc]] = counts[loc];
        next.quantity = STOCK_LOCATIONS.reduce((sum, loc) => sum + counts[loc], 0);
        onChange(next);
    };

    if (showGodown) {
        return (
            <>
                <Select onValueChange={(e) => emit({ size: e })} value={row.size}>
                    <SelectTrigger className="h-9 px-2 text-sm font-semibold">
                        <SelectValue>{row.size}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {selectSizes.map((org) => (
                            <SelectItem key={org} value={org}>
                                {org}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {STOCK_LOCATIONS.map((loc) => (
                    <Input
                        key={loc}
                        className={`${QTY_INPUT} ${
                            loc === "GODOWN" && needsFloorMove(row) ? "bg-amber-100 text-amber-800 font-bold" : ""
                        }`}
                        type="number"
                        min={0}
                        placeholder="0"
                        aria-label={`${row.size} ${LOCATION_LABELS[loc]}`}
                        value={getLocationQty(row, loc)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => emitLocation(loc, Math.max(0, toQty(e.target.value)))}
                    />
                ))}
                <span
                    className="h-9 flex items-center justify-center text-sm font-bold rounded-md bg-slate-100 text-slate-700"
                    title="Total = Ground Floor + 1st Floor + Shop 316 + Godown"
                    aria-label={`${row.size} total`}
                >
                    {getTotalQty(row)}
                </span>
            </>
        );
    }

    return (
        <>
            <Select onValueChange={(e) => emit({ size: e })} value={row.size}>
                <SelectTrigger className="h-9 px-2 text-sm font-semibold">
                    <SelectValue>{row.size}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {selectSizes.map((org) => (
                        <SelectItem key={org} value={org}>
                            {org}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                className={`${QTY_INPUT} font-semibold`}
                type="number"
                min={0}
                placeholder="Total"
                aria-label={`${row.size} total`}
                value={row.quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => emit({ quantity: toQty(e.target.value) })}
            />
        </>
    );
};

interface AddSizeFormProps {
    onAddSize: (sizes: any[]) => void;
    preSizes: any[];
    sizes: any[];
    /** Show per-location inputs (ground / 1st floor, Shop 316, godown) with the total derived from them. */
    showGodown?: boolean;
}

export const AddSizeForm: React.FC<AddSizeFormProps> = ({ onAddSize, sizes, showGodown }) => {
    const grid = showGodown ? GRID_WITH_LOCATIONS : GRID_PLAIN;

    const handleAddSize = () => {
        for (let i = 0; i < sizes.length; i++) {
            for (let j = 0; j < sizes.length; j++) {
                if (i !== j && sizes[i].size === sizes[j].size) {
                    toast.error(`Size: ${sizes[i].size} is slected more than once.!!!`);
                    return;
                }
            }
        }
        // Default to the first size not already in the list
        const used = new Set(sizes.map((s) => s.size));
        const nextSize = selectSizes.find((s) => !used.has(s)) || "XS";
        let obj: any = { size: nextSize, quantity: 0 };
        if (showGodown) obj = normalizeSizeLocations(obj);
        onAddSize([...sizes, obj]);
    };

    const handleRemoveSize = (index: number) => {
        const updatedSizes = sizes.filter((_, i) => i !== index);
        onAddSize(updatedSizes);
    };

    const columnTotal = (fn: (s: any) => number) => sizes.reduce((sum, s) => sum + fn(s), 0);

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="overflow-x-auto">
                <div className={showGodown ? "min-w-[480px]" : ""}>
                    {sizes.length > 0 && (
                        <div
                            className={`${grid} sticky top-0 z-10 bg-white pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wide leading-tight`}
                        >
                            <span className="px-1">Size</span>
                            {!showGodown && <span className="text-center">Total</span>}
                            {showGodown &&
                                COUNTED_LOCATIONS.map((loc) => (
                                    <span key={loc} className="text-center">{LOCATION_LABELS[loc]}</span>
                                ))}
                            {showGodown && <span className="text-center">Godown</span>}
                            {showGodown && <span className="text-center">Total</span>}
                            <span />
                        </div>
                    )}

                    <div className="flex flex-col gap-2">
                        {sizes.map((obj, index) => (
                            <div key={index} className={grid}>
                                <SingleSize
                                    row={obj}
                                    showGodown={showGodown}
                                    onChange={(row: any) => {
                                        const updatedSizes = [...sizes];
                                        updatedSizes[index] = row;
                                        onAddSize(updatedSizes);
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveSize(index)}
                                    className="h-8 w-8 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title={`Remove size ${obj.size}`}
                                    aria-label={`Remove size ${obj.size}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {showGodown && sizes.length > 1 && (
                        <div className={`${grid} mt-2 pt-2 border-t border-gray-200 text-sm font-bold text-gray-700`}>
                            <span className="px-1 text-[10px] uppercase tracking-wide text-gray-500">Total</span>
                            {COUNTED_LOCATIONS.map((loc) => (
                                <span key={loc} className="text-center">
                                    {columnTotal((s) => getLocationQty(s, loc))}
                                </span>
                            ))}
                            <span className="text-center">{columnTotal(getGodownQty)}</span>
                            <span className="text-center">{columnTotal(getTotalQty)}</span>
                            <span />
                        </div>
                    )}
                </div>
            </div>

            {showGodown && sizes.some(needsFloorMove) && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    ⚠️ Some sizes have nothing on either showroom floor - their pieces are in the godown.
                </p>
            )}
            <Button
                type="button"
                variant="outline"
                onClick={handleAddSize}
                className="self-start h-8 px-3 text-xs font-semibold border-dashed"
            >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Size
            </Button>
        </div>
    );
};
