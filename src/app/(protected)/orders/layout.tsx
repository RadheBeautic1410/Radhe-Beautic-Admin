"use client";

import React from 'react';
import { Card, CardContent } from '@/src/components/ui/card';

interface ProtectedLayoutProps {
    children: React.ReactNode;
}

export const useInvalidateQueries = () => {
    return () => {};
};

const OrdersLayout = ({ children }: ProtectedLayoutProps) => {
    return (
        <Card className="w-full h-full rounded-none">
            <CardContent className="p-2">
                <div className="mt-2">
                    {children}
                </div>
            </CardContent>
        </Card>
    );
};

export default OrdersLayout;