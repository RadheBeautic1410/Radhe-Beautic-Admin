"use client";

import { useState } from "react";
import { HashLoader } from "react-spinners";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Card, CardContent } from "@/src/components/ui/card";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS: number[] = [];
const currentYear = new Date().getFullYear();
const lastYear = currentYear + 50;
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
        date: { year, month },
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
    staleTime: 30,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="w-full mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800"> Month Analytics</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
          <Select onValueChange={(val) => setMonth(Number(val))} defaultValue={month.toString()}>
            <SelectTrigger className="w-full border border-gray-300 shadow-sm rounded-md">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={`${m}`}>
                  {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
          <Select onValueChange={(val) => setYear(Number(val))} defaultValue={year.toString()}>
            <SelectTrigger className="w-full border border-gray-300 shadow-sm rounded-md">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={`${y}`}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white rounded-xl shadow-xl transition hover:shadow-2xl">
        <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {isPending || isFetching ? (
            <div className="flex justify-center items-center col-span-full py-10">
              <HashLoader color="#36D7B7" loading={true} size={35} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">Sales</h3>
                <p className="text-2xl font-bold text-blue-600">
                  ₹ {new Intl.NumberFormat("en-IN").format(data?.data?.totalSales || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">Profit</h3>
                <p className="text-2xl font-bold text-green-600">
                  ₹ {new Intl.NumberFormat("en-IN").format(data?.data?.totalProfit || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-md font-medium text-gray-600">Total Pieces</h3>
                <p className="text-2xl font-bold text-purple-600">
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
