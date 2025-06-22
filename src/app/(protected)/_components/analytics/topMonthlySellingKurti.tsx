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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

const headerCells = [
  { name: "Sr.", key: "sr" },
  { name: "Kurti Code", key: "kurti_code" },
  { name: "Sold Count", key: "sold_count" },
];

const MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const YEARS: number[] = [];
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const lastYear = currentYear + 50;

for (let i = 2024; i <= lastYear; i++) YEARS.push(i);

const DayAnalytics = () => {
  const [month, setMonth] = useState<number>(currentMonth);
  const [year, setYear] = useState<number>(currentYear);

  const fetchTopTenMonthlyKurties = async (month: number, year: number) => {
    const res = await fetch("/api/analytics/getMonthlyTopTenKurties", {
      method: "POST",
      body: JSON.stringify({ date: { year, month } }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      next: { revalidate: 300 },
    });
    return res.json();
  };

  const { isPending, isFetching, data } = useQuery({
    queryKey: ["topTenMonthlyKurties", month, year],
    queryFn: () => fetchTopTenMonthlyKurties(month, year),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Top Month Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
          <Select
            onValueChange={(val) => setMonth(Number(val))}
            defaultValue={month.toString()}
          >
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
          <Select
            onValueChange={(val) => setYear(Number(val))}
            defaultValue={year.toString()}
          >
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

      <Card className="rounded-xl shadow-lg border border-gray-200">
        <CardContent className="p-6">
          {isPending || isFetching ? (
            <div className="flex justify-center py-10">
              <HashLoader color="#36D7B7" size={40} />
            </div>
          ) : data?.data?.length > 0 ? (
            <Table className="text-sm">
              <TableCaption className="text-gray-500 pb-4">
                Top 10 Selling Kurtis for {new Date(0, month - 1).toLocaleString("default", { month: "long" })} {year}
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  {headerCells.map((head) => (
                    <TableHead
                      key={head.key}
                      className="text-center font-semibold text-gray-700 text-sm"
                    >
                      {head.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((obj: any, idx: number) => (
                  <TableRow
                    key={idx}
                    className="hover:bg-gray-50 transition-all border-b"
                  >
                    <TableCell className="text-center font-medium">{idx + 1}</TableCell>
                    <TableCell className="text-center text-gray-700">{obj.code}</TableCell>
                    <TableCell className="text-center text-green-600 font-semibold">
                      {obj._count.code}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-gray-500 py-10">No data available for the selected month.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayAnalytics;
