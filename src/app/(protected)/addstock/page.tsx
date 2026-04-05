"use client";
import { RoleGateForComponent } from '@/src/components/auth/role-gate-component'
import React, { useState } from 'react'
import NotAllowedPage from '../_components/errorPages/NotAllowedPage'
import { UserRole } from '@prisma/client'
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import axios from 'axios';
import { Axis3D, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function StockAddPage() {
    const [code, setCode] = useState("");
    const [kurti, setKurti] = useState<any>(null);
    const [selling, setSelling] = useState(false);
    const [sizes, setSellSize] = useState(0);
    // History state
    const [historyLoading, setHistoryLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [fromDate, setFromDate] = useState<string>(() => {
        const now = new Date();
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [toDate, setToDate] = useState<string>(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });

    const fetchHistory = async (opts?: { resetPage?: boolean }) => {
        try {
            setHistoryLoading(true);
            const p = opts?.resetPage ? 1 : page;
            const params = new URLSearchParams();
            params.set('page', String(p));
            params.set('pageSize', String(pageSize));
            if (fromDate) params.set('from', fromDate);
            if (toDate) params.set('to', toDate);
            const res = await fetch(`/api/kurti/addstock/history?${params.toString()}`);
            const json = await res.json();
            const data = json?.data || { items: [], total: 0, page: 1, pageSize };
            setHistory(data.items || []);
            setTotal(data.total || 0);
            setPage(data.page || p);
        } catch (e) {
            console.error(e);
        } finally {
            setHistoryLoading(false);
        }
    };

    React.useEffect(() => {
        fetchHistory({ resetPage: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, pageSize]);

    React.useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleAdd = async () => {
        try {
            setSelling(true);
            if (code.length < 7) {
                toast.error('PLease enter correct code!!!');
            }
            else {
                const res = await axios.post(`/api/kurti/addstock`, {
                    code: code.toUpperCase(),
                })
                // const response = await fetch(`/api/sell?code=${code}`); // Adjust the API endpoint based on your actual setup
                // const result = await response.json();
                console.log(res.data);
                const data = res.data.data;
                console.log(data);
                if (data.error) {
                    toast.error(data.error);
                    setKurti(null);
                }
                else {
                    toast.success('Added Successfully');
                    setKurti(data);
                    setSellSize(data.sizes.length);
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setCode("");
            setSelling(false);
            // Refresh history after add
            fetchHistory({ resetPage: true });
        }
    }

    return (
      <Card className="w-full h-full rounded-none">
        <CardHeader>
          <p className="text-2xl font-semibold text-center">🛒 Add Stock</p>
        </CardHeader>

        <CardContent className="w-full flex flex-col space-evenely justify-center flex-wrap gap-3">
          <div className="flex flex-row flex-wrap gap-2">
            <div className="flex flex-col flex-wrap">
              <h3>Product Code</h3>
              <Input
                className="w-[100%]"
                placeholder="Enter code"
                value={code}
                onKeyUp={(e) => {
                  if (e.key === "Enter") {
                    handleAdd();
                  }
                }}
                onChange={(e) => {
                  setCode(e.target.value);
                }}
                // disabled
              ></Input>
            </div>
            <Button
              type="button"
              className="mt-5"
              onClick={handleAdd}
              disabled={selling}
            >
              {selling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : ""}
              Add
            </Button>
          </div>

          {kurti ? (
            <div id="container" className="p-3 bg-slate-300 mt-3 w-[320px]">
              <div className="w-[1000px] h-[1000px]" hidden>
                <img
                  id={kurti.code}
                  className="h-full w-full object-cover"
                  src={kurti.images[0].url}
                  crossOrigin="anonymous"
                ></img>
              </div>
              <img
                id={`${kurti.code}-visible`}
                src={kurti.images[0].url}
                crossOrigin="anonymous"
                height={"300px"}
                width={"300px"}
              ></img>

              <p
                key={"code"}
                className="font-bold"
              >{`Code: ${kurti.code.toUpperCase()}`}</p>
              <p
                key={"price"}
                className="text-2xl font-semibold mt-2 mb-1"
              >{`Price - ${kurti.sellingPrice}/-`}</p>
              {kurti.isBigPrice && kurti.bigPrice && (
                <p
                  key={"bigprice"}
                  className="text-base font-semibold mb-1"
                >{`Big Size Price - ${
                  parseFloat(kurti.bigPrice) + parseFloat(kurti.sellingPrice)
                }/-`}</p>
              )}
              <div className="flex flex-row space-evenely mb-2 gap-2">
                <Table className="border border-collapse border-red">
                  <TableHeader className="border border-red text-white bg-slate-800">
                    <TableHead className="font-bold border border-red text-white bg-slate-800">
                      SIZE
                    </TableHead>
                    <TableHead className="font-bold border border-red text-white bg-slate-800">
                      STOCK
                    </TableHead>
                  </TableHeader>
                  <TableBody>
                    {kurti.sizes.map((sz: any, i: number) => {
                      if (i > Math.floor(sizes / 2)) {
                        return "";
                      }
                      return (
                        <TableRow key={i}>
                          <TableCell className="border border-red">
                            {sz.size.toUpperCase()}
                          </TableCell>
                          <TableCell className="border border-red">
                            {sz.quantity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Table className="border border-collapse border-red">
                  <TableHeader className="border border-red text-white bg-slate-800">
                    <TableHead className="font-bold border border-red text-white bg-slate-800">
                      SIZE
                    </TableHead>
                    <TableHead className="font-bold border border-red text-white bg-slate-800">
                      STOCK
                    </TableHead>
                  </TableHeader>
                  <TableBody>
                    {kurti.sizes.map((sz: any, i: number) => {
                      if (i <= Math.floor(sizes / 2)) {
                        return "";
                      }
                      return (
                        <TableRow key={i}>
                          <TableCell className="border border-red">
                            {sz.size.toUpperCase()}
                          </TableCell>
                          <TableCell className="border border-red">
                            {sz.quantity}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* <Button type='button' onClick={handleClick} variant={'outline'} key={'download'}>⬇️</Button>
                <Link href={`${pathname}/${kurti.code.toLowerCase()}`} className='mt-0 pt-0'>
                    <Button type='button' className="ml-3" variant={'outline'} key={'edit'}>
                        ✏️
                    </Button>
                </Link> */}
            </div>
          ) : (
            ""
          )}

          {/* History Filters */}
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-lg font-semibold">📜 Stock Add History</p>
            <div className="flex flex-col md:flex-row items-start md:items-end gap-2">
              <div className="flex flex-col">
                <label className="text-sm mb-1">From</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm mb-1">To</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant={"outline" as any}
                  onClick={() => {
                    const now = new Date();
                    const toY = now.getFullYear();
                    const toM = String(now.getMonth() + 1).padStart(2, '0');
                    const toD = String(now.getDate()).padStart(2, '0');
                    const toStr = `${toY}-${toM}-${toD}`;
                    const start = new Date(now);
                    start.setDate(start.getDate() - 6);
                    const sy = start.getFullYear();
                    const sm = String(start.getMonth() + 1).padStart(2, '0');
                    const sd = String(start.getDate()).padStart(2, '0');
                    const fromStr = `${sy}-${sm}-${sd}`;
                    setFromDate(fromStr);
                    setToDate(toStr);
                    fetchHistory({ resetPage: true });
                  }}
                >
                  Last 7 days
                </Button>
                <select
                  className="p-2 border rounded-md"
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {historyLoading ? "Loading..." : `Total: ${total}`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={"outline" as any}
                  disabled={historyLoading || page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <span className="text-sm">Page {page}</span>
                <Button
                  type="button"
                  variant={"outline" as any}
                  disabled={historyLoading || page * pageSize >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
            <Table className="mt-2 border border-collapse">
              <TableHeader>
                <TableRow className="text-black">
                  <TableHead className="text-center font-bold text-base">Sr.</TableHead>
                  <TableHead className="text-center font-bold text-base">Date Time</TableHead>
                  <TableHead className="text-center font-bold text-base">Kurti Code</TableHead>
                  <TableHead className="text-center font-bold text-base">Size</TableHead>
                  <TableHead className="text-center font-bold text-base">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row, idx) => {
                  const dt = new Date(row.createdAt);
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
                  const serial = (page - 1) * pageSize + idx + 1;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-center">{serial}</TableCell>
                      <TableCell className="text-center">{dateStr} {timeStr}</TableCell>
                      <TableCell className="text-center">{row.code}</TableCell>
                      <TableCell className="text-center">{row.size}</TableCell>
                      <TableCell className="text-center">{row.quantity}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
}

const StockHelp = () => {
    return (
        <>

            <RoleGateForComponent allowedRole={[UserRole.ADMIN]}>
                <StockAddPage />
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.UPLOADER]}>
                <NotAllowedPage />
            </RoleGateForComponent>
        </>
    )
}
export default StockHelp