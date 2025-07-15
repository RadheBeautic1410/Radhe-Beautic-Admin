"use client";
import { fetchMovedKurtiHistory } from "@/src/actions/kurti";
import { JsonValue } from "@prisma/client/runtime/library";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import Link from "next/link";

interface MovedKurti {
  id: string;
  kurtiId: string;
  fromCategory: string;
  toCategory: string;
  oldKurtiCode: string;
  newKurtiCode: string;
  sizes: JsonValue[];
  date: Date;
}

const MovedHistory = () => {
  const [historyData, setHistoryData] = useState<MovedKurti[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchMovedKurtiHistory();
        if (!res.success) {
          toast.error(res.error || "Failed to fetch moved history");
        }
        setHistoryData((res.data as MovedKurti[]) || []);
      } catch (error) {
        console.error("Error fetching moved history:", error);
        toast.error("Failed to fetch moved history");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSizes = (sizes: { size: string; quantity: number }[]) => {
    return (
      <div className="flex flex-wrap gap-1">
        {sizes.map((sizeItem, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
          >
            {sizeItem.size}: {sizeItem.quantity}
          </span>
        ))}
      </div>
    );
  };

  // Pagination calculations
  const totalPages = Math.ceil(historyData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = historyData.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setPageInput("");
    } else {
      toast.error(
        `Please enter a valid page number between 1 and ${totalPages}`
      );
    }
  };

  const getPaginationRange = () => {
    const range = [];
    const showPages = 5;
    let start = Math.max(1, currentPage - Math.floor(showPages / 2));
    let end = Math.min(totalPages, start + showPages - 1);

    if (end - start + 1 < showPages) {
      start = Math.max(1, end - showPages + 1);
    }

    for (let i = start; i <= end; i++) {
      range.push(i);
    }

    return range;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto sm:p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Moved Kurti History
            </h2>
          </div>
          <div className="p-6">
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto sm:p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Moved Kurti History
          </h2>
        </div>
        <div className="p-6">
          {historyData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No moved history found
            </div>
          ) : (
            <>
              {/* Mobile Card View - Below SM */}
              <div className="sm:hidden space-y-4">
                {currentData.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(
                          item.date
                            ? item.date.toString()
                            : new Date().toString()
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">From:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.fromCategory}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">To:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.toCategory}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Old Code:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {item.oldKurtiCode}
                        </code>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">New Code:</span>
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                          {item.newKurtiCode}
                        </code>
                      </div>

                      <div className="pt-2">
                        <div className="text-sm text-gray-600 mb-1">
                          Sizes & Quantities:
                        </div>
                        {renderSizes(
                          item.sizes as { size: string; quantity: number }[]
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View - SM and Above */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        From Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        To Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Old Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sizes & Quantities
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(
                            item.date
                              ? item.date.toString()
                              : new Date().toString()
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {item.fromCategory}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/catalogue/${item.toCategory}/page/1`}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            {item.toCategory}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {item.oldKurtiCode}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {item.newKurtiCode}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {renderSizes(
                            item.sizes as { size: string; quantity: number }[]
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 space-y-4">
                  {/* Mobile Pagination - Below SM */}
                  <div className="sm:hidden">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="text-sm text-gray-500">
                        {historyData.length} entries
                      </div>
                    </div>

                    <div className="flex items-center justify-center space-x-1">
                      {/* Previous Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Current Page Info */}
                      <div className="flex items-center space-x-1 mx-2">
                        {currentPage > 2 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(1)}
                              className="px-2"
                            >
                              1
                            </Button>
                            {currentPage > 3 && (
                              <span className="text-gray-400">...</span>
                            )}
                          </>
                        )}

                        {currentPage > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            className="px-2"
                          >
                            {currentPage - 1}
                          </Button>
                        )}

                        <Button variant="default" size="sm" className="px-2">
                          {currentPage}
                        </Button>

                        {currentPage < totalPages && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            className="px-2"
                          >
                            {currentPage + 1}
                          </Button>
                        )}

                        {currentPage < totalPages - 1 && (
                          <>
                            {currentPage < totalPages - 2 && (
                              <span className="text-gray-400">...</span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePageChange(totalPages)}
                              className="px-2"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Next Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop Pagination - SM and Above */}
                  <div className="hidden sm:flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {startIndex + 1} to{" "}
                      {Math.min(endIndex, historyData.length)} of{" "}
                      {historyData.length} entries
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* First Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>

                      {/* Previous Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Page Numbers */}
                      {getPaginationRange().map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      ))}

                      {/* Next Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>

                      {/* Last Page */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Go to Page Input */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center">
                  <form
                    onSubmit={handlePageInputSubmit}
                    className="flex items-center gap-2"
                  >
                    <span className="text-sm text-gray-600">Go to page:</span>
                    <Input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      placeholder="Page"
                      className="w-16 h-8 text-sm"
                    />
                    <Button type="submit" size="sm" className="h-8">
                      Go
                    </Button>
                    <span className="text-sm text-gray-500">
                      of {totalPages}
                    </span>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovedHistory;
