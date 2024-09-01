"use client";

import { RoleGateForComponent } from '@/src/components/auth/role-gate-component';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { UserRole } from '@prisma/client';
import axios from 'axios';
import { log } from 'console';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import { ImageWatermark } from 'watermark-js-plus'
import NextImage from 'next/image';
import { DialogDemo } from '@/src/components/dialog-demo';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/dialog"

interface kurti {
    id: string;
    category: string;
    code: string;
    images: any[],
    sizes: any[],
    party: string,
    sellingPrice: string,
    actualPrice: string,
}

interface KurtiPicCardProps {
    data: any;
    onKurtiDelete: (data: any) => void;
}

const KurtiPicCard: React.FC<KurtiPicCardProps> = ({ data, onKurtiDelete }) => {
    // console.log(data);
    const [downloading, setDownloading] = useState(false);
    const [stockString, setStockString] = useState(``);
    let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const pathname = usePathname();
    // console.log(pathname.split('/'));
    let sizes = data.sizes.length;
    const [isBrowserMobile, setIsBrowserMobile] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!data?.images?.[0]?.url) {
            console.error('Image URL is not available');
            return;
        }

        const img = new Image();
        img.src = data.images[0].url;

        img.onload = () => {
            console.log('Image loaded:', img.width, img.height);
            setDimensions({ width: img.width, height: img.height });
        };

        img.onerror = (error) => {
            console.error('Error loading image:', error);
        };

        // Optional: Add cleanup function if necessary
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [data.images]);

    useEffect(() => {
        const handleResize = () => {
            setIsBrowserMobile(window.innerWidth < 992);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDelete = async () => {
        try {
            console.log('data', data)
            const res = await fetch(`/api/kurti/delete?cat=${data?.category}&code=${data?.code}`);
            const result = await res.json();
            console.log("res", result);
            await onKurtiDelete(result.data);
        } catch (e: any) {
            console.log(e.message);
            toast.error('Failed to delete');
        }
    }

    async function downloadImage(imageId: string) {
        var image = document.getElementById(imageId) as HTMLImageElement;
        var canvas = document.createElement('canvas');
        var ctx = await canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;

        // Draw image onto canvas
        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Convert canvas to compressed image format (JPEG)
        var compressedImage = canvas.toDataURL('image/jpeg', 0.8);
        var downloadLink = document.createElement('a');
        // console.log(image.src)
        downloadLink.href = compressedImage;
        downloadLink.download = `${imageId}.jpg`;
        // downloadLink.target = "_blank";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        image.src = data.images[0].url
    }
    const loadWatermark = async (rightText: string, leftText: string) => {
        const imgDom = document.querySelector(`#download${data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#download${data.code}`) as HTMLImageElement;

        const watermark = new ImageWatermark({
            contentType: 'image',
            image: rightText,
            imageWidth: imgDom.width / 10,
            imageHeight: imgDom.height / 27,
            width: imgDom.width,
            height: imgDom.height,
            dom: imgDom,
            rotate: 0,
            globalAlpha: 1,
            translatePlacement: 'top-end'
        });
        // let txt = ``+rightText+`  `;
        // console.log(imgDom2.width/3.1, imgDom2.height/11);
        const watermark2 = new ImageWatermark({
            contentType: 'image',
            image: leftText,
            imageWidth: imgDom2.width / 6,
            imageHeight: imgDom2.height / 16,
            width: imgDom2.width,
            height: imgDom2.height,
            dom: imgDom2,
            rotate: 0,
            globalAlpha: 1,
            translatePlacement: 'top-start'
        });
        await watermark.create();
        await watermark2.create();
        // imgDom2.height = 2000;
        // imgDom2.width = 2000;
        // imgDom.classList.value = 'h-full w-full object-cover'
        // setWatermark2(watermark2);
        // setWatermark(watermark);
        // watermark.create();
    };
    const findBlocks = async () => {
        let sizesArray: any[] = data.sizes;
        sizesArray.sort((a, b) => selectSizes.indexOf(a.size) - selectSizes.indexOf(b.size));
        let ele = [];
        let blocks: string = ``;
        let stk = ``;
        for (let i = 0; i < sizesArray.length; i++) {
            ele.push(selectSizes.indexOf(sizesArray[i].size.toUpperCase()));
            if (selectSizes.indexOf(sizesArray[i].size.toUpperCase()) > 0) {
                ele.push(selectSizes.indexOf(sizesArray[i].size.toUpperCase()) - 1);
            }
            stk += `${sizesArray[i].size.toUpperCase()} - ${sizesArray[i].quantity}\n`;
        }
        console.log(stk);
        setStockString(stk);
        ele.sort((a, b) => a - b);
        let S1 = ``;
        for (let i = 0; i < ele.length; i++) {
            if (i === 0 || ele[i] !== ele[i - 1]) {
                blocks += `\u2063  ${selectSizes[ele[i]]}`
            }
        }
        console.log(blocks, blocks.length);
        let url = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg?text=${blocks}`;
        const res = await axios.get(url);
        console.log(res.data);
        let url2 = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg2?text=${data.code.toUpperCase()}`;
        const res2 = await axios.get(url2);
        // let rightText: string = ` ${data.code.toUpperCase()}   `;
        await loadWatermark(res2.data, res.data);
        // return res.data;
    }

    const handleClick = async () => {
        const imgDom = document.querySelector(`#download${data.code}`) as HTMLImageElement;
        // const imgDom2 = document.querySelector(`#download${data.code}`) as HTMLImageElement;
        console.log(imgDom.complete, dimensions);
        if (imgDom.complete && (dimensions.width !== 0 && dimensions.height !== 0)) {
            setDownloading(true);
            await findBlocks();
            await downloadImage(`download${data.code}`);
            setDownloading(false);
        }
        else {
            toast.error('Image not loaded yet');
        }
    }

    return (
        <div id='container' className='p-3 bg-slate-300'>
            <div className='w-[2200px] h-[2200px]' hidden>
                {/* <NextImage
                    src={data.images[0].url}
                    id={`download${data.code}`} className="h-full w-full object-cover"
                    alt=''
                    crossOrigin="anonymous"
                    width={dimensions.width}
                    height={dimensions.height}
                /> */}
                <img
                    id={`download${data.code}`}
                    className="w-full h-full object-cover"
                    src={data.images[0].url}
                    crossOrigin="anonymous"
                    width={dimensions.width}
                    height={dimensions.height}
                ></img>
            </div>
            <img
                src={data.images[0].url}
                id={`${data.code}-visible`}
                alt=''
                crossOrigin="anonymous"
                loading='lazy'
                // blurDataURL={data.images[0].url}
                className='object-contain w-[250px] h-[250px]'
                width={dimensions.width}
                height={dimensions.height}
                style={{
                    width: '300px',
                    height: '300px'
                }}
            />
            {/* <img 
                loading="lazy" 
                id={`${data.code}-visible`} 
                src={data.images[0].url} 
                crossOrigin="anonymous" 
                className='object-contain w-[250px] h-[250px]'
                height={'250px'} 
                width={'250px'}
            ></img> */}


            <p key={'code'} className='font-bold'>{`Code: ${data.code.toUpperCase()} (${data.images.length} Images)`}</p>
            <p key={'price'} className="text-2xl font-semibold mt-2 mb-1">{`Price - ${data.sellingPrice}/-`}</p>
            <div className='flex flex-row space-evenely mb-2 gap-2'>
                <Table className='border border-collapse border-red'>
                    <TableHeader className='border border-red text-white bg-slate-800'>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>SIZE</TableHead>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>STOCK</TableHead>
                    </TableHeader>
                    <TableBody>
                        {data.sizes.map((sz: any, i: number) => {
                            if (i >= Math.ceil(sizes / 2) || sz.quantity === 0) {
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
                        {data.sizes.map((sz: any, i: number) => {
                            if (i < Math.ceil(sizes / 2) || sz.quantity === 0) {
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
            <div className='flex flex-row space-evenely gap-3'>

                <Button type='button' onClick={handleClick} variant={'outline'} key={'download'} disabled={downloading}>
                    {downloading ?
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        : ""}
                    ⬇️
                </Button>
                <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>


                    <Link
                        href={pathname.split('/').length !== 2 ?
                            `${pathname}/${data.code.toLowerCase()}` :
                            `${pathname}/${data.category.toLowerCase()}/${data.code.toLowerCase()}`
                        }
                        className='mt-0 pt-0 mr-3'
                    >
                        <Button type='button' className="ml-3" variant={'outline'} key={'edit'}>
                            ✏️
                        </Button>
                    </Link>
                    <Button
                        className='mt-0'
                        asChild
                    >
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant={'destructive'}>
                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="25" height="25" viewBox="0 0 30 30"
                                        style={{
                                            fill: '#ffffff'
                                        }}>
                                        <path d="M 14.984375 2.4863281 A 1.0001 1.0001 0 0 0 14 3.5 L 14 4 L 8.5 4 A 1.0001 1.0001 0 0 0 7.4863281 5 L 6 5 A 1.0001 1.0001 0 1 0 6 7 L 24 7 A 1.0001 1.0001 0 1 0 24 5 L 22.513672 5 A 1.0001 1.0001 0 0 0 21.5 4 L 16 4 L 16 3.5 A 1.0001 1.0001 0 0 0 14.984375 2.4863281 z M 6 9 L 7.7929688 24.234375 C 7.9109687 25.241375 8.7633438 26 9.7773438 26 L 20.222656 26 C 21.236656 26 22.088031 25.241375 22.207031 24.234375 L 24 9 L 6 9 z"></path>
                                    </svg>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Delete Kurti</DialogTitle>
                                    <DialogDescription>
                                        Delete the kurti <span className='font-bold'>{data.code}</span>
                                    </DialogDescription>
                                </DialogHeader>
                                <Button type={'button'} variant={'destructive'} onClick={handleDelete}>
                                    Delete
                                </Button>
                            </DialogContent>
                        </Dialog>
                    </Button>
                </RoleGateForComponent>
            </div>
        </div>
    )
}

export default KurtiPicCard;