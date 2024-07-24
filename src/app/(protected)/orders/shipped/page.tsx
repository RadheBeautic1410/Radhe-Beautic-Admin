"use client";

import React, { useEffect, useRef } from 'react';
import { useInvalidateQueries } from '../layout';
import ShippedOrders from '../../_components/orders/ShippedOrders';
  // Adjust the import path as needed

const ShippedOrdersPage = () => {
    
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
            <ShippedOrders/>
        </>
    );
};

export default ShippedOrdersPage;