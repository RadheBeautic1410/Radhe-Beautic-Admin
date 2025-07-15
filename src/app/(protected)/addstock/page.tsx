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
        }
    }

    return (
      <Card className="w-[90%]">
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