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
interface ViewOrderDialogProps {
    data: any
}

export function PackingPending({ data }: ViewOrderDialogProps) {
    console.log('id:', data);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [code, setCode] = useState("");
    const currentUser = useCurrentUser();
    const fetchPendingSizes = async (id: any) => {
        const res = await fetch(
            "/api/orders/getOrderForPacking", {
            method: "POST",
            body: JSON.stringify({
                status: "PENDING",
                orderId: data,
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
        queryFn: () => fetchPendingSizes(data)
    })

    if (!sizesPendingQuery.data || sizesPendingQuery.data.error || !sizesPendingQuery.data.data || !sizesPendingQuery.data.data.cart || !sizesPendingQuery.data.data.cart.CartProduct) {
        return (
            <div className="flex justify-center items-center h-fit">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    const CartProducts = sizesPendingQuery.data.data.cart.CartProduct;
    console.log('dialogData:', CartProducts);
    const pendingItems: any[] = (CartProducts as any[] || []).flatMap((product: any) =>
        (product.adminSideSizes as any[]).filter(({ size, quantity }: any) =>
            ((product.scannedSizes as any[]).filter((s: any) => s === size).length < quantity)
        ).map(({ size, quantity }: any) => ({
            productId: product.id,
            productCode: product.kurti.code,
            size,
            scanned: (product.scannedSizes as any[]).filter((s: any) => s === size).length,
            total: quantity
        }))
    );

    const isProductPackingComplete = (product: any) => {
        const scannedSizesCount = product.scannedSizes.reduce((acc: any, size: any) => {
            acc[size] = (acc[size] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return product.adminSideSizes.every(
            ({ size, quantity }: any) => scannedSizesCount[size] === quantity
        );
    };

    
    const handleSell = () => {
        console.log(code);
        return code;
    }
    const allItemsScanned = CartProducts.every(isProductPackingComplete);
    console.log('pendingItems:', pendingItems, allItemsScanned);
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
                                Packing Pending
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
                                !sizesPendingQuery.data.data.cart.CartProduct) ?
                                "" :
                                <>
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
                                    {!allItemsScanned ? 
                                        <div className='flex flex-col h-fit'>
                                            <h3>Product Code</h3>
                                            <div className='flex flex-row flex-wrap gap-2'>
                                                <Input
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
                                                <Button type='button' onClick={handleSell}>
                                                    Sell
                                                </Button>
                                            </div>
                                        </div>
                                        : 
                                        <Button type='button' className='bg-green-500 hover:bg-green-700'>
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