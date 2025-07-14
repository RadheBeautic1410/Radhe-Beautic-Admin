"use client";
import { fetchMovedKurtiHistory } from "@/src/actions/kurti";
import { JsonValue } from "@prisma/client/runtime/library";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

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

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchMovedKurtiHistory();
        if (!res.success) {
          toast.error(res.error || "Failed to fetch moved history");
        }
        setHistoryData(res.data as MovedKurti[] || []);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
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
    <div className="max-w-7xl mx-auto p-6">
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
            <div className="overflow-x-auto">
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
                  {historyData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(item.date ? item.date.toString() : new Date().toString())}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.fromCategory}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.toCategory}
                        </span>
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
                        {renderSizes(item.sizes as { size: string; quantity: number }[])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-sm text-gray-500 text-center">
                Total entries: {historyData.length}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovedHistory;
