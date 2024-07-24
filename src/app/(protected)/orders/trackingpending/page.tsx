"use client";

import React, { useEffect, useRef } from 'react';
import { useInvalidateQueries } from '../layout';
import PackedOrders from '../../_components/orders/TrackingPendingOrders';
  // Adjust the import path as needed

const PackedOrdersPage = () => {
    
    const invalidateQueries = useInvalidateQueries();
    const invalidatedRef = useRef(false);

    useEffect(() => {
        if (!invalidatedRef.current) {
            invalidateQueries();
            invalidatedRef.current = true;
        }
    }, [invalidateQueries]);

    // Your component logic here...

    return (
        <>
            <PackedOrders/>
        </>
    );
};

export default PackedOrdersPage;