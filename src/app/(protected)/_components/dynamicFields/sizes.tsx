"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import {
    COUNTED_LOCATIONS,
    LOCATION_KEYS,
    LOCATION_LABELS,
    getGodownQty,
    getLocationQty,
    needsFloorMove,
    normalizeSizeLocations,
} from "@/src/lib/godown";
import { toast } from "sonner";

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
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];

    // With locations on, every edit writes explicit floor/316 counts so the
    // godown (the remainder) absorbs any change to the total.
    const emit = (patch: any) => {
        if (!showGodown) {
            onChange({ ...row, ...patch });
            return;
        }
        onChange({ ...normalizeSizeLocations(row), ...patch });
    };

    const inputWidth = showGodown ? "ml-2 w-[14%]" : "ml-2 w-[30%]";

    return (
        <>
            <Select onValueChange={(e) => emit({ size: e })} defaultValue={row.size}>
                <SelectTrigger className={showGodown ? "w-[16%]" : "w-[20%]"}>
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
                className={inputWidth}
                type="number"
                placeholder="Total"
                value={row.quantity}
                onChange={(e) => emit({ quantity: toQty(e.target.value) })}
            />
            {showGodown &&
                COUNTED_LOCATIONS.map((loc) => (
                    <Input
                        key={loc}
                        className={inputWidth}
                        type="number"
                        min={0}
                        placeholder={LOCATION_LABELS[loc]}
                        value={getLocationQty(row, loc)}
                        onChange={(e) => emit({ [LOCATION_KEYS[loc]]: toQty(e.target.value) })}
                    />
                ))}
        </>
    );
};

interface AddSizeFormProps {
    onAddSize: (sizes: any[]) => void;
    preSizes: any[];
    sizes: any[];
    /** Show per-location inputs (1st / 2nd floor, Shop 316) and the derived godown count. */
    showGodown?: boolean;
}

export const AddSizeForm: React.FC<AddSizeFormProps> = ({ onAddSize, sizes, showGodown }) => {

    const handleAddSize = () => {
        let obj: any = { size: 'XS', quantity: 0 };
        if (showGodown) obj = normalizeSizeLocations(obj);
        for (let i = 0; i < sizes.length; i++) {
            for (let j = 0; j < sizes.length; j++) {
                if (i !== j && sizes[i].size === sizes[j].size) {
                    toast.error(`Size: ${sizes[i].size} is slected more than once.!!!`);
                    return;
                }
            }
        }
        const newSizes = [...sizes, obj]; // Default size 'XS' added
        onAddSize(newSizes);
    };

    const handleRemoveSize = (index: number) => {
        const updatedSizes = sizes.filter((_, i) => i !== index);
        onAddSize(updatedSizes);
    };

    return (
        <div className="flex flex-col gap-2 w-[100%]">
            {showGodown && sizes.length > 0 && (
                <div className="flex items-center text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <span className="w-[16%]">Size</span>
                    <span className="ml-2 w-[14%]">Total</span>
                    {COUNTED_LOCATIONS.map((loc) => (
                        <span key={loc} className="ml-2 w-[14%]">{LOCATION_LABELS[loc]}</span>
                    ))}
                    <span className="ml-2">Godown</span>
                </div>
            )}
            {sizes.map((obj, index) => (
                <div key={index} className="flex items-center">
                    <SingleSize
                        row={obj}
                        showGodown={showGodown}
                        onChange={(row: any) => {
                            const updatedSizes = [...sizes];
                            updatedSizes[index] = row;
                            onAddSize(updatedSizes);
                        }}
                    />
                    {showGodown && (
                        <span
                            className={`ml-2 min-w-[3.5rem] text-center text-xs font-bold rounded-md px-2 py-1 ${
                                needsFloorMove(obj)
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-100 text-slate-700"
                            }`}
                            title="Godown = Total - 1st Floor - 2nd Floor - Shop 316"
                        >
                            {getGodownQty(obj)}
                        </span>
                    )}
                    <Button type="button" className="ml-2" onClick={() => handleRemoveSize(index)}>Remove</Button>
                </div>
            ))}
            {showGodown && sizes.some(needsFloorMove) && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    ⚠️ Some sizes have nothing on either showroom floor - their pieces are in the godown.
                </p>
            )}
            <Button className="w-[30%]" type="button" onClick={handleAddSize}>
                + Add
            </Button>
        </div>
    );
};
