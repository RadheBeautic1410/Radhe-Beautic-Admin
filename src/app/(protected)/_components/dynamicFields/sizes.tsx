"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { ADULT_KURTI_SIZES } from "@/src/lib/kurtiSizes";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SingleSizeProps {
    onSetSize: (size: string, quantity: number) => void;
    quantity: any;
    size: any;
    sizeOptions: string[];
}

const SingleSize: React.FC<SingleSizeProps> = ({ onSetSize, quantity, size, sizeOptions }) => {
    const safeSize = sizeOptions.includes(String(size)) ? String(size) : sizeOptions[0];
    const [selectedSize, setSelectedSize] = useState<string>(safeSize);
    useEffect(() => {
        const next = sizeOptions.includes(String(size)) ? String(size) : sizeOptions[0];
        setSelectedSize(next);
    }, [size, sizeOptions]);
    const handleChange = (e: any) => {
        setSelectedSize(e);
        const quan = typeof quantity === "number" && !Number.isNaN(quantity) ? quantity : parseInt(String(quantity), 10) || 0;
        onSetSize(e, quan);
    };
    const handleQuantityChange = (e: any) => {
        const quan = parseInt(e.target.value, 10) || 0;
        onSetSize(selectedSize, quan);
    }
    return (
        <>
            <Select
                onValueChange={(e) => handleChange(e)}
                value={selectedSize}
            >

                <SelectTrigger className="w-[20%]">
                    <SelectValue>
                        {selectedSize}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {sizeOptions.map((org) => (
                        <SelectItem key={org} value={org} >
                            {org}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                className="ml-2 w-[30%]"
                type="number"
                placeholder="Quantity"
                value={quantity === undefined || quantity === "" ? "" : quantity}
                onChange={(e) => handleQuantityChange(e)}
            />
        </>
    );
};

interface AddSizeFormProps {
    onAddSize: (sizes: any[]) => void;
    preSizes: any[];
    sizes: any[];
    /** When omitted, adult XS–10XL sizes are used. */
    sizeOptions?: string[];
}

export const AddSizeForm: React.FC<AddSizeFormProps> = ({ onAddSize, preSizes, sizes, sizeOptions = ADULT_KURTI_SIZES }) => {
    const sizeBandKey = sizeOptions[0] ?? "";

    useEffect(() => {
        if (!sizes.length) return;
        const fallback = sizeOptions[0] ?? "XS";
        const mapped = sizes.map((row) =>
            sizeOptions.includes(String(row.size))
                ? row
                : { ...row, size: fallback }
        );
        if (mapped.some((row, i) => row.size !== sizes[i].size)) {
            onAddSize(mapped);
        }
    }, [sizeBandKey]);

    const handleAddSize = () => {
        const defaultSize = sizeOptions[0] ?? "XS";
        let obj = { size: defaultSize, quantity: 0 };
        for (let i = 0; i < sizes.length; i++) {
            for (let j = 0; j < sizes.length; j++) {
                if (i !== j && sizes[i].size === sizes[j].size) {
                    toast.error(`Size: ${sizes[i].size} is slected more than once.!!!`);
                    return;
                }
            }
        }
        const newSizes = [...sizes, obj]; // Default size 'XS' added
        // setSizes(newSizes);
        onAddSize(newSizes);
    };

    const handleRemoveSize = (index: number) => {
        const updatedSizes = sizes.filter((_, i) => i !== index);
        console.log(updatedSizes);
        // setSizes(updatedSizes);
        onAddSize(updatedSizes);
    };

    // useEffect(() => {
    //     if (preSizes.length > 0) {
    //         setSizes(preSizes);
    //         onAddSize(preSizes);
    //     }
    //     return ()=>{
    //         setSizes([]);
    //         onAddSize([]);
    //     }
    // }, [])
    return (
        <div className="flex flex-col gap-2 w-[100%]">
            {sizes.map((obj, index) => (
                <div key={index} className="flex items-center">
                    <SingleSize
                        key={index}
                        quantity={obj.quantity}
                        size={obj.size}
                        sizeOptions={sizeOptions}
                        onSetSize={(size: any, quantity: any) => {
                            const updatedSizes = [...sizes];
                            updatedSizes[index] = {
                                size,
                                quantity
                            };
                            // setSizes(updatedSizes);
                            onAddSize(updatedSizes);
                        }}
                    />
                    <Button type="button" className="ml-2" onClick={() => handleRemoveSize(index)}>Remove</Button>
                </div>
            ))}
            <Button className="w-[30%]" type="button" onClick={handleAddSize}>
                + Add
            </Button>
        </div>
    );
};