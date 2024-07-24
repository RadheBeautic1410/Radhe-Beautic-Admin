'use client';

import { Button } from '@/src/components/ui/button'
import { Card, CardContent } from '@/src/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/src/components/ui/carousel';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog'
// import {  } from '@radix-ui/react-dialog'
import React, { useState } from 'react'
import OrderCartProduct from '../kurti/orderKurtiCard';

interface ViewOrderDialogProps {
    data: any
}

export function ViewOrderDialog({ data }: ViewOrderDialogProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // console.log('dialogData:', data, data.shippingAddress);
    return (
        <>
            {!data ? "" :
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <div className="text-blue-600 hover:text-blue-800">
                            {data.orderId}
                        </div>
                    </DialogTrigger>
                    <DialogContent className="w-11/12 max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Order details - {data.orderId}</DialogTitle>
                        </DialogHeader>
                        <Carousel className="w-full max-w-3xl mx-auto">
                            <CarouselContent>
                                {data.cart.CartProduct.map((cartProductData: any, index: number) => {
                                    // console.log('address: ', data.shippingAddres);
                                    return (
                                        <CarouselItem key={index}>
                                            <OrderCartProduct data={cartProductData} />

                                        </CarouselItem>
                                    )
                                })}
                            </CarouselContent>
                            <CarouselPrevious />
                            <CarouselNext />
                        </Carousel>
                        <div className="flex justify-between items-center bg-slate-200 p-2 mt-2">
                            <span className="font-medium mr-2">Address:</span>
                            <span className="font-bold text-sm break-all overflow-wrap-anywhere max-w-full" >{data.shippingAddress?.address || ""}</span>
                        </div>
                    </DialogContent>
                </Dialog>
            }
        </>
    )
}

export default ViewOrderDialog