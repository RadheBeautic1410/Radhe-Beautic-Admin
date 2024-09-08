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
        name: 'Kurti Size',
        key: 'kurti_size'
    },
    {
        name: 'Available Pieces',
        key: 'available_pieces',
    },
    {
      name: 'Reserved Pieces',
      key: 'reserved_pieces',
  },
];
let arr: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];


// const MONTHS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
// const YEARS: number[] = [];
// const lastYear = new Date().getFullYear() + 50;
// const currentYear = new Date().getFullYear();
// const currentMonth = new Date().getMonth() + 1;

// for (let i = 2024; i <= lastYear; i++) {
//   YEARS.push(i);
// }

const DayAnalytics = () => {
  // const [month, setMonth] = useState<number>(currentMonth);
  // const [year, setYear] = useState<number>(currentYear);

  const fetchAvailableKurtiSizes = async () => {
    const res = await fetch("/api/analytics/getAvailableKurtiSizes", {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      next: { revalidate: 300 },
    });

    return res.json();
  };

  const { isPending, isFetching, data } = useQuery({
    queryKey: ["availableKurtiSizes"],
    queryFn: () => fetchAvailableKurtiSizes(),
    placeholderData: keepPreviousData,
  });
  
  return (
    <div className="w-full max-w-lg mx-auto p-4">
      {/* <div className="grid grid-cols-2 gap-4 mb-4">
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
      </div> */}

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
                    {data?.data && arr.map((item: any, idx: any) => {
                        return (
                            <TableRow key={idx+1}>
                                <TableCell className="text-center">
                                    {item}
                                </TableCell>
                                <TableCell className="text-center">
                                    {data?.data?.availablePieceSizes[item] }
                                </TableCell>
                                <TableCell className="text-center">
                                    {data?.data?.reservedSizes[item]}
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
