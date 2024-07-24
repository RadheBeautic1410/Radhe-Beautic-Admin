"use client";

import React, { useEffect, useRef } from 'react';
import { useInvalidateQueries } from '../layout';
import RejectedOrderd from '../../_components/orders/RejectedOrders';
// Adjust the import path as needed

const RejectedOrdersPage = () => {
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
            <RejectedOrderd/>
        </>
    );
};

export default RejectedOrdersPage;