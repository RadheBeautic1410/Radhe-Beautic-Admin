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
    isLowerSize?: boolean;
    actualSize?: string;
}

const OrderCartProduct: React.FC<CartCardProps> = ({ data }) => {
    console.log('cart data:',data);
    let price = 0;
    for (let i = 0; i < data.adminSideSizes.length || 0; i++) {
        let category = getPriceCategory(data.adminSideSizes[i].size);
        price += ((data.kurti.prices[category] || 0) * (data.adminSideSizes[i].quantity || 0));
    }
    // Create a map to check if a size is a lower size replacement
    const lowerSizeMap = new Map<string, { orderedSize: string; quantity: number }>();
    if (data.sizes && Array.isArray(data.sizes)) {
        data.sizes.forEach((sizeItem: any) => {
            if (sizeItem.isLowerSize && sizeItem.actualSize) {
                const existing = lowerSizeMap.get(sizeItem.actualSize);
                if (existing) {
                    existing.quantity += sizeItem.quantity || 0;
                } else {
                    lowerSizeMap.set(sizeItem.actualSize, {
                        orderedSize: sizeItem.size,
                        quantity: sizeItem.quantity || 0
                    });
                }
            }
        });
    }
    
    // Enhance adminSideSizes with lower size information
    const enhancedSizes = data.adminSideSizes.map((adminSize: any) => {
        const lowerSizeInfo = lowerSizeMap.get(adminSize.size);
        return {
            ...adminSize,
            isLowerSizeReplacement: !!lowerSizeInfo,
            orderedSize: lowerSizeInfo?.orderedSize,
            lowerSizeQuantity: lowerSizeInfo?.quantity || 0
        };
    });
    
    const midpoint = Math.ceil(enhancedSizes.length / 2);
    const leftSizes = enhancedSizes.slice(0, midpoint);
    const rightSizes = enhancedSizes.slice(midpoint);


    return (
        <div className="bg-slate-100 rounded-lg shadow-md p-4 max-w-sm mx-auto">
            <img
                src={data.kurti.images[0].url}
                alt={data.kurti.code}
                className="object-contain w-full h-64 mb-4 rounded"
                loading="lazy"
            />
            <h2 className="font-bold text-xl mb-2 text-center">{data.kurti.code}</h2>

            {lowerSizeMap.size > 0 && (
                <div className="mb-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <div className="flex items-center">
                        <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-yellow-800 font-medium">
                            ⚠️ This order contains lower level sizes. Customer ordered sizes that are not available, but we are sending one higher level size.
                        </p>
                    </div>
                </div>
            )}

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
                                <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">
                                    <div className="flex flex-col">
                                        {size.isLowerSizeReplacement ? (
                                            <>
                                                <span className="font-semibold text-blue-600">{size.size}</span>
                                                <span className="text-xs text-orange-600 font-medium">
                                                    (Ordered: {size.orderedSize})
                                                </span>
                                            </>
                                        ) : (
                                            <span>{size.size}</span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">
                                    <div className="flex flex-col">
                                        <span>{size.quantity}</span>
                                        {size.isLowerSizeReplacement && (
                                            <span className="text-xs text-orange-600 font-medium">
                                                Lower size
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                {rightSizes[index] && (
                                    <>
                                        <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">
                                            <div className="flex flex-col">
                                                {rightSizes[index].isLowerSizeReplacement ? (
                                                    <>
                                                        <span className="font-semibold text-blue-600">{rightSizes[index].size}</span>
                                                        <span className="text-xs text-orange-600 font-medium">
                                                            (Ordered: {rightSizes[index].orderedSize})
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span>{rightSizes[index].size}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm py-1 px-2 border border-gray-300 bg-gray-100">
                                            <div className="flex flex-col">
                                                <span>{rightSizes[index].quantity}</span>
                                                {rightSizes[index].isLowerSizeReplacement && (
                                                    <span className="text-xs text-orange-600 font-medium">
                                                        Lower size
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
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