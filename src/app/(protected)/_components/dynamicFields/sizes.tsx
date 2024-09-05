"use client";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SingleSizeProps {
    onSetSize: (size: string, quantity: number) => void;
    quantity: any;
    size: any;
}

const SingleSize: React.FC<SingleSizeProps> = ({ onSetSize, quantity, size }) => {
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const [selectedSize, setSelectedSize] = useState<string>(size);
    const [selectedQuantity, setQuantity] = useState(quantity);
    console.log(quantity, size, selectedSize);
    useEffect(() => {
        onSetSize(size, quantity);
    }, [])
    const handleChange = (e: any) => {
        setSelectedSize(e);
        onSetSize(e, selectedQuantity);
    };
    const handleQuantityChange = (e: any) => {
        let quan = parseInt(e.target.value)
        setQuantity(quan);
        onSetSize(selectedSize, quan);
    }
    return (
        <>
            <Select
                onValueChange={(e) => handleChange(e)}
                defaultValue={size}
            >

                <SelectTrigger className="w-[20%]">
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
                className="ml-2 w-[30%]"
                type="number"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => handleQuantityChange(e)}
            />
        </>
    );
};

interface AddSizeFormProps {
    onAddSize: (sizes: any[]) => void;
    preSizes: any[];
    sizes: any[];
}

export const AddSizeForm: React.FC<AddSizeFormProps> = ({ onAddSize, preSizes, sizes }) => {
    // const [sizes, setSizes] = useState<any[]>(preSizes);
    // console.log(sizes);

    const handleAddSize = () => {
        let obj = { size: 'S', quantity: 0 };
        for (let i = 0; i < sizes.length; i++) {
            for (let j = 0; j < sizes.length; j++) {
                if (i !== j && sizes[i].size === sizes[j].size) {
                    toast.error(`Size: ${sizes[i].size} is slected more than once.!!!`);
                    return;
                }
            }
        }
        const newSizes = [...sizes, obj]; // Default size 'S' added
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