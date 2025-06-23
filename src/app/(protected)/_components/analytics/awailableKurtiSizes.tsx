"use client";

import { useState } from "react";
import { HashLoader } from "react-spinners";
import { Card, CardContent } from "@/src/components/ui/card";
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
  { name: "Kurti Codes", key: "kurti_codes" },
];

const sizes = [
  "XS", "S", "M", "L", "XL", "XXL",
  "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL",
];

const DayAnalytics = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>("");

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

  // Filter by kurti code search
  const filteredSizes = sizes.filter((size) =>
    (data?.data?.kurtiCodesBySize?.[size] ?? [])
      .some((code: string) =>
        code.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredSizes.length / itemsPerPage);
  const paginatedSizes = filteredSizes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">Kurti Size Availability</h2>

      {/* Search Box */}
      <div className="flex justify-between items-center">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by Kurti Code..."
          className="border border-gray-300 rounded px-3 py-1 text-sm w-full sm:w-64 mb-2"
        />
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition">
        <CardContent className="p-6">
          {isPending || isFetching ? (
            <div className="flex justify-center py-10">
              <HashLoader color="#36D7B7" size={35} />
            </div>
          ) : data?.data ? (
            <>
              <Table className="text-sm">
                <TableCaption className="text-gray-500 pb-4">
                  Overview of Available Pieces & Kurti Codes
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
                  {paginatedSizes.map((size) => (
                    <TableRow key={size} className="hover:bg-gray-50 border-b transition">
                      <TableCell className="text-center font-medium text-gray-800">
                        {size}
                      </TableCell>
                      <TableCell className="text-center text-blue-600 font-semibold">
                        {data?.data?.availablePieceSizes?.[size] ?? 0}
                      </TableCell>
                      <TableCell className="text-left text-purple-700">
                        <div className="flex flex-wrap gap-1">
                          {(data?.data?.kurtiCodesBySize?.[size] ?? [])
                            .slice(0, 5)
                            .map((code: string, i: number) => (
                              <span
                                key={i}
                                className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium"
                              >
                                {code}
                              </span>
                            ))}
                          {(data?.data?.kurtiCodesBySize?.[size]?.length ?? 0) > 5 && (
                            <button
                              onClick={() => {
                                setSelectedCodes(data?.data?.kurtiCodesBySize?.[size] ?? []);
                                setSelectedSize(size);
                                setOpenDialog(true);
                              }}
                              className="text-xs text-blue-600 underline"
                            >
                              + More
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 space-x-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`px-3 py-1 border rounded text-sm hover:bg-gray-100 ${
                        currentPage === i + 1 ? "bg-gray-200 font-semibold" : ""
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-10">
              No data available to display.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for +More */}
      {openDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Kurti Codes for size: {selectedSize}
              </h3>
              <button
                onClick={() => setOpenDialog(false)}
                className="text-gray-500 hover:text-gray-800 text-xl"
              >
                &times;
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedCodes.map((code, i) => (
                <span
                  key={i}
                  className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayAnalytics;
