"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { HashLoader } from "react-spinners";

const todayDate = new Date();

const DayAnalytics = () => {
  const [date, setDate] = useState<Date | undefined>(todayDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchFilteredSales = async (date: Date | undefined) => {
    const res = await fetch("/api/analytics/getFilteredSales", {
      method: "POST",
      body: JSON.stringify({
        date: date,
        filter: "DATE",
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
      next: { revalidate: 300 },
    });

    return res.json();
  };

  const { isPending, isFetching, data } = useQuery({
    queryKey: ["filteredDaySales", date],
    queryFn: () => fetchFilteredSales(date),
    placeholderData: keepPreviousData,
    staleTime: 30,
    refetchOnWindowFocus: false,
  });

  const filteredSalesList = useMemo(() => {
    return (
      data?.salesList?.filter((item: any) =>
        item.code.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    );
  }, [data?.salesList, searchQuery]);

  const totalPages = Math.ceil(filteredSalesList.length / itemsPerPage);
  const currentItems = filteredSalesList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Day Analytics</h2>

      {/* Date Picker */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="w-full sm:w-[40%]">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Select Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal p-3 border rounded-md shadow-sm",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? format(date, "PPP") : "Pick a Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 shadow-md">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Analytics Card */}
      <Card className="rounded-xl shadow-md">
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          {isPending || isFetching ? (
            <div className="col-span-3 flex justify-center py-6">
              <HashLoader color="#36D7B7" size={30} />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-gray-600 font-medium mb-1">Sales</h3>
                <p className="text-2xl font-semibold text-blue-600">
                  ₹{" "}
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalSales || 0
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-gray-600 font-medium mb-1">Profit</h3>
                <p className="text-2xl font-semibold text-green-600">
                  ₹{" "}
                  {new Intl.NumberFormat("en-IN").format(
                    data?.data?.totalProfit || 0
                  )}
                </p>
              </div>
              <div>
                <h3 className="text-gray-600 font-medium mb-1">Total Pieces</h3>
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
      {data?.salesList && data.salesList.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Sold Kurtis</h3>

          {/* Search + Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
            <input
              type="text"
              placeholder="Search by code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-3 py-2 w-full sm:w-64"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-md">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                  <th className="p-3 border-b">Image</th>
                  <th className="p-3 border-b">Code</th>
                  <th className="p-3 border-b">Sold Count</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item: any, index: number) => (
                  <tr key={index} className="text-sm border-t hover:bg-gray-50">
                    <td className="p-3">
                      {item.image?.url ? (
                        <img
                          src={item.image.url}
                          alt={item.code}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <span className="text-gray-400 italic">No Image</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">{item.code}</td>
                    <td className="p-3">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayAnalytics;
