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
  { name: "Sr. No.", key: "sr_no" },
  { name: "Kurti Code", key: "kurti_code" },
  { name: "Size", key: "size" },
  { name: "Available Pieces", key: "available_pieces" },
];

const DayAnalytics = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSize, setSelectedSize] = useState("All");

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

  const kurtiSizeData: {
    [code: string]: { size: string; pieces: number }[];
  } = data?.data?.sizeDataByKurtiCode ?? {};

  // Extract unique sizes
  const allSizes = Array.from(
    new Set(
      Object.values(kurtiSizeData)
        .flat()
        .map((entry) => entry.size)
    )
  );

  const filteredKurtiCodes = Object.keys(kurtiSizeData).filter((code) => {
    const matchesSearch = code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSize =
      selectedSize === "All"
        ? true
        : kurtiSizeData[code]?.some((entry) => entry.size === selectedSize);
    return matchesSearch && matchesSize;
  });
  const sizeQuantityMap: { [size: string]: number } = {};

  Object.values(kurtiSizeData).forEach((kurtiSizes) => {
    kurtiSizes.forEach(({ size, pieces }) => {
      sizeQuantityMap[size] = (sizeQuantityMap[size] || 0) + pieces;
    });
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredKurtiCodes.length / itemsPerPage);
  const paginatedCodes = filteredKurtiCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">
        Kurti Code Availability
      </h2>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by Kurti Code..."
          className="border border-gray-300 rounded px-3 py-1 text-sm w-full sm:w-64"
        />

        <select
          value={selectedSize}
          onChange={(e) => {
            setSelectedSize(e.target.value);
            setCurrentPage(1);
          }}
          className="border border-gray-300 rounded px-3 py-1 text-sm w-full sm:w-48"
        >
          <option value="All">All Sizes</option>
          {allSizes.map((size) => (
            <option key={size} value={size}>
              {size} ({sizeQuantityMap[size] ?? 0})
            </option>
          ))}
        </select>
      </div>

      <Card className="rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition">
        <CardContent className="p-6">
          {isPending || isFetching ? (
            <div className="flex justify-center py-10">
              <HashLoader color="#36D7B7" size={35} />
            </div>
          ) : Object.keys(kurtiSizeData).length > 0 ? (
            <>
              <Table className="text-sm">
                <TableCaption className="text-gray-500 pb-4">
                  Overview of Kurti Codes, Sizes & Available Pieces
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
                  {paginatedCodes.map((code, codeIndex) => {
                    const filteredSizes = kurtiSizeData[code].filter((entry) =>
                      selectedSize === "All"
                        ? true
                        : entry.size === selectedSize
                    );

                    return filteredSizes.map((entry, index) => {
                      const isFirstRow = index === 0;
                      const srNo =
                        (currentPage - 1) * itemsPerPage + codeIndex + 1;

                      return (
                        <TableRow
                          key={`${code}-${entry.size}`}
                          className="hover:bg-gray-50 border-b transition"
                        >
                          {isFirstRow && (
                            <TableCell
                              rowSpan={filteredSizes.length}
                              className="text-center text-gray-700 align-middle font-medium"
                            >
                              {srNo}
                            </TableCell>
                          )}
                          {isFirstRow && (
                            <TableCell
                              rowSpan={filteredSizes.length}
                              className="text-center font-bold text-purple-700 align-middle"
                            >
                              {code}
                            </TableCell>
                          )}
                          <TableCell className="text-center text-gray-800">
                            {entry.size}
                          </TableCell>
                          <TableCell className="text-center text-blue-600 font-semibold">
                            {entry.pieces}
                          </TableCell>
                        </TableRow>
                      );
                    });
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-4 items-center gap-4">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-4 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  <span className="text-sm font-semibold text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-4 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
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
    </div>
  );
};

export default DayAnalytics;
