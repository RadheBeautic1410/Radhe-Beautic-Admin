"use client";

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

interface KurtiPicCardSingleProps {
    data: any;
    idx: number;
    onPicDelete: (data: any) => void;
}

interface ImageDownloadProps {
    url: any;
    code: any;
    idx: number;
}


const ImageDownload: React.FC<ImageDownloadProps> = ({ url, code, idx }) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const img = new Image();
        // img.loading = "lazy";
        img.src = `${url}`;
        img.onload = () => {
            console.log(img.width, img.height);
            setDimensions({ width: img.width, height: img.height });
        };
    }, []);
    return (
        <img
            id={`download${code}-${idx}`}
            className="w-full h-full object-cover"
            src={url}
            crossOrigin="anonymous"
            width={dimensions.width}
            height={dimensions.height}
        ></img>
    )
}

const KurtiPicCardSingle: React.FC<KurtiPicCardSingleProps> = ({ data, idx, onPicDelete }) => {
    // const [watermark, setWatermark] = useState<any>(null);
    // const [watermark2, setWatermark2] = useState<any>(null);
    const [stockString, setStockString] = useState(``);
    let selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    // const pathname = usePathname();
    const [isBrowserMobile, setIsBrowserMobile] = useState(false);
    const [downloading, setDownloading] = useState(false);
    console.log(idx, data.code);
    useEffect(() => {
        const handleResize = () => {
            setIsBrowserMobile(window.innerWidth < 992);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    async function downloadImage(imageId: string) {
        console.log(imageId);
        var image = document.getElementById(imageId) as HTMLImageElement;
        var canvas = document.createElement('canvas');
        var ctx = await canvas.getContext('2d');

        canvas.width = image.width;
        canvas.height = image.height;

        // Draw image onto canvas
        ctx?.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Convert canvas to compressed image format (JPEG)
        var compressedImage = canvas.toDataURL('image/jpeg', 0.9);
        var downloadLink = document.createElement('a');
        // console.log(image.src)
        downloadLink.href = compressedImage;
        downloadLink.download = `${imageId}.jpg`;
        // downloadLink.target = "_blank";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        image.src = data.images[idx].url
    }

    const loadWatermark = async (rightText: string, leftText: string) => {
        const imgDom = document.querySelector(`#download${data.code}-${idx}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#download${data.code}-${idx}`) as HTMLImageElement;

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
        const imgDom = document.querySelector(`#download${data.code}-${idx}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#download${data.code}-${idx}`) as HTMLImageElement;
        if (imgDom.complete) {
            setDownloading(true);
            await findBlocks();
            await downloadImage(`download${data.code}-${idx}`);
            setDownloading(false);
        }
        else {
            toast.error('Image not loaded yet');
        }
    }

    const handleDelete = async () => {
        try {
            if (data.images.length === 1) {
                toast.error('You cannnot delete last image.');
                return;
            }
            const res = await fetch(`/api/kurti/deletePic?code=${data?.code}&idx=${idx}`);
            const result = await res.json();
            console.log("res", result);
            await onPicDelete(result.data);
        } catch (e: any) {
            console.log(e.message);
            toast.error('Something went wrong');
        }
    }

    return (
        <div id='container' className='p-3 bg-slate-300'>
            <img id={`${data.code}${idx}-visible`} src={data.images[idx].url} crossOrigin="anonymous" width={'300px'} height={'300px'}></img>
            <div className='w-[2200px] h-[2200px]' hidden>
                <ImageDownload url={data.images[idx].url} idx={idx} code={data.code} />

            </div>
            <Button className="mt-2" type='button' onClick={handleClick} variant={'outline'} key={'download'} disabled={downloading}>
                {downloading ?
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : ""}
                ⬇️
            </Button>
            <Button className="mt-2 ml-2" type='button'
                onClick={handleDelete}
                variant={'outline'}
                key={'delete'}
                disabled={downloading}
            >
                {downloading ?
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : ""}
                🗑️
            </Button>
        </div>
    )
}

export default KurtiPicCardSingle;