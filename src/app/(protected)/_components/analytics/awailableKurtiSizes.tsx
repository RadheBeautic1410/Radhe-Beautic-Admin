"use client";

import { useState } from "react";
import { HashLoader } from "react-spinners";
import {
  Card,
  CardContent,
} from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

const headerCells = [
  { name: "Kurti Size", key: "kurti_size" },
  { name: "Available Pieces", key: "available_pieces" },
  { name: "Reserved Pieces", key: "reserved_pieces" },
];

const sizes = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"
];

const DayAnalytics = () => {
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
    queryFn: fetchAvailableKurtiSizes,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Kurti Size Availability
      </h2>

      <Card className="rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition">
        <CardContent className="p-6">
          {isPending || isFetching ? (
            <div className="flex justify-center py-10">
              <HashLoader color="#36D7B7" size={35} />
            </div>
          ) : data?.data ? (
            <Table className="text-sm">
              <TableCaption className="text-gray-500 pb-4">
                Overview of Available & Reserved Kurti Sizes
              </TableCaption>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  {headerCells.map((header) => (
                    <TableHead
                      key={header.key}
                      className="text-center font-semibold text-gray-700"
                    >
                      {header.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sizes.map((size) => (
                  <TableRow
                    key={size}
                    className="hover:bg-gray-50 border-b transition"
                  >
                    <TableCell className="text-center font-medium text-gray-800">
                      {size}
                    </TableCell>
                    <TableCell className="text-center text-blue-600 font-semibold">
                      {data?.data?.availablePieceSizes?.[size] ?? 0}
                    </TableCell>
                    <TableCell className="text-center text-red-600 font-semibold">
                      {data?.data?.reservedSizes?.[size] ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-gray-500 py-10">
              No data available to display.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DayAnalytics;
