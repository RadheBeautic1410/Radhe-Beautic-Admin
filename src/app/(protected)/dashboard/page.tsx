"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/components/ui/card";
import { getDailyPaymentWiseKurtiSummary } from "@/src/actions/shop";

type Kurti = {
  id: string;
  code: string;
  soldCount: number;
  party: string;
  category: string;
  sellingPrice: string;
  images: any[];
};

const Dashboard = () => {
  const [topKurtis, setTopKurtis] = useState<Kurti[]>([]);
  const [counterReport, setCounterReport] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      // const res = await fetch(
      //   `/api/dashboard?startDate=${startDate}&endDate=${endDate}`
      // );
      // const data = await res.json();
      // console.log("Fetched top kurtis:", data);
      // // Ensure it's always an array
      // setTopKurtis(Array.isArray(data) ? data : data.kurtis || []);
    } catch (error) {
      console.error("Error fetching kurtis:", error);
      setTopKurtis([]); // fallback
    } finally {
      setLoading(false);
    }
  };
  const fetchDailyCounterReport = async () => {
    setLoading(true);
    try {
      const res = await getDailyPaymentWiseKurtiSummary(
        new Date(startDate),
        new Date(endDate)
      );
      setCounterReport(res);
    } catch (error) {
      console.error("Error fetching kurtis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // fetchData();
    fetchDailyCounterReport();
  }, []);

  return (
    <Card className="w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold mb-4">Daily Counter Report</h2>

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-2 w-[180px]"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-2 w-[180px]"
            />
          </div>
          <div className="mt-[22px]">
            <button
              onClick={fetchDailyCounterReport}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Apply Filter
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">#</th>
                  <th className="border px-4 py-2">Shop Name</th>
                  <th className="border px-4 py-2">Panyment Type</th>
                  <th className="border px-4 py-2">Total Kurtis</th>

                  <th className="border px-4 py-2">Amount</th>
                </tr>
              </thead>
              {Array.isArray(counterReport) && counterReport.length > 0 ? (
                counterReport.map((reportData, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border px-4 py-2 text-center">
                      {index + 1}
                    </td>
                    <td className="border px-4 py-2">
                      {reportData.shopName || "N/A"}
                    </td>
                    <td className="border px-4 py-2">
                      {reportData.paymentType}
                    </td>
                    <td className="border px-4 py-2 text-right">
                      {reportData.totalKurtis}
                    </td>
                    <td className="border px-4 py-2 text-right">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(reportData.totalAmount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-4">
                    No data available
                  </td>
                </tr>
              )}
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Dashboard;
