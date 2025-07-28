"use client";

import React, { createContext, useCallback, useContext } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/src/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Skeleton } from '@/src/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/src/components/ui/scroll-area';
import { usePathname } from 'next/navigation';

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

const InvalidateContext = createContext<(() => void) | null>(null);

export const useInvalidateQueries = () => {
    const context = useContext(InvalidateContext);
    if (!context) {
        throw new Error('useInvalidateQueries must be used within an OrdersLayout');
    }
    return context;
};


const OrdersLayout = ({ children }: ProtectedLayoutProps) => {
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const fetchPendingCount = async (status: string) => {
        const res = await fetch("/api/orders/getCount", {
            method: "POST",
            body: JSON.stringify({ status }),
            headers: { "Content-type": "application/json; charset=UTF-8" },
            next: { revalidate: 300 }
        });
        return res.json();
    };

    const orderStatuses = [
        { key: 'pending', href: 'pending', label: 'Pending', emoji: '⌛' },
        { key: 'PROCESSING', href: 'ready', label: 'Order ready', emoji: '✅' },
        { key: 'trackingpending', href: 'trackingpending', label: 'Tracking Pending', emoji: '⌛' },
        { key: 'shipped', href: 'shipped', label: 'Shipped', emoji: '🚚' },
        { key: 'CANCELLED', href: 'rejected', label: 'Rejected', emoji: '❌' },
    ];

    const queries = orderStatuses.map(status => useQuery({
        queryKey: [`${status.key}OrdersCount`],
        queryFn: () => fetchPendingCount(status.key.toUpperCase()),
        refetchOnWindowFocus: false,
    }));

    const isLoading = queries.some(query => query.isFetching);

    const invalidateQueries = useCallback(() => {
        orderStatuses.forEach(status => {
            queryClient.invalidateQueries({ queryKey: [`${status.key}OrdersCount`] });
        }); 
    }, [queryClient, orderStatuses]);

    return (
        <InvalidateContext.Provider value={invalidateQueries}>

            <Card className="w-full h-full rounded-none">
                <CardContent className="p-2 ">
                    {/* Mobile View */}
                    <div className="md:hidden">
                        <ScrollArea className="w-full">
                            <div className="flex space-x-1 pb-3">
                                {orderStatuses.map((status, index) => {
                                    const isActive = pathname.includes(`/orders/${status.href}`);
                                    return (
                                        <Link
                                            key={status.key}
                                            href={`/orders/${status.href}`}
                                            className={`flex flex-col items-center p-2 rounded-lg transition-colors duration-200 ${isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-background hover:bg-accent'
                                                }`}
                                        >
                                            <span role="img" aria-label={status.label} className="text-base">{status.emoji}</span>
                                            <span className="text-[10px] font-medium mt-1">{status.label}</span>
                                            {isLoading ? (
                                                <Skeleton className="w-4 h-4 rounded-full mt-1" />
                                            ) : (
                                                <span className={`rounded-full px-1 py-0.5 text-[10px] font-semibold mt-1 ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {queries[index].data?.data || 0}
                                                </span>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:flex flex-wrap gap-4 mb-6">
                        {orderStatuses.map((status, index) => {
                            const isActive = pathname.includes(`/orders/${status.href}`);
                            return (
                                <Link
                                    key={status.href}
                                    href={`/orders/${status.href}`}
                                    className={`flex-1 min-w-[140px] rounded-lg shadow-sm transition-colors duration-200 ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-background hover:bg-accent'
                                        }`}
                                >
                                    <div className="flex items-center justify-between p-4">
                                        <div className="flex items-center space-x-2">
                                            <span role="img" aria-label={status.label} className="text-xl">{status.emoji}</span>
                                            <span className="text-sm font-medium">{status.label}</span>
                                        </div>
                                        {isLoading ? (
                                            <Skeleton className="w-8 h-6 rounded-full" />
                                        ) : (
                                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${isActive ? 'bg-primary-foreground text-primary' : 'bg-primary/10 text-primary'
                                                }`}>
                                                {queries[index].data?.data || 0}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-6">
                        {children}
                    </div>
                </CardContent>
            </Card>
        </InvalidateContext.Provider>
    );
};

export default OrdersLayout;