'use client';
import React, { useEffect, useState } from 'react'
import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { RoleGateForComponent } from '@/src/components/auth/role-gate-component';
import { UserRole } from '@prisma/client';
import NotAllowedPage from '../_components/errorPages/NotAllowedPage';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz'
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
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/sell/history`);// Adjust the API endpoint based on your actual setup
                const result = await response.json();
                console.log(result.data);
                let data = result.data.reverse();
                setSellData(data);
            }
            catch (e: any) {
                console.log(e.message);
            }
            finally {
                setLoader(false);
            }
        }
        fetchData();
    }, []);

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
                    {sellData &&
                      sellData.map((obj, idx) => {
                        let isoString = obj.sellTime;
                        let [date, time] = isoString.split("T");
                        let [hours, minutes, seconds] = time.split(":");
                        hours = parseInt(hours, 10);
                        minutes = parseInt(minutes, 10);
                        seconds = parseInt(seconds, 10);

                        // Determine AM or PM
                        const period = hours >= 12 ? "PM" : "AM";

                        // Convert hours to 12-hour format
                        let displayHours = hours % 12;
                        displayHours = displayHours === 0 ? 12 : displayHours; // Handle midnight (0) as 12 AM

                        // Format minutes and seconds with leading zeros if needed
                        const displayMinutes =
                          minutes < 10 ? `0${minutes}` : minutes;

                        // Construct the final formatted time string
                        const formattedTime = `${displayHours}:${displayMinutes} ${period}`;
                        return (
                          <TableRow key={obj.id}>
                            <TableCell className="text-center">
                              {sellData.length - idx}
                            </TableCell>
                            <TableCell className="text-center">
                              {/* {format(new Date(timeIn24HourFormat), 'h:mm aa')} */}
                              {formattedTime}
                            </TableCell>
                            <TableCell className="text-center">
                              {obj.sellerName}
                            </TableCell>
                            <TableCell className="text-center">
                              {obj.code}
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
        <>

            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER,]}>
                <SellingHistory />
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.SELLER, UserRole.RESELLER]}>
                <NotAllowedPage />
            </RoleGateForComponent>
        </>
    )
}

export default SellingHistory