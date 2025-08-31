"use client";

import { useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

export default function KurtiOnlineReports() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [showDateFilter, setShowDateFilter] = useState(false);

  const limit = 5;

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (dateRange?.from) {
          params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
        }
        if (dateRange?.to) {
          params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
        }

        const res = await fetch(`/api/sell/online-sales/report?${params}`);
        const data = await res.json();
        console.log("Fetched Kurti Online Reports:", data);
        setReports(data?.data);
      } catch (err) {
        console.error("Error fetching Kurti Reports:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [page, dateRange]);

  // ✅ Apply search filter
  const filteredReports = reports?.report?.filter((item: any) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.kurtiCode.toLowerCase().includes(term) ||
      String(item.selledPrice).includes(term) ||
      String(item.sellingPrice).includes(term)
    );
  });

  // ✅ Total profit (already provided by API, but you can recalc)
  const totalProfit =
    filteredReports?.reduce(
      (acc: number, item: any) => acc + (item.selledPrice - item.sellingPrice),
      0
    ) ?? 0;

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!reports?.report?.length) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <p>No reports found.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Kurti Online Reports</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by Kurti code or price..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-1 rounded w-full"
          />
        </div>

        {/* Date Filter Button */}
        <Button
          onClick={() => setShowDateFilter(!showDateFilter)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Date Filter
        </Button>
      </div>

      {/* Date Filter Section */}
      {showDateFilter && (
        <div className="flex flex-col sm:flex-row gap-4 items-end p-4 bg-gray-50 rounded-lg border">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Date Range:</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setDateRange({ from: undefined, to: undefined })}
              variant="outline"
              size="sm"
            >
              Clear Range
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Kurti Code</th>
            <th className="p-2 border">Selled Price</th>
            <th className="p-2 border">Original Price</th>
            <th className="p-2 border">Difference</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.map((item: any, idx: number) => (
            <tr key={idx} className="text-center">
              <td className="p-2 border">{item.kurtiCode}</td>
              <td className="p-2 border">{item.selledPrice}</td>
              <td className="p-2 border">{item.sellingPrice}</td>
              <td className="p-2 border">{item.difference}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ Total Profit Display */}
      <div className="mt-4 p-3 border rounded bg-green-50 text-green-700 font-semibold">
        Total Profit: {totalProfit}
      </div>

      {/* Pagination */}
      <div className="flex justify-center mt-4 items-center gap-4">
        <button
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page === 1}
          className="px-4 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm font-semibold text-gray-700">
          Page {reports.currentPage} / {reports.totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => prev + 1)}
          disabled={page >= reports.totalPages}
          className="px-4 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
