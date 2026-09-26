"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { getFloorQty, getTotalQty } from "@/src/lib/godown";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SingleSizeProps {
    onSetSize: (size: string, quantity: number, godownQuantity: number) => void;
    quantity: any;
    size: any;
    godownQuantity?: any;
    showGodown?: boolean;
}

const SingleSize: React.FC<SingleSizeProps> = ({ onSetSize, quantity, size, godownQuantity, showGodown }) => {
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const [selectedSize, setSelectedSize] = useState<string>(size);
    const [selectedQuantity, setQuantity] = useState(quantity);
    const [selectedGodown, setGodown] = useState(godownQuantity || 0);
    useEffect(() => {
        onSetSize(size, quantity, godownQuantity || 0);
    }, [])
    const handleChange = (e: any) => {
        setSelectedSize(e);
        onSetSize(e, selectedQuantity, selectedGodown);
    };
    const handleQuantityChange = (e: any) => {
        let quan = parseInt(e.target.value)
        setQuantity(quan);
        onSetSize(selectedSize, quan, selectedGodown);
    }
    const handleGodownChange = (e: any) => {
        let godown = parseInt(e.target.value)
        setGodown(godown);
        onSetSize(selectedSize, selectedQuantity, godown);
    }
    return (
        <>
            <Select
                onValueChange={(e) => handleChange(e)}
                defaultValue={size}
            >

                <SelectTrigger className={showGodown ? "w-[16%]" : "w-[20%]"}>
                    <SelectValue>
                        {size}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {selectSizes.map((org) => (
                        <SelectItem key={org} value={org} >
                            {org}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                className={showGodown ? "ml-2 w-[22%]" : "ml-2 w-[30%]"}
                type="number"
                placeholder="Total"
                value={quantity}
                onChange={(e) => handleQuantityChange(e)}
            />
            {showGodown && (
                <Input
                    className="ml-2 w-[22%]"
                    type="number"
                    min={0}
                    placeholder="Godown"
                    value={godownQuantity ?? 0}
                    onChange={(e) => handleGodownChange(e)}
                />
            )}
        </>
    );
};

interface AddSizeFormProps {
    onAddSize: (sizes: any[]) => void;
    preSizes: any[];
    sizes: any[];
    /** Show the per-size godown input and the derived floor-stock readout. */
    showGodown?: boolean;
}

export const AddSizeForm: React.FC<AddSizeFormProps> = ({ onAddSize, preSizes, sizes, showGodown }) => {

    const handleAddSize = () => {
        let obj: any = { size: 'XS', quantity: 0 };
        if (showGodown) obj.godownQuantity = 0;
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
                    <span className="ml-2 w-[22%]">Total</span>
                    <span className="ml-2 w-[22%]">In Godown</span>
                    <span className="ml-2">On Floor</span>
                </div>
            )}
            {sizes.map((obj, index) => (
                <div key={index} className="flex items-center">
                    <SingleSize
                        key={index}
                        quantity={obj.quantity}
                        size={obj.size}
                        godownQuantity={obj.godownQuantity}
                        showGodown={showGodown}
                        onSetSize={(size: any, quantity: any, godownQuantity: any) => {
                            const updatedSizes = [...sizes];
                            updatedSizes[index] = showGodown
                                ? { ...sizes[index], size, quantity, godownQuantity }
                                : { ...sizes[index], size, quantity };
                            onAddSize(updatedSizes);
                        }}
                    />
                    {showGodown && (
                        <span
                            className={`ml-2 min-w-[3.5rem] text-center text-xs font-bold rounded-md px-2 py-1 ${
                                getTotalQty(obj) > 0 && getFloorQty(obj) === 0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-50 text-emerald-700"
                            }`}
                            title={
                                getTotalQty(obj) > 0 && getFloorQty(obj) === 0
                                    ? "All pieces are in the godown - move some down to sell"
                                    : "Pieces available on the selling floor"
                            }
                        >
                            {getFloorQty(obj)}
                        </span>
                    )}
                    <Button type="button" className="ml-2" onClick={() => handleRemoveSize(index)}>Remove</Button>
                </div>
            ))}
            {showGodown && sizes.some((s) => getTotalQty(s) > 0 && getFloorQty(s) === 0) && (
                <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    ⚠️ Some sizes have every piece in the godown - nothing is on the selling floor for them.
                </p>
            )}
            <Button className="w-[30%]" type="button" onClick={handleAddSize}>
                + Add
            </Button>
        </div>
    );
};
