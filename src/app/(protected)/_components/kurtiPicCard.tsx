import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import axios from 'axios';
import { log } from 'console';
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

function KurtiPicCard(data: any) {
    console.log(data);
    const [watermark, setWatermark] = useState<any>(null);
    const [watermark2, setWatermark2] = useState<any>(null);
    const [stockString, setStockString] = useState(``);
    let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const pathname = usePathname();
    let sizes = data.data.sizes.length;
    const [isBrowserMobile, setIsBrowserMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            setIsBrowserMobile(window.innerWidth < 992);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);
    function downloadImage(imageId: string) {
        var image = document.getElementById(imageId) as HTMLImageElement;
        var downloadLink = document.createElement('a');
        // console.log(image.src)
        downloadLink.href = image.src;
        downloadLink.download = 'image.jpg';
        // downloadLink.target = "_blank";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        image.src = data.data.images[0].url
    }
    const loadWatermark = async (rightText: string, leftText: string) => {
        const imgDom = document.querySelector(`#${data.data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.data.code}`) as HTMLImageElement;
        let width = isBrowserMobile ? 60 : 250;
        let height = isBrowserMobile ? 25 : 90;
        let width1 = isBrowserMobile ? 50 : 200;
        let height1 = isBrowserMobile ? 15 : 50;
        const watermark = new ImageWatermark({
            contentType: 'image',
            image: rightText,
            imageWidth: imgDom.width/6,
            imageHeight: imgDom.height/14,
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
            imageWidth: imgDom2.width/3.8,
            imageHeight: imgDom2.height/12,
            width: imgDom2.width,
            height: imgDom2.height,
            dom: imgDom2,
            rotate: 0,
            globalAlpha: 1,
            translatePlacement: 'top-start'
        });
        await watermark.create();
        await watermark2.create();
        // setWatermark2(watermark2);
        // setWatermark(watermark);
        // watermark.create();
    };
    const findBlocks = async () => {
        let sizesArray: any[] = data.data.sizes;
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
        let url2 = process.env.NEXT_PUBLIC_SERVER_URL + `/genImg2?text=${data.data.code.toUpperCase()}`;
        const res2 = await axios.get(url2);
        // let rightText: string = ` ${data.data.code.toUpperCase()}   `;
        await loadWatermark(res2.data, res.data);
        // return res.data;
    }

    const handleClick = async () => {
        const imgDom = document.querySelector(`#${data.data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.data.code}`) as HTMLImageElement;
        if(imgDom.complete){
            await findBlocks();
            downloadImage(data.data.code);
        }
        else {
            toast.error('Image not loaded yet');
        }
    }
    return (
        <div id='container' className='p-3 bg-slate-300'>
            <div className='w-[600px] h-[600px]' hidden>
                <img id={data.data.code} height={'600px'} width={'600px'} className="h-full w-full object-cover" src={data.data.images[0].url}  crossOrigin="anonymous"></img>
            </div>
            <img id={`${data.data.code}-visible`} src={data.data.images[0].url} crossOrigin="anonymous" height={'300px'} width={'300px'}></img>


            <p key={'code'} className='font-bold'>{`Code: ${data.data.code.toUpperCase()}`}</p>
            <p key={'price'} className="text-2xl font-semibold mt-2 mb-1">{`Price - ${data.data.sellingPrice}/-`}</p>
            <div className='flex flex-row space-evenely mb-2 gap-2'>
                <Table className='border border-collapse border-red'>
                    <TableHeader className='border border-red text-white bg-slate-800'>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>SIZE</TableHead>
                        <TableHead className='font-bold border border-red text-white bg-slate-800'>STOCK</TableHead>
                    </TableHeader>
                    <TableBody>
                        {data.data.sizes.map((sz: any, i: number) => {
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
                        {data.data.sizes.map((sz: any, i: number) => {
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

            <Button type='button' onClick={handleClick} variant={'outline'} key={'download'}>⬇️</Button>
            <Link href={`${pathname}/${data.data.code.toLowerCase()}`} className='mt-0 pt-0'>
                <Button type='button' className="ml-3" variant={'outline'} key={'edit'}>
                    ✏️
                </Button>
            </Link>

        </div>
    )
}

export default KurtiPicCard;