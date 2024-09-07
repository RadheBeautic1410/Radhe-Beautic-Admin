"use client";

import { useState } from "react";
import { HashLoader } from "react-spinners";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS: number[] = [];
const lastYear = new Date().getFullYear() + 50;
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

for (let i = 2024; i <= lastYear; i++) {
  YEARS.push(i);
}

const DayAnalytics = () => {
  const [month, setMonth] = useState<number>(currentMonth);
  const [year, setYear] = useState<number>(currentYear);

  const fetchFilteredSales = async (month: number, year: number) => {
    const res = await fetch("/api/analytics/getFilteredSales", {
      method: "POST",
      body: JSON.stringify({
        date: {
          year,
          month,
        },
        filter: "MONTH",
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      next: { revalidate: 300 },
    });

    return res.json();
  };

  const { isPending, isFetching, data } = useQuery({
    queryKey: ["filteredDaySales", month, year],
    queryFn: () => fetchFilteredSales(month, year),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="w-full max-w-lg mx-auto p-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Select
          onValueChange={(val) => setMonth(Number(val))}
          defaultValue={month.toString()}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((item, index) => (
              <SelectItem key={index} value={`${item}`}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          onValueChange={(val) => setYear(Number(val))}
          defaultValue={year.toString()}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((item, index) => (
              <SelectItem key={index} value={`${item}`}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalSales || 0
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Profit</h3>
                <p className="text-xl font-semibold text-gray-800">
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalProfit || 0
                  )}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Total Pieces</h3>
                <p className="text-xl font-semibold text-gray-800">
                  {new Intl.NumberFormat("en-IN").format(data?.data?.count || 0)}
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
