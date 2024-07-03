"use client";

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import Link from 'next/link';
import React, { useEffect, useState } from 'react'
import PendingOrders from '../_components/orders/PendingOrders';
import ReadyOrders from '../_components/orders/ReadyOrders';
import ShippedOrders from '../_components/orders/ShippedOrders';
import RejectedOrders from '../_components/orders/RejectedOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import PageLoader from '@/src/components/loader';
import DataLoader from '@/src/components/DataLoader';


const OrderPage = () => {
    const [tabNum, setTabNum] = useState(0);
    const fetchPendingCount = async (status: any) => {
        const res = await fetch(
            "/api/orders/getCount", {
            method: "POST",
            body: JSON.stringify({
                status: status
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            next: { revalidate: 300 }
        })
        return res.json()
    }

    const countQuery1 = useQuery({
        queryKey: ['pendingOrdersCount'],
        queryFn: () => fetchPendingCount('PENDING'),
        refetchOnWindowFocus: false,
    })
    const countQuery2 = useQuery({
        queryKey: ['readyOrdersCount'],
        queryFn: () => fetchPendingCount('PROCESSING'),
        refetchOnWindowFocus: false,
    })
    const countQuery3 = useQuery({
        queryKey: ['shippedOrdersCount'],
        queryFn: () => fetchPendingCount('SHIPPED'),
        refetchOnWindowFocus: false,
    })
    const countQuery4 = useQuery({
        queryKey: ['rejectedOrdersCount'],
        queryFn: () => fetchPendingCount('CANCELLED'),
        refetchOnWindowFocus: false,
    })


    if (countQuery1.isFetching || countQuery2.isFetching || countQuery3.isFetching || countQuery4.isFetching) {
        return (
            <Card className='w-[90%]'>
                <CardContent className='w-full'>
                    <DataLoader loading={true} />
                </CardContent>
            </Card>
        )
    }
    return (

        <Card className='w-[90%] p-0'>
            <CardContent className='w-full'>
                <Tabs defaultValue='pendingOrders' className="shadow-md w-full p-0 m-0">
                    <TabsList className='w-full'>
                        <div className='w-fit flex flex-row overflow-x-auto'>
                            <TabsTrigger
                                value="pendingOrders"
                                className="w-full md:w-auto px-4 py-2"
                            >
                                {`⌛ Pending (${countQuery1.data.data || 0})`}
                            </TabsTrigger>
                            <TabsTrigger
                                value="readyOrders"
                                className="w-full md:w-auto px-4 py-2"
                            >
                                {`✅ Order ready (${countQuery2.data.data || 0})`}
                            </TabsTrigger>
                            <TabsTrigger
                                value="trackingPending"
                                className="w-full md:w-auto px-4 py-2"
                            >
                                {`⌛ Tracking Pending (${countQuery3.data.data || 0})`}
                            </TabsTrigger>
                            <TabsTrigger
                                value="shippedOrders"
                                className="w-full md:w-auto px-4 py-2"
                            >
                                {`🚚 Shipped (${countQuery3.data.data || 0})`}
                            </TabsTrigger>
                            <TabsTrigger
                                value="rejectedOrders"
                                className="w-full md:w-auto px-4 py-2"
                            >
                                {`❌ Rejected (${countQuery4.data.data || 0})`}
                            </TabsTrigger>
                        </div>
                    </TabsList>
                    <div className="w-full p-0 mt-4 md:mt-0">
                        <TabsContent value="pendingOrders">
                            <PendingOrders />
                        </TabsContent>
                        <TabsContent value="readyOrders">
                            <ReadyOrders />
                        </TabsContent>
                        <TabsContent value="shippedOrders">
                            <ShippedOrders />
                        </TabsContent>
                        <TabsContent value="rejectedOrders">
                            <RejectedOrders />
                        </TabsContent>
                    </div>
                </Tabs>


                {/* {tabComponent} */}
            </CardContent>
        </Card>
    )
}

export default OrderPage;