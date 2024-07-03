'use client';

import React, { useEffect, useState } from 'react'
import NextImage from 'next/image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { toast } from 'sonner';
// import { editCartProductUnit, removeCartProduct } from '@/src/actions/kurti';

interface CartCardProps {
    data: any;
}

const getPriceCategory = (size: string) => {
    if (size === "") {
        return "noCategory";
    }
    let sizes1: string[] = ["S", "M", "L", "XL", "XXL"];
    let sizes2: string[] = ["3XL", "4XL", "5XL", "6XL"];
    let sizes3: string[] = ["7XL", "8XL", "9XL", "10XL"];
    if (sizes1.includes(size)) {
        return "sellingPrice1";
    }
    if (sizes2.includes(size)) {
        return "sellingPrice2";
    }
    if (sizes3.includes(size)) {
        return "sellingPrice3";
    }
    return "noCategory";
}

interface Size {
    size: string;
    quantity: number;
}

const OrderCartProduct: React.FC<CartCardProps> = ({ data }) => {
    console.log('cart data:',data);
    let price = 0;
    for (let i = 0; i < data.adminSideSizes.length || 0; i++) {
        let category = getPriceCategory(data.adminSideSizes[i].size);
        price += ((data.kurti.prices[category] || 0) * (data.adminSideSizes[i].quantity || 0));
    }
    const availableSizes = [];
    for (let i = 0; i < data.kurti.sizes.length || 0; i++) {
        availableSizes.push(data.kurti.sizes[i].size);
    }
    const midpoint = Math.ceil(data.adminSideSizes.length / 2);
    const leftSizes = data.adminSideSizes.slice(0, midpoint);
    const rightSizes = data.adminSideSizes.slice(midpoint);


    return (
        <div className="bg-slate-100 rounded-lg shadow-md p-4 max-w-sm mx-auto">
            <img
                src={data.kurti.images[0].url}
                alt={data.kurti.code}
                className="object-contain w-full h-64 mb-4 rounded"
                loading="lazy"
            />
            <h2 className="font-bold text-xl mb-2 text-center">{data.kurti.code}</h2>

            <div className="w-full mb-4">
                <Table className="border-collapse">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-1/4 bg-slate-800 text-white font-bold text-sm py-1 px-2 border border-gray-300">SIZE</TableHead>
                            <TableHead className="w-1/4 bg-slate-800 text-white font-bold text-sm py-1 px-2 border border-gray-300">STOCK</TableHead>
                            {rightSizes.length > 0 ?
                                <>
                                    <TableHead className="w-1/4 bg-slate-800 text-white font-bold text-sm py-1 px-2 border border-gray-300">SIZE</TableHead>
                                    <TableHead className="w-1/4 bg-slate-800 text-white font-bold text-sm py-1 px-2 border border-gray-300">STOCK</TableHead>
                                </>
                                : ""}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leftSizes.map((size: any, index: number) => (
                            <TableRow key={index}>
                                <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">{size.size}</TableCell>
                                <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">{size.quantity}</TableCell>
                                {rightSizes[index] && (
                                    <>
                                        <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">{rightSizes[index].size}</TableCell>
                                        <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">{rightSizes[index].quantity}</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center bg-slate-200 p-2 rounded">
                <span className="font-medium">Total Price:</span>
                <span className="font-bold text-lg">₹{price.toFixed(2)}</span>
            </div>
        </div>

    )
}

export default OrderCartProduct