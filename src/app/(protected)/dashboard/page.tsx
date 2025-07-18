"use client";

import { useEffect, useState } from "react";
import { Card } from "@/src/components/ui/card";

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
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    () =>
      new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString()
        .split("T")[0]
  );
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await res.json();
      console.log("Fetched top kurtis:", data);
      setTopKurtis(data);
    } catch (error) {
      console.error("Error fetching kurtis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card className="w-full p-6">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold mb-4">Top 100 Sold Kurtis</h2>

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
              onClick={fetchData}
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
                  {/* <th className="border px-4 py-2">Image</th> */}
                  <th className="border px-4 py-2">Code</th>
                  <th className="border px-4 py-2">Party</th>
                  <th className="border px-4 py-2">Category</th>
                  <th className="border px-4 py-2">Price</th>
                  <th className="border px-4 py-2">Sold</th>
                </tr>
              </thead>
              <tbody>
                {[...topKurtis]
                  .sort((a, b) => b.soldCount - a.soldCount)
                  .map((kurti, index) => (
                    <tr key={kurti.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2 text-center">
                        {index + 1}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        {kurti.code}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        {kurti.party}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        {kurti.category}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        ₹{kurti.sellingPrice}
                      </td>
                      <td className="border px-4 py-2 text-center">
                        {kurti.soldCount}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};

export default Dashboard;
