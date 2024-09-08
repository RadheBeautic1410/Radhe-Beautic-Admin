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
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow, } from "@/src/components/ui/table";

const headerCells = [
    {
        name: 'Sr.',
        key: 'sr'
    },
    {
        name: 'Kurti Code',
        key: 'kurti_code',
    },
    
    {
      name: 'Sold Count',
      key: 'sold_count',
  },
];

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

  const fetchTopTenMonthlyKurties = async (month: number, year: number) => {
    const res = await fetch("/api/analytics/getMonthlyTopTenKurties", {
      method: "POST",
      body: JSON.stringify({
        date: {
          year,
          month,
        },
      }),
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
        <CardContent className="p-6 grid grid-col-2 gap-4 text-center">
            <Table>
                <TableHeader>
                    <TableRow className='text-black'>
                        {headerCells.map((obj) => {
                            return (
                                <TableHead
                                    key={obj.key}
                                    className="text-center font-bold text-base"
                                >
                                    {obj.name}
                                </TableHead>
                            )
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data?.data && data?.data.map((obj: any, idx: any) => {
                        return (
                            <TableRow key={idx+1}>
                                <TableCell className="text-center">
                                    {idx+1}
                                </TableCell>
                                <TableCell className="text-center">
                                    {obj.code}
                                </TableCell>
                                
                                <TableCell className="text-center">
                                    {obj._count.code}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayAnalytics;
