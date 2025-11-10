"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

const CustomerPendingOrdersPage = () => {
  const params = useParams();
  const userId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`/api/users/${userId}/pending-online-orders`);
        if (res.data?.success) {
          setUser(res.data.data.user);
          setOrders(res.data.data.orders || []);
          setSelected({});
        } else {
          setError(res.data?.error || "Failed to load data");
        }
      } catch (e: any) {
        setError(e?.response?.data?.error || e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchData();
  }, [userId]);

  if (loading) {
    return (
      <Card className="rounded-none w-full h-full">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading customer details...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-none w-full h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-3">
          <div className="text-red-600 text-sm">{error}</div>
          <Link href="/request">
            <Button variant="outline">Back to Request List</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const selectedTotal = orders.reduce((sum: number, x: any) => sum + ((selected[x.id] ? x.totalAmount : 0) || 0), 0);
  const wallet = user?.balance ?? 0;
  const exceeds = selectedTotal > wallet;

  return (
    <Card className="rounded-none w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Customer Details</h2>
          <Link href="/request">
            <Button variant="outline">Back to Request List</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Details */}
        <div className="bg-blue-50 rounded-md p-4">
          <h3 className="font-semibold mb-2">User Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {user?.name || "-"}
            </div>
            {/* <div><span className="font-medium">Email:</span> {user?.email || "-"}</div> */}
            <div>
              <span className="font-medium">Phone:</span>{" "}
              {user?.phoneNumber || "-"}
            </div>
            <div>
              <span className="font-medium">Role:</span> {user?.role || "-"}
            </div>
            <div>
              <span className="font-medium">Wallet Balance:</span> ₹{wallet}
            </div>
          </div>
        </div>

        {/* Pending Online Orders */}
        <div className="bg-green-50 rounded-md p-4">
          <h3 className="font-semibold mb-3">Pending Online Orders</h3>
          {orders.length === 0 ? (
            <div className="text-sm text-gray-600">
              No pending online orders.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border">
                <TableHeader>
                  <TableRow className="bg-green-800">
                    <TableHead className="font-bold border text-white">
                      Select
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Batch
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Total Amount
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Total Items
                    </TableHead>
                    <TableHead className="font-bold border text-white">
                      Sale Time
                    </TableHead>
                    {/* <TableHead className="font-bold border text-white">Action</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="border">
                        <input
                          type="checkbox"
                          checked={!!selected[o.id]}
                          onChange={() => {
                            const next = { ...selected } as Record<
                              string,
                              boolean
                            >;
                            if (next[o.id]) {
                              delete next[o.id];
                            } else {
                              next[o.id] = true;
                            }
                            setSelected(next);
                          }}
                        />
                      </TableCell>
                      <TableCell className="border">{o.batchNumber}</TableCell>
                      <TableCell className="border">
                        ₹{o.totalAmount + o.order.shippingCharge}
                      </TableCell>
                      <TableCell className="border">{o.totalItems}</TableCell>
                      <TableCell className="border">
                        {new Date(o.saleTime).toLocaleString()}
                      </TableCell>
                      {/* <TableCell className="border">
                        <div className="flex gap-2">
                          <Link href={`/online-sales/${o.id}`}>
                            <Button size="sm">Open</Button>
                          </Link>
                        </div>
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm">
                  <span className="text-gray-700">
                    Selected Total: ₹{selectedTotal} / Wallet: ₹{wallet}
                  </span>
                  {exceeds && (
                    <span className="ml-2 text-red-600 font-medium">
                      Total exceeds wallet balance
                    </span>
                  )}
                </div>
                <Button
                  disabled={
                    settling || Object.keys(selected).length === 0 || exceeds
                  }
                  onClick={async () => {
                    try {
                      setSettling(true);
                      const batchIds = Object.keys(selected).filter(
                        (k) => selected[k]
                      );
                      const res = await axios.post(
                        `/api/users/${userId}/settle-pending-online-orders`,
                        { batchIds }
                      );
                      if (res.data?.success !== false) {
                        // refresh page data
                        const refreshed = await axios.get(
                          `/api/users/${userId}/pending-online-orders`
                        );
                        if (refreshed.data?.success) {
                          setUser(refreshed.data.data.user);
                          setOrders(refreshed.data.data.orders || []);
                          setSelected({});
                        }
                      }
                    } catch (e: any) {
                      alert(
                        e?.response?.data?.error ||
                          e?.message ||
                          "Failed to settle"
                      );
                    } finally {
                      setSettling(false);
                    }
                  }}
                >
                  {settling ? "Processing..." : "Settle Selected"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerPendingOrdersPage;


