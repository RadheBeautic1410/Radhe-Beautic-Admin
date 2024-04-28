"use client";

import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Input } from '@/src/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { Value } from '@radix-ui/react-select';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import React, { useState } from 'react'
import { toast } from 'sonner';

function SellPage() {
    const [code, setCode] = useState("");
    const [kurti, setKurti] = useState<any>(null);
    const [selling, setSelling] = useState(false);
    const [sizes, setSellSize] = useState(0);
    const handleSell = async () => {
        try {
            setSelling(true);
            if (code.length < 7) {
                toast.error('PLease enter correct code!!!');
            }
            else {
                const response = await fetch(`/api/sell?code=${code}`); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                console.log(result.data);
                if (result.data.error) {
                    toast.error(result.data.error);
                    setKurti(null);
                }
                else {
                    toast.success('Sold Successfully');
                    console.log(result);
                    setKurti(result.data.kurti);
                    setSellSize(result.data.kurti.sizes.length);
                }
            }

            // const sortedCategory = (result.data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
            // setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setSelling(false);
        }
    }

    // const handleCheck = ()=>{
    //     console.log(code);
    //     if (code.length > 7) {
    //         let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    //         let temp = code.substring(7).toUpperCase();
    //         if(selectSizes.includes(temp)){
    //             handleSell();
    //         }
    //     }
    // }

    return (
        <Card className="w-[90%]">
            <CardHeader>
                <p className="text-2xl font-semibold text-center">
                    🛒 Sell
                </p>
            </CardHeader>
            <CardContent className='w-full flex flex-col space-evenely justify-center flex-wrap gap-3'>
                <div className='flex flex-row flex-wrap gap-2'>
                    <div className='flex flex-col flex-wrap'>
                        <h3>Product Code</h3>
                        <Input
                            className='w-[100%]'
                            placeholder='Enter code'
                            value={code}
                            onKeyUp={
                                (e)=>{
                                    if(e.key === 'Enter') {
                                        handleSell();
                                    }
                                }
                            }
                            onChange={(e) => { setCode(e.target.value);}}
                            // disabled
                        ></Input>
                    </div>
                    <Button type='button' className='mt-5' onClick={handleSell} disabled={selling}>
                        {selling ?
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : ""}
                        Sell
                    </Button>
                </div>
                {kurti ?
                    <div id='container' className='p-3 bg-slate-300 mt-3 w-[320px]'>
                        <div className='w-[1000px] h-[1000px]' hidden>
                            <img id={kurti.code} className="h-full w-full object-cover" src={kurti.images[0].url} crossOrigin="anonymous"></img>
                        </div>
                        <img id={`${kurti.code}-visible`} src={kurti.images[0].url} crossOrigin="anonymous" height={'300px'} width={'300px'}></img>


                        <p key={'code'} className='font-bold'>{`Code: ${kurti.code.toUpperCase()}`}</p>
                        <p key={'price'} className="text-2xl font-semibold mt-2 mb-1">{`Price - ${kurti.sellingPrice}/-`}</p>
                        <div className='flex flex-row space-evenely mb-2 gap-2'>

                            <Table className='border border-collapse border-red'>
                                <TableHeader className='border border-red text-white bg-slate-800'>
                                    <TableHead className='font-bold border border-red text-white bg-slate-800'>SIZE</TableHead>
                                    <TableHead className='font-bold border border-red text-white bg-slate-800'>STOCK</TableHead>
                                </TableHeader>
                                <TableBody>
                                    {kurti.sizes.map((sz: any, i: number) => {
                                        if (i > Math.floor(sizes / 2)) {
                                            return ""
                                        }
                                        return (

                                            <TableRow key={i} >
                                                <TableCell className='border border-red'>{sz.size.toUpperCase()}</TableCell>
                                                <TableCell className='border border-red'>{sz.quantity}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                            <Table className='border border-collapse border-red'>
                                <TableHeader className='border border-red text-white bg-slate-800'>
                                    <TableHead className='font-bold border border-red text-white bg-slate-800'>SIZE</TableHead>
                                    <TableHead className='font-bold border border-red text-white bg-slate-800'>STOCK</TableHead>
                                </TableHeader>
                                <TableBody>
                                    {kurti.sizes.map((sz: any, i: number) => {
                                        if (i <= Math.floor(sizes / 2)) {
                                            return ""
                                        }
                                        return (

                                            <TableRow key={i} >
                                                <TableCell className='border border-red'>{sz.size.toUpperCase()}</TableCell>
                                                <TableCell className='border border-red'>{sz.quantity}</TableCell>
                                            </TableRow>
                                        )
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

                    : ""}
            </CardContent>
        </Card>
    )
}

export default SellPage