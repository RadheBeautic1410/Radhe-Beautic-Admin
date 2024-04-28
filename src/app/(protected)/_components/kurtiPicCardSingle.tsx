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

interface KurtiPicCardSingleProps {
    data: any;
    idx: number;
}

const KurtiPicCardSingle: React.FC<KurtiPicCardSingleProps> = ({ data, idx }) => {
    const [watermark, setWatermark] = useState<any>(null);
    const [watermark2, setWatermark2] = useState<any>(null);
    const [stockString, setStockString] = useState(``);
    let selectSizes: string[] = ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    const pathname = usePathname();
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
        var image = document.getElementById(`${data.code}${idx}`) as HTMLImageElement;
        var downloadLink = document.createElement('a');
        // console.log(image.src)
        downloadLink.href = image.src;
        downloadLink.download = 'image.jpg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        image.src = data.images[idx].url
    }
    const loadWatermark = async (rightText: string, leftText: string) => {
        const imgDom = document.querySelector(`#${data.code}${idx}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.code}${idx}`) as HTMLImageElement;
        let width = isBrowserMobile ? 60 : 250;
        let height = isBrowserMobile ? 25 : 90;
        let width1 = isBrowserMobile ? 50 : 200;
        let height1 = isBrowserMobile ? 15 : 50;
        const watermark = new ImageWatermark({
            contentType: 'image',
            image: rightText,
            imageWidth: width1,
            imageHeight: height1,
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
            imageWidth: imgDom2.width/3.1,
            imageHeight: imgDom2.height/10.5,
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
        const imgDom = document.querySelector(`#${data.code}${idx}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.code}${idx}`) as HTMLImageElement;
        if(imgDom.complete){
            await findBlocks();
        }
        else {
            toast.error('Image not loaded yet');
        }
        downloadImage(data.code);
    }
    return (
        <div id='container' className='p-3 bg-slate-300'>
            <img id={`${data.code}${idx}-visible`} src={data.images[idx].url} crossOrigin="anonymous" width={'500px'} height={'500px'}></img>
            <img id={`${data.code}${idx}`} src={data.images[idx].url} crossOrigin="anonymous" height={'auto'} width={'auto'} hidden></img>
            <Button className="mt-2" type='button' onClick={handleClick} variant={'outline'} key={'download'}>⬇️</Button>
        </div>
    )
}

export default KurtiPicCardSingle;