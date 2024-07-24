"use client";

import React, { useEffect, useRef } from 'react';
import { useInvalidateQueries } from '../layout';
import ReadyOrders from '../../_components/orders/ReadyOrders';
 // Adjust the import path as needed

const ReadyOrdersPage = () => {
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
            <ReadyOrders/>
        </>
    );
};

export default ReadyOrdersPage;