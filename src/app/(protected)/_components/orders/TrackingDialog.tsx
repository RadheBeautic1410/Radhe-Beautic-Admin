'use client';

import React, { useState } from 'react'
import { useInvalidateQueries } from '../../orders/layout';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { shippedOrder } from '@/src/actions/order';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/src/components/ui/dialog';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Loader2 } from 'lucide-react';

interface TrackingDialogProps {
    data: any
}
const TrackingDialog = ({ data }: TrackingDialogProps) => {
    console.log('orderId:', data);
    const [isOpen, setIsOpen] = useState(false);
    const [trackingId, setTrackingId] = useState('');
    const invalidateQueries = useInvalidateQueries();
    const queryClient = useQueryClient();
    const [shipChrage, setShipChrage] = useState(0);
    const moveMutation = useMutation({
        mutationFn: (data: any) => shippedOrder(data.orderId, data.trackingId, data.shippingCharge),
        onError: (err, newTodo, context: any) => {
            console.log(err);
            queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'packedOrder'
            });
        },
        onSuccess: () => {
            // Invalidate the queries you want to refetch
            invalidateQueries();
            queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === 'packedOrder' || query.queryKey[0] === 'shippedOrders'
            });

        },
    })

    const handleSell = async (orderId: any) => {
        if (trackingId.trim().length === 0 || shipChrage <= 0) {
            toast.error('Enter valid tracking id or shipping charge');
        }
        else {
            console.log('orderIdMove:', orderId);
            moveMutation.mutate({ orderId: orderId, trackingId: trackingId, shippingCharge: shipChrage });
        }
    }
    if (!data) {
        return (
            <div className="flex justify-center items-center h-fit">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger>
                <Button>
                    Assign TrackingId
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Assign TrackingId
                </DialogTitle>
                <div className='flex flex-col h-fit'>
                    <h3>TrackingId</h3>
                    <div className='flex flex-row flex-wrap gap-2'>
                        <Input
                            autoFocus
                            className='w-[80%]'
                            placeholder='Enter code'
                            value={trackingId}
                            onChange={(e) => { setTrackingId(e.target.value); }}
                        // disabled
                        ></Input>
                        <h3>Shipping Charge</h3>
                        <Input
                            type="number"
                            className='w-[80%]'
                            placeholder='Enter shipping charge'
                            value={shipChrage}
                            onChange={(e) => { setShipChrage(parseInt(e.target.value || "0")); }}
                        // disabled
                        ></Input>
                        <Button type='button'
                            className='bg-green-500 hover:bg-green-700'
                            onClick={async (e: any) => {
                                e.preventDefault();
                                console.log('orderId:', data);
                                handleSell(data);

                            }}
                            disabled={moveMutation.isPending}
                        >
                            Ship the order
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default TrackingDialog