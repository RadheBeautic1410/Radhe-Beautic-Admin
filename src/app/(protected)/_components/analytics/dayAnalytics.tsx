"use client";

import { useTransition, useState, use } from "react";
import { format, parseISO, addDays } from 'date-fns';
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

    const { isPending, isError, error, data, isFetching, isPlaceholderData } =
		useQuery({
			queryKey: ['filteredDaySales', date],
			queryFn: () => fetchFilteredSales(date),
			placeholderData: keepPreviousData,
			// staleTime: 5 * 60 * 1000,
		});
    
    return (
        <div className="w-[25%] border-0">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-[280px] justify-start text-left font-normal mb-2 ",
                            !date && "text-muted-foreground"
                        )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a Date"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <Card>
                <CardContent className="p-2 grid grid-flow-col">
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
                </CardContent>
            </Card>
        </div>
    );
}

export default DayAnalytics;