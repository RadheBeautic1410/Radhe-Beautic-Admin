'use client';

import { Button } from '@/src/components/ui/button'
import { Card, CardContent } from '@/src/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/src/components/ui/carousel';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/src/components/ui/dialog'
// import {  } from '@radix-ui/react-dialog'
import React, { useState } from 'react'
import OrderCartProduct from '../kurti/orderKurtiCard';
import { ShieldAlert, Package, Loader2, CheckCheck } from 'lucide-react';
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
    useInfiniteQuery,
    keepPreviousData
} from '@tanstack/react-query';
import { Input } from '@/src/components/ui/input';
import { useCurrentUser } from '@/src/hooks/use-current-user';
import axios from 'axios';
import { toast } from 'sonner';
import { error } from 'console';
import { packedOrder } from '@/src/actions/order';
import { useInvalidateQueries } from '../../orders/layout';
interface ViewOrderDialogProps {
    data: any
}
const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}
export function PackingPending({ data }: ViewOrderDialogProps) {
    // console.log('id:', data);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const invalidateQueries = useInvalidateQueries();
    
    const [code, setCode] = useState("");
    const currentUser = useCurrentUser();
    const [refresh, setRefresh] = useState(false);
    const queryClient = useQueryClient();

    const fetchPendingSizes = async (id: any) => {
        const res = await fetch(
            "/api/orders/getOrderForPacking", {
            method: "POST",
            body: JSON.stringify({
                status: "PENDING",
                orderId: id,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            next: { revalidate: 300 }
        })
        return res.json()
    }

    const sizesPendingQuery = useQuery({
        queryKey: ['order', data],
        queryFn: () => fetchPendingSizes(data),
    })

    const sellMutation = useMutation({
        mutationFn: async (data: any) => {
            console.log(data);
            const { codeSize, cartId } = data;
            console.log('cartId:', cartId)
            const currTime = await getCurrTime();
            const response = await fetch(
                "/api/orders/sell", {
                method: "POST",
                body: JSON.stringify({
                    code: codeSize,
                    currentUser,
                    cartId,
                    currentTime: currTime,
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8"
                },
            })
            const res = await response.json();
            if (res.success) {
                toast.success(res.message);
            }
            else {
                toast.error(res.message);
            }
            console.log('sell: ', res);
            // const ret = await response.json();
            return res;
        },
        onSuccess: () => {
            // Invalidate and refetch relevant queries
            // setRefresh(true);
            queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'order'
            });
            // queryClient.invalidateQueries({ queryKey: ['order', data] });
            setCode(''); // Clear the input after successful mutation
            sizesPendingQuery.refetch();
        },
        onError: (error) => {
            console.log(error);
        }
    });

    const moveMutation = useMutation({
        mutationFn: (id: string) => packedOrder(id),
        onError: (err, newTodo, context: any) => {
            console.log(err);
            queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'readyOrders'
            });
        },
        onSuccess: () => {
            // Invalidate the queries you want to refetch
            invalidateQueries();
            queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'readyOrders' || query.queryKey[0] === 'readyOrders'
            });

        },
    })

    if (!sizesPendingQuery.data || sizesPendingQuery.data.error || !sizesPendingQuery.data.data || !sizesPendingQuery.data.data.cart || !sizesPendingQuery.data.data.cart.CartProduct) {
        return (
            <div className="flex justify-center items-center h-fit">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    const CartProducts = sizesPendingQuery.data.data.cart.CartProduct;
    // console.log('dialogData:', CartProducts);
    const pendingItems: any[] = (CartProducts as any[] || []).flatMap((product) =>
        product.adminSideSizes
            .filter(({ size, quantity }: any) => {
                const scannedQuantity = product.scannedSizes.find((s: any) => s.size === size)?.quantity || 0;
                return scannedQuantity < quantity;
            })
            .map(({ size, quantity }: any) => ({
                productId: product.id,
                productCode: product.kurti.code,
                size,
                scanned: product.scannedSizes.find((s: any) => s.size === size)?.quantity || 0,
                total: quantity,
            }))
    );

    const isProductPackingComplete = (product: any): boolean => {
        const scannedSizesCount = product.scannedSizes.reduce((acc: any, { size, quantity }: any) => {
            acc[size] = (acc[size] || 0) + quantity;
            return acc;
        }, {} as Record<string, number>);

        return product.adminSideSizes.every(
            ({ size, quantity }: any) => scannedSizesCount[size] === quantity
        );
    };

    const handleSell = async () => {
        if (code.length < 7) {
            toast.error('PLease enter correct code!!!');
        }
        else {
            // console.log('sell',sizesPendingQuery.data.data.cartId);
            let cartId: string = await sizesPendingQuery.data.data.cartId;
            // console.log('sell2',sizesPendingQuery.data.data.cartId);
            await sellMutation.mutate({ codeSize: code, cartId: cartId })
        }
    }
    const allItemsScanned = CartProducts.every(isProductPackingComplete);
    // console.log('pendingItems:', pendingItems, allItemsScanned);
    return (
        <>
            {!data ? "" :
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>

                    <DialogTrigger asChild>

                        {allItemsScanned ?
                            <Button className='bg-green-500 hover:bg-green-700'>
                                <CheckCheck className='h-5 w-5 mr-2' />
                                Packing Pending
                            </Button>
                            :
                            <Button className='bg-red-500 hover:bg-red-700'>
                                <ShieldAlert className='h-5 w-5 mr-2' />
                                Tracking Pending
                            </Button>
                        }
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Order details - {data}</DialogTitle>
                        </DialogHeader>
                        {
                            (!sizesPendingQuery.data ||
                                sizesPendingQuery.data.error ||
                                !sizesPendingQuery.data.data ||
                                !sizesPendingQuery.data.data.cart ||
                                !sizesPendingQuery.data.data.cart.CartProduct || sizesPendingQuery.isFetching) ?
                                <div className="flex justify-center items-center h-fit">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div> :
                                <>
                                    {!allItemsScanned ?
                                        <div className="mt-4">
                                            <h3 className="font-semibold mb-2">Pending Items:</h3>
                                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                                {pendingItems?.map(({ productId, productCode, size, scanned, total }) => (
                                                    <div key={`${productId}-${size}`} className="flex items-center justify-between bg-gray-100 p-2 rounded">
                                                        <span className="text-sm font-medium">{productCode} - {size}</span>
                                                        <span className="text-sm">
                                                            {scanned}/{total} <Package className="inline-block w-4 h-4 ml-1" />
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        : ""}
                                    {!allItemsScanned ?
                                        <div className='flex flex-col h-fit'>
                                            <h3>Product Code</h3>
                                            <div className='flex flex-row flex-wrap gap-2'>
                                                <Input
                                                    autoFocus
                                                    className='w-[80%]'
                                                    placeholder='Enter code'
                                                    value={code}
                                                    onKeyUp={
                                                        (e) => {
                                                            if (e.key === 'Enter') {
                                                                handleSell();
                                                            }
                                                        }
                                                    }
                                                    onChange={(e) => { setCode(e.target.value); }}
                                                // disabled
                                                ></Input>
                                                <Button type='button' onClick={handleSell}
                                                    disabled={sellMutation.isPending}
                                                >
                                                    {sellMutation.isPending ? 'Selling...' : 'Sell'}
                                                </Button>
                                            </div>
                                        </div>
                                        :
                                        <Button
                                            type='button'
                                            className='bg-green-500 hover:bg-green-700'
                                            onClick={async (e: any) => {
                                                // e.preventDefault();
                                                console.log('orderId:', sizesPendingQuery.data.data.id);
                                                await moveMutation.mutate(sizesPendingQuery.data.data.id)
                                            }}
                                            disabled={moveMutation.isPending}
                                        >
                                            Move to tracking pending
                                        </Button>
                                    }
                                </>
                        }
                    </DialogContent>
                </Dialog>
            }
        </>
    )
}

export default PackingPending