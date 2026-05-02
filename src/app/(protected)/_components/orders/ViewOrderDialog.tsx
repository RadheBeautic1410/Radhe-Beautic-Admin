'use client';

import { Button } from '@/src/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog'
// import {  } from '@radix-ui/react-dialog'
import React, { useState } from 'react'

interface ViewOrderDialogProps {
    data: any;
    triggerContent?: React.ReactNode;
}

export function ViewOrderDialog({ data, triggerContent }: ViewOrderDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
    // console.log('dialogData:', data, data.shippingAddress);
    return (
        <>
            {!data ? "" :
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        {triggerContent || (
                            <button type="button" className="text-blue-600 hover:text-blue-800">
                                {data.orderId}
                            </button>
                        )}
                    </DialogTrigger>
                    <DialogContent className="w-11/12 max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Order details - {data.orderId}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Customer Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <div><span className="text-gray-500">Name: </span><span className="font-medium">{data?.user?.name || "-"}</span></div>
                                        <div><span className="text-gray-500">Phone: </span><span className="font-medium">{data?.user?.phoneNumber || "-"}</span></div>
                                        <div><span className="text-gray-500">Order Date: </span><span className="font-medium">{data?.date ? new Date(data.date).toLocaleDateString() : "-"}</span></div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Shipping Address</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-1 text-sm">
                                        <div className="font-medium">{data?.shippingAddress?.fullName || data?.user?.name || "-"}</div>
                                        <div>{data?.shippingAddress?.address || "-"}</div>
                                        <div>
                                            {[data?.shippingAddress?.city, data?.shippingAddress?.state].filter(Boolean).join(", ")}
                                            {data?.shippingAddress?.zipCode ? ` - ${data.shippingAddress.zipCode}` : ""}
                                        </div>
                                        {data?.shippingAddress?.phoneNumber && (
                                            <div className="text-gray-600">Phone: {data.shippingAddress.phoneNumber}</div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Order Products</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                        {data?.cart?.CartProduct?.map((cartProduct: any) => {
                                            const totalQuantity =
                                                Array.isArray(cartProduct.sizes) && cartProduct.sizes.length > 0
                                                    ? cartProduct.sizes.reduce(
                                                        (sum: number, sizeItem: any) => sum + (sizeItem.quantity || 0),
                                                        0
                                                    )
                                                    : 0;
                                            return (
                                                <div key={cartProduct.id} className="border rounded-lg p-2.5 space-y-2">
                                                    <div className="flex items-start gap-2">
                                                        {cartProduct?.kurti?.images?.[0]?.url && (
                                                            <img
                                                                src={cartProduct.kurti.images[0].url}
                                                                alt={cartProduct?.kurti?.code || "Product image"}
                                                                className="w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80"
                                                                onClick={() => setSelectedImageUrl(cartProduct.kurti.images[0].url)}
                                                            />
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="font-semibold text-xs">{cartProduct?.kurti?.code?.toUpperCase() || "-"}</div>
                                                            <div className="text-xs text-gray-500">{cartProduct?.kurti?.category || "-"}</div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-gray-600">Sizes:</div>
                                                        {Array.isArray(cartProduct.sizes) && cartProduct.sizes.length > 0 ? (
                                                            cartProduct.sizes.map((sizeItem: any, idx: number) => (
                                                                <div key={idx} className="text-xs">
                                                                    <span className="font-medium">{sizeItem.size?.toUpperCase() || "N/A"}</span>
                                                                    <span className="text-gray-500 ml-1">(Qty: {sizeItem.quantity || 0})</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400">No sizes</span>
                                                        )}
                                                    </div>
                                                    <div className="pt-1 border-t flex justify-between text-xs">
                                                        <span className="text-gray-500">Total units:</span>
                                                        <span className="font-semibold">{totalQuantity}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>₹{(data?.total || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Shipping Charge</span>
                                        <span>₹{(data?.shippingCharge || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold border-t pt-2 mt-2">
                                        <span>Grand Total</span>
                                        <span>₹{((data?.total || 0) + (data?.shippingCharge || 0)).toFixed(2)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </DialogContent>

                    <Dialog open={!!selectedImageUrl} onOpenChange={(open) => !open && setSelectedImageUrl(null)}>
                        <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 bg-black/95 border-none overflow-hidden">
                            <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
                                {selectedImageUrl && (
                                    <img
                                        src={selectedImageUrl}
                                        alt="Product image"
                                        className="max-w-[95vw] max-h-[95vh] object-contain"
                                    />
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </Dialog>
            }
        </>
    )
}

export default ViewOrderDialog