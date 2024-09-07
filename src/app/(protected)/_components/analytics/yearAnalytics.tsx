"use client";

import { useTransition, useState, use } from "react";
import { format, parseISO, addDays } from 'date-fns';
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from '@/src/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/src/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/src/components/ui/select";
import { cn } from "@/src/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { HashLoader } from "react-spinners";

const YEARS: number[] = [];
const lastYear = new Date().getFullYear() + 50;
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

for (let i = 2024; i <= lastYear; i++) {
    YEARS.push(i);
}

const todayDate = new Date();
const DayAnalytics = () => {
    const [year, setYear] = useState<number>(currentYear);
    const fetchFilteredSales = async (year: number) => {
        const res = await fetch(
            "/api/analytics/getFilteredSales", {
            method: "POST",
            body: JSON.stringify({
                date: {
                    year,
                },
                filter: "YEAR",
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            },
            next: { revalidate: 300 }
        })

        return res.json();
    }

    const { isPending, isError, error, data, isFetching, isPlaceholderData } =
        useQuery({
            queryKey: ['filteredDaySales', year],
            queryFn: () => fetchFilteredSales(year),
            placeholderData: keepPreviousData,
            // staleTime: 5 * 60 * 1000,
        });

    return (
        <div className="w-[30%] border-0">
            <div className="grid mb-3">
                <Select onValueChange={(val) => setYear(Number(val))} defaultValue={year.toString()}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Theme" />
                    </SelectTrigger>
                    <SelectContent>
                        {
                            YEARS.map((item, index) => (
                                <SelectItem key={index} value={`${item}`}>{item}</SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
            </div>
            <Card>
                <CardContent className="p-2 grid grid-flow-col">
                    {isPending || isFetching ?
                        <div className="grid place-content-center">
                            <div className="w-full flex justify-center">
                                <HashLoader className="justify-items-center" color="#36D7B7" loading={isPending || isFetching} size={30} />
                            </div>
                            <div>
                                {`It will take few minutes`}
                            </div>
                        </div>
                        :
                        <>
                            <div className="pb-2 pl-4 col-span-6">
                                <div className="font-bold font-serif text-lg tracking-wide">
                                    Sales
                                </div>
                                <div className="text-muted-foreground font-mono">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.totalSales || 0)}
                                </div>
                            </div>
                            <div className="col-span-6">
                                <div className="font-bold font-serif text-lg tracking-wide">
                                    Profit
                                </div>
                                <div className="text-muted-foreground font-mono">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.totalProfit || 0)}
                                </div>
                            </div>
                            <div className="col-span-4">
                                <div className="font-bold font-serif text-lg tracking-wide">
                                    Total Pieces
                                </div>
                                <div className="text-muted-foreground font-mono">
                                    {new Intl.NumberFormat('en-IN').format(data?.data?.count || 0)}
                                </div>
                            </div>
                        </>
                    }
                </CardContent>
            </Card>
        </div>
    );
}

export default DayAnalytics;