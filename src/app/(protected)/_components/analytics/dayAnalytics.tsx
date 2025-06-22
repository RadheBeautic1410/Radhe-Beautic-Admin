"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { HashLoader } from "react-spinners";

const todayDate = new Date();

const DayAnalytics = () => {
  const [date, setDate] = useState<Date | undefined>(todayDate);
  const [time, setTime] = useState<string>("12:00");

  const getCombinedDateTime = () => {
    if (!date || !time) return undefined;
    const [hours, minutes] = time.split(":").map(Number);
    const combinedDate = new Date(date);
    combinedDate.setHours(hours, minutes, 0, 0);
    return combinedDate.toISOString();
  };

  const fetchFilteredSales = async () => {
    const combinedDateTime = getCombinedDateTime();

    const res = await fetch("/api/analytics/getFilteredSales2", {
      method: "POST",
      body: JSON.stringify({
        datetime: combinedDateTime,
        filter: "DATETIME",
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      next: { revalidate: 300 },
    });

    const data = await res.json();
    console.log("Filtered by Time Data:", data);
    return data;
  };

  const { isPending, isError, data, isFetching } = useQuery({
    queryKey: ["filteredTimeSales", date, time],
    queryFn: fetchFilteredSales,
    placeholderData: keepPreviousData,
    staleTime: 30,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-800">
          Day & Time-wise Analytics
        </h2>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex items-center px-4 py-2 rounded-md border shadow-sm hover:bg-gray-50 transition",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                {date ? format(date, "PPP") : "Pick a Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-xl rounded-md border">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>
      </div>

      <Card className="bg-white rounded-xl shadow-xl hover:shadow-2xl transition duration-300">
        <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {isPending || isFetching ? (
            <div className="flex justify-center items-center col-span-full py-8">
              <HashLoader color="#36D7B7" loading={true} size={35} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">Sales</h3>
                <p className="text-2xl font-semibold text-blue-600">
                  ₹{" "}
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalSales || 0
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">Profit</h3>
                <p className="text-2xl font-semibold text-green-600">
                  ₹{" "}
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalProfit || 0
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">
                  Total Pieces
                </h3>
                <p className="text-2xl font-semibold text-purple-600">
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.count || 0
                  )}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayAnalytics;
