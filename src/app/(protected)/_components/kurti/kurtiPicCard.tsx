import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import axios from 'axios';
import { log } from 'console';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import { ImageWatermark } from 'watermark-js-plus'

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

const KurtiPicCard: React.FC<KurtiPicCardProps> = ({data, onKurtiDelete }) => {
    // console.log(data);
    const [downloading, setDownloading] = useState(false);
    const [stockString, setStockString] = useState(``);
    let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const pathname = usePathname();
    let sizes = data.sizes.length;
    const [isBrowserMobile, setIsBrowserMobile] = useState(false);

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
        var compressedImage = canvas.toDataURL('image/jpeg', 0.2);
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
        const imgDom = document.querySelector(`#${data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.code}`) as HTMLImageElement;
        let width = isBrowserMobile ? 60 : 250;
        let height = isBrowserMobile ? 25 : 90;
        let width1 = isBrowserMobile ? 50 : 200;
        let height1 = isBrowserMobile ? 15 : 50;
        const watermark = new ImageWatermark({
            contentType: 'image',
            image: rightText,
            imageWidth: imgDom.width / 6,
            imageHeight: imgDom.height / 14,
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
            imageWidth: imgDom2.width / 3.8,
            imageHeight: imgDom2.height / 12,
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
        const imgDom = document.querySelector(`#${data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.code}`) as HTMLImageElement;
        if (imgDom.complete) {
            setDownloading(true);
            await findBlocks();
            await downloadImage(data.code);
            setDownloading(false);
        }
        else {
            toast.error('Image not loaded yet');
        }
    }
    return (
        <div id='container' className='p-3 bg-slate-300'>
            <div className='w-[2200px] h-[2200px]' hidden>
                <img id={data.code} className="h-full w-full object-cover" src={data.images[0].url} crossOrigin="anonymous"></img>
            </div>
            <img id={`${data.code}-visible`} src={data.images[0].url} crossOrigin="anonymous" height={'300px'} width={'300px'}></img>


            <p key={'code'} className='font-bold'>{`Code: ${data.code.toUpperCase()}`}</p>
            <p key={'price'} className="text-2xl font-semibold mt-2 mb-1">{`Price - ${data.sellingPrice}/-`}</p>
            <div className='flex flex-row space-evenely mb-2 gap-2'>
                <Table className='border border-collapse border-red'>
                    <TableHeader className='border border-red text-white bg-slate-800'>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>SIZE</TableHead>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>STOCK</TableHead>
                    </TableHeader>
                    <TableBody>
                        {data.sizes.map((sz: any, i: number) => {
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
                        {data.sizes.map((sz: any, i: number) => {
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

            <Button type='button' onClick={handleClick} variant={'outline'} key={'download'} disabled={downloading}>
                {downloading ?
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : ""}
                ⬇️
            </Button>
            <Link href={`${pathname}/${data.code.toLowerCase()}`} className='mt-0 pt-0'>
                <Button type='button' className="ml-3" variant={'outline'} key={'edit'}>
                    ✏️
                </Button>
            </Link>
            <Button type='button' className="ml-3" variant={'outline'} key={'edit'} onClick={handleDelete}>
                🗑️
            </Button>
        </div>
    )
}

export default KurtiPicCard;