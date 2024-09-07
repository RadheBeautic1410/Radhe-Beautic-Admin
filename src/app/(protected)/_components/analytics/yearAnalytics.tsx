"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Card, CardContent } from "@/src/components/ui/card";
import { HashLoader } from "react-spinners";
import { Button } from "@/src/components/ui/button";

const YEARS: number[] = [];
const lastYear = new Date().getFullYear() + 50;
const currentYear = new Date().getFullYear();

for (let i = 2024; i <= lastYear; i++) {
    YEARS.push(i);
}

const DayAnalytics = () => {
    const [year, setYear] = useState<number>(currentYear);

    const fetchFilteredSales = async (year: number) => {
        const res = await fetch("/api/analytics/getFilteredSales", {
            method: "POST",
            body: JSON.stringify({
                date: {
                    year,
                },
                filter: "YEAR",
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8",
            },
            next: { revalidate: 300 },
        });
        return res.json();
    };

    const { isPending, isFetching, data } = useQuery({
        queryKey: ['filteredDaySales', year],
        queryFn: () => fetchFilteredSales(year),
        placeholderData: null,
    });

    return (
        <div className="w-full max-w-md mx-auto p-4">
            <div className="mb-4">
                <Select onValueChange={(val) => setYear(Number(val))} defaultValue={year.toString()}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {YEARS.map((item) => (
                            <SelectItem key={item} value={`${item}`}>
                                {item}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Card className="bg-white rounded-lg shadow-lg">
                <CardContent className="p-6 grid grid-cols-3 gap-4 text-center">
                    {isPending || isFetching ? (
                        <div className="flex flex-col items-center justify-center col-span-3 py-6">
                            <HashLoader color="#36D7B7" loading={isPending || isFetching} size={30} />
                            <p className="text-gray-600 mt-4">It will take a few minutes</p>
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
};

export default DayAnalytics;
