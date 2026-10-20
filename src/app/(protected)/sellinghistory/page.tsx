'use client';
import React, { useEffect, useMemo, useState } from 'react'
import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Input } from '@/src/components/ui/input';
import { UserRole } from '@prisma/client';
import NotAllowedPage from '../_components/errorPages/NotAllowedPage';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz'
import { useCurrentUser } from '@/src/hooks/use-current-user';
import { getUserShop } from '@/src/actions/shop';
import { PermissionGate } from "@/src/components/auth/permission-gate";
import { usePermissions } from "@/src/components/auth/permissions-provider";
import { locationForShopId, shopDisplayName } from "@/src/lib/godown";
const headerCells = [
    {
        name: 'Sr.',
        key: 'sr'
    },
    {
        name: 'Time',
        key: 'time',
    },
    {
        name: 'Name',
        key: 'name',
    },
    {
        name: 'Code',
        key: 'code',
    },
    {
        name: 'Sold Size',
        key: 'size',
    }
]

function SellingHistory() {
    const [loader, setLoader] = useState(true);
    const [sellData, setSellData] = useState<any[]>([]);
    const [search, setSearch] = useState<string>("");
    const [shops, setShops] = useState<any[]>([]);
    const [selectedShopId, setSelectedShopId] = useState<string>("DIRECT"); // 'DIRECT' shows direct sells
    const [userShop, setUserShop] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        // Default to today's date in YYYY-MM-DD
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const currentUser = useCurrentUser();
    const { can } = usePermissions();
    // Without "use any stock location" the login is locked to its own shop.
    const ownShopOnly = !can("stockLocation.anyLocation");
    useEffect(() => {
        // Load shops for dropdown (include Direct Sell option locally)
        const loadShops = async () => {
            try {
                const res = await fetch('/api/shops');
                const json = await res.json();
                // Ground Floor, 1st Floor, other shops, then Shop 316 last
                const rank = (s: any) =>
                    ({ FLOOR_1: 0, FLOOR_2: 1, SHOP_316: 3 } as Record<string, number>)[
                        locationForShopId(s.id) || ""
                    ] ?? 2;
                if (json?.data) setShops(json.data.slice().sort((a: any, b: any) => rank(a) - rank(b)));
            } catch (e: any) {
                console.log('Failed to load shops', e?.message || e);
            }
        };
        loadShops();
    }, []);

    // If role is SHOP_SELLER, lock to their shop and disable filter
    useEffect(() => {
        const initForShopSeller = async () => {
            try {
                if (currentUser?.id && ownShopOnly) {
                    const shop = await getUserShop(currentUser.id);
                    if (shop) {
                        setUserShop(shop);
                        setSelectedShopId(shop.id);
                    }
                }
            } catch (e: any) {
                console.log('Failed to init shop for user', e?.message || e);
            }
        };
        initForShopSeller();
    }, [currentUser]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoader(true);
                const params = new URLSearchParams();
                if (selectedDate) params.set('date', selectedDate);
                if (selectedShopId) params.set('shopId', selectedShopId);
                const response = await fetch(`/api/sell/history?${params.toString()}`);
                const result = await response.json();
                let data = (result.data || []).slice().reverse();
                setSellData(data);
            } catch (e: any) {
                console.log(e.message);
            } finally {
                setLoader(false);
            }
        };
        fetchData();
    }, [selectedDate, selectedShopId]);

    const filteredData = useMemo(() => {
        return sellData.filter((obj) => {
            if (!search) return true;
            const q = search.toLowerCase();
            const name = String(obj.sellerName || "").toLowerCase();
            const code = String(obj.code || "").toLowerCase();
            return name.includes(q) || code.includes(q);
        });
    }, [sellData, search]);

    const shouldShowSummary = selectedShopId !== "DIRECT";

    const summary = useMemo(() => {
      return filteredData.reduce(
        (acc, row) => {
          const quantity = Number(row.quantity || 1);
          const selledPrice = Number(row.selledPrice || 0);
          const amount = quantity * selledPrice;
          const paymentType = String(row.paymentType || "").toUpperCase();

          acc.totalPiece += quantity;
          if (row.source === "OFFLINE_MANUAL") acc.untrackedPiece += quantity;
          acc.totalAmount += amount;

          if (paymentType.includes("CASH")) {
            acc.cashAmount += amount;
          } else if (
            paymentType.includes("GPAY") ||
            paymentType.includes("G-PAY") ||
            paymentType.includes("GOOGLE PAY")
          ) {
            acc.gpayAmount += amount;
          }

          return acc;
        },
        {
          totalPiece: 0,
          untrackedPiece: 0,
          totalAmount: 0,
          cashAmount: 0,
          gpayAmount: 0,
        }
      );
    }, [filteredData]);

    return (
      <>
        <PageLoader loading={loader} />
        {loader ? (
          ""
        ) : (
          <Card className="rounded-none w-full h-full">
            <CardHeader>
              <p className="text-2xl font-semibold text-center">
                🛒 Sell History
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3">
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col">
                      <label htmlFor="date" className="text-sm mb-1">Date</label>
                      <Input
                        id="date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label htmlFor="shop" className="text-sm mb-1">Shop</label>
                      {ownShopOnly ? (
                        <div className="p-2 border rounded-md bg-gray-50 min-w-[220px]">
                          {userShop ? (
                            <span className="text-gray-700 font-medium">
                              {shopDisplayName(userShop)}
                            </span>
                          ) : (
                            <span className="text-gray-500">No shop associated</span>
                          )}
                        </div>
                      ) : (
                        <select
                          id="shop"
                          className="p-2 border rounded-md min-w-[220px]"
                          value={selectedShopId}
                          onChange={(e) => setSelectedShopId(e.target.value)}
                        >
                          <option value="DIRECT">Direct Sell</option>
                          {shops.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {shopDisplayName(s)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or code"
                      className="w-full md:max-w-md"
                    />
                  </div>
                </div>
                {shouldShowSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                    <div className="border rounded-md p-3 bg-slate-50">
                      <p className="text-xs text-slate-600">Total Piece</p>
                      <p className="text-lg font-semibold">
                        {summary.totalPiece}
                        {summary.untrackedPiece > 0 && (
                          <span className="ml-2 text-xs font-normal text-amber-700">
                            (incl. {summary.untrackedPiece} untracked)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="border rounded-md p-3 bg-green-50">
                      <p className="text-xs text-green-700">Cash Amount</p>
                      <p className="text-lg font-semibold text-green-800">₹{summary.cashAmount.toFixed(2)}</p>
                    </div>
                    <div className="border rounded-md p-3 bg-blue-50">
                      <p className="text-xs text-blue-700">GPay Amount</p>
                      <p className="text-lg font-semibold text-blue-800">₹{summary.gpayAmount.toFixed(2)}</p>
                    </div>
                    <div className="border rounded-md p-3 bg-slate-50">
                      <p className="text-xs text-slate-600">Total Amount</p>
                      <p className="text-lg font-semibold">₹{summary.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow className="text-black">
                      {headerCells.map((obj) => {
                        return (
                          <TableHead
                            key={obj.key}
                            className="text-center font-bold text-base"
                          >
                            {obj.name}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData &&
                      filteredData.map((obj, idx) => {
                        const dt = new Date(obj.sellTime);
                        const dateStr = dt.toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        });
                        const timeStr = dt.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        });
                        return (
                          <TableRow
                            key={obj.id}
                            className={obj.source === "OFFLINE_MANUAL" ? "bg-amber-50" : undefined}
                          >
                            <TableCell className="text-center">
                              {filteredData.length - idx}
                            </TableCell>
                            <TableCell className="text-center">
                              {dateStr} {timeStr}
                            </TableCell>
                            <TableCell className="text-center">
                              {obj.sellerName}
                            </TableCell>
                            <TableCell className="text-center">
                              {obj.code}
                              {obj.source === "OFFLINE_MANUAL" && obj.category && (
                                <span className="ml-1 text-xs text-amber-700">({obj.category})</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {obj.kurtiSize}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
}

const SellHistoruHelper = () => {
  return (
    <PermissionGate permission="sellingHistory.view" fallback={<NotAllowedPage />}>
      <SellingHistory />
    </PermissionGate>
  );
};

export default SellingHistory