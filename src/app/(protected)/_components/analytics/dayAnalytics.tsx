"use client";

import { useState } from "react";
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from '@/src/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/src/components/ui/popover"
import { cn } from "@/src/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { HashLoader } from "react-spinners";

const todayDate = new Date();

const DayAnalytics = () => {
    const [date, setDate] = useState<Date | undefined>(todayDate);
    
    const fetchFilteredSales = async (date: Date | undefined) => {
        const res = await fetch(
            "/api/analytics/getFilteredSales", {
            method: "POST",
            body: JSON.stringify({
                date: date,
                filter: "DATE",
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            next: { revalidate: 300 }
        })

        return res.json();
    }

    const { isPending, isError, data, isFetching } =
        useQuery({
            queryKey: ['filteredDaySales', date],
            queryFn: () => fetchFilteredSales(date),
            placeholderData: keepPreviousData,
        });

    return (
        <div className="w-full max-w-lg mx-auto p-4">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal mb-4 p-3 border rounded-lg shadow-md",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                        {date ? format(date, "PPP") : "Pick a Date"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg shadow-lg">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            <Card className="bg-white rounded-xl shadow-lg">
                <CardContent className="p-6 grid grid-cols-3 gap-4 text-center">
                    {isPending || isFetching ? (
                        <div className="flex justify-center col-span-3 py-6">
                            <HashLoader color="#36D7B7" loading={isPending || isFetching} size={30} /> 
                        </div>
                    ) : (
                        <>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Sales</h3>
                                <p className="text-xl font-semibold text-gray-800">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.totalSales || 0)}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Profit</h3>
                                <p className="text-xl font-semibold text-gray-800">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.totalProfit || 0)}
                                </p>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">Total Pieces</h3>
                                <p className="text-xl font-semibold text-gray-800">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.count || 0)}
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default DayAnalytics;
