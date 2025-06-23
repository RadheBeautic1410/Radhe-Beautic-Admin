"use client";

import { useEffect, useState } from "react";
import PageLoader from "@/src/components/loader";

export default function PartyWiseSales() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 7);
  });
  const [data, setData] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/getPartyWiseCount?month=${month}`
      );
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (month) fetchData();
  }, [month]);

  // Filtering
  const filteredData = Object.entries(data).filter(([party]) =>
    party.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Change page handler
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold mb-4">Party-wise Sold Kurtis</h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  {/* Search (left side) */}
  <input
    type="text"
    placeholder="Search party"
    value={search}
    onChange={(e) => {
      setSearch(e.target.value);
      setCurrentPage(1);
    }}
    className="p-2 border rounded w-full sm:w-1/2"
  />

  {/* Month Filter (right side) */}
  <input
    type="month"
    value={month}
    onChange={(e) => {
      setMonth(e.target.value);
      setCurrentPage(1);
    }}
    className="p-2 border rounded w-full sm:w-[180px]"
  />
</div>


      {/* Loading */}
      {loading ? (
        <PageLoader loading={true} />
      ) : currentItems.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-md">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                  <th className="p-3 border-b">Party</th>
                  <th className="p-3 border-b">Sold Kurtis</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map(([party, count]) => (
                  <tr key={party} className="text-sm border-t hover:bg-gray-50">
                    <td className="p-3 font-medium capitalize">{party}</td>
                    <td className="p-3">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNum = index + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 border rounded ${
                    pageNum === currentPage ? "bg-gray-200 font-semibold" : ""
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <p className="text-gray-500">No data to display.</p>
      )}
    </div>
  );
}
