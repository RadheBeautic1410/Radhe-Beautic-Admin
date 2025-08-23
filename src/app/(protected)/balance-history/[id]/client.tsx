"use client";

import { Card } from "@/src/components/ui/card";
import { useEffect, useState } from "react";

interface WalletTxn {
  id: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  paymentMethod: string;
  createdAt: string;
}

export default function BalanceHistoryClient({ userId }: { userId: string }) {
  const [history, setHistory] = useState<WalletTxn[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10; // number of rows to display per page

  useEffect(() => {
    const getWalletHistory = async () => {
      try {
        const res = await fetch(`/api/wallet/history?userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          console.log("data:", data);
          setHistory(data.history);
        } else {
          console.error("Failed to fetch history");
        }
      } catch (err) {
        console.error("Error fetching history", err);
      } finally {
        setLoading(false);
      }
    };

    getWalletHistory();
  }, [userId]);

  // Pagination calculations
  const totalPages = history ? Math.ceil(history.length / rowsPerPage) : 1;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = history ? history.slice(startIndex, startIndex + rowsPerPage) : [];

  return (
    <Card className="rounded-xl shadow-md">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Balance History</h1>

        <div className="overflow-auto">
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Payment Method</th>
                <th className="p-2 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center p-4">
                    Loading...
                  </td>
                </tr>
              ) : paginatedData && paginatedData.length > 0 ? (
                paginatedData.map((txn) => (
                  <tr key={txn.id} className="text-center">
                    <td className="p-2 border">{txn.amount}</td>
                    <td
                      className={`p-2 border ${
                        txn.type === "CREDIT"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {txn.type}
                    </td>
                    <td className="p-2 border">{txn.paymentMethod}</td>
                    <td className="p-2 border">
                      {new Date(txn.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center p-4">
                    No transaction history found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {history && history.length > rowsPerPage && (
          <div className="flex justify-center items-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
