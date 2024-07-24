'use client';

import React, { useMemo, useState } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getPaginationRowModel,
    ColumnDef,
    flexRender,
    SortingState,
} from '@tanstack/react-table';
import { format, addDays } from 'date-fns';
import { Button } from '@/src/components/ui/button';
import { Calendar as CalendarIcon, Trash2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import {
    Popover, PopoverContent,
    PopoverTrigger,
} from '@/src/components/ui/popover';
import { cn } from '@/src/lib/utils';
import { Calendar } from '@/src/components/ui/calendar';
import { Select, SelectContent, SelectValue, SelectTrigger, SelectItem } from '@/src/components/ui/select';

interface Order {
    id: string;
    orderId: string;
    date: Date;
    cart: {
        CartProduct: any[];
    };
    total: number;
}

const OrderTable: React.FC<{ data: Order[], columns: any[] }> = ({ data, columns }) => {

    const [sorting, setSorting] = useState<SortingState>([]);

    

    const table = useReactTable({
        data: data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <div className='w-full p-3'>
           
            <div className="w-full overflow-auto">
                <div className="flex flex-col">
                    {table.getRowModel().rows.map((row, idx) => (
                        <div
                            key={row.id}
                            className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200 hover:bg-gray-50 transition duration-150 ease-in-out"
                            role="button"
                            aria-label={`Order ${row.original.orderId}`}
                        >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                {row.getVisibleCells().map((cell) => {
                                    return (
                                        <div className="text-left w-full sm:w-auto">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </div>
                                    )
                                })}
                                
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
        </div>
    );
};

export default OrderTable;
