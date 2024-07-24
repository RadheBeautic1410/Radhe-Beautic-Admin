"use client";

import React, { useEffect, useRef } from 'react';
import { useInvalidateQueries } from '../layout';
import PendingOrders from '../../_components/orders/PendingOrders';
  // Adjust the import path as needed

const PendingOrdersPage = () => {
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
            <PendingOrders/>
        </>
    );
};

export default PendingOrdersPage;