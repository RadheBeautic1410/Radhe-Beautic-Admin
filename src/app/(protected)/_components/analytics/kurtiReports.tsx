"use client";

import { useEffect, useState } from "react";

export default function KurtiReports() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [shopFilter, setShopFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const limit = 5;

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const res = await fetch(`/api/sell/offline-sales?page=${page}&limit=${limit}`, {
          method: "GET",
        });
        const data = await res.json();
        setReports(data?.data);
      } catch (err) {
        console.error("Error fetching Kurti Reports:", err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [page]);

  // ✅ Get unique shop names
  const shopNames: string[] = Array.from(
    new Set(
      (reports?.sales?.map(
        (sale: any) => String(sale.shop?.shopName || "N/A")
      ) || []) as string[]
    )
  );

  // ✅ Apply filters
  const filteredSales = reports?.sales
    ?.filter((sale: any) =>
      shopFilter ? (sale.shop?.shopName || "N/A") === shopFilter : true
    )
    ?.filter((sale: any) => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const shopName = sale.shop?.shopName?.toLowerCase() || "";
      const shopLocation = sale.shop?.shopLocation?.toLowerCase() || "";
      const kurtiCodes = sale.sales.map((item: any) => item.code?.toLowerCase() || "").join(" ");
      return (
        shopName.includes(term) ||
        shopLocation.includes(term) ||
        kurtiCodes.includes(term)
      );
    });

  // ✅ Calculate total profit
  const totalProfit = filteredSales?.reduce((acc: number, sale: any) => {
    const saleProfit = sale.sales.reduce((sum: number, item: any) => {
      const selledPrice = item.selledPrice ?? 0;
      const sellingPrice = Number(item.kurti?.sellingPrice ?? 0);
      return sum + (selledPrice - sellingPrice);
    }, 0);
    return acc + saleProfit;
  }, 0) ?? 0;

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!reports?.sales?.length) {
    return (
      <div className="w-full max-w-5xl mx-auto p-6">
        <p>No reports found.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Kurti Reports</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div>
          <label className="font-semibold text-sm">Filter by Shop:</label>
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="border px-2 py-1 rounded ml-2"
          >
            <option value="">All Shops</option>
            {shopNames.map((name, idx) => (
              <option key={idx} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by Kurti code, shop name, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-1 rounded w-full"
          />
        </div>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Kurti Code</th>
            <th className="p-2 border">Selled Price</th>
            <th className="p-2 border">Original Price</th>
            <th className="p-2 border">Difference</th>
            <th className="p-2 border">Shop Location</th>
          </tr>
        </thead>
        <tbody>
          {filteredSales.map((sale: any) =>
            sale.sales.map((item: any, idx: number) => {
              const selledPrice = item.selledPrice ?? 0;
              const sellingPrice = Number(item.kurti?.sellingPrice ?? 0);
              const diff = selledPrice - sellingPrice;

              return (
                <tr key={`${sale.id}-${idx}`} className="text-center">
                  <td className="p-2 border">{item.code}</td>
                  <td className="p-2 border">{selledPrice}</td>
                  <td className="p-2 border">{sellingPrice}</td>
                  <td className="p-2 border">{diff}</td>
                  <td className="p-2 border">
                    {sale.shop?.shopLocation || item.shopLocation || "N/A"}
                  </td>
                </tr>
              );
            })
          )}
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
        <span className="text-sm font-semibold text-gray-700">Page {page}</span>
        <button
          onClick={() => setPage((prev) => prev + 1)}
          disabled={!reports?.sales.length || reports?.sales.length < limit}
          className="px-4 py-1 border rounded text-sm hover:bg-gray-100 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
