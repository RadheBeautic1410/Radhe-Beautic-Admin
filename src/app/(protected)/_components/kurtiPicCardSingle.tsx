import { Button } from '@/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/src/components/ui/table';
import { log } from 'console';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
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
    function downloadImage(imageId: string) {
        var image = document.getElementById(imageId) as HTMLImageElement;
        var downloadLink = document.createElement('a');
        // console.log(image.src)
        downloadLink.href = image.src;
        downloadLink.download = 'image.jpg';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    useEffect(() => {
        const imgDom = document.querySelector(`#${data.code}`) as HTMLImageElement;
        const imgDom2 = document.querySelector(`#${data.code}`) as HTMLImageElement;
        const loadWatermark = (rightText: string, leftText: string) => {
            const watermark = new ImageWatermark({
                contentType: 'multi-line-text',
                content: rightText,
                width: imgDom.width,
                height: imgDom.height,
                dom: imgDom,
                rotate: 0,
                translatePlacement: 'top-end',
                fontColor: '#000',
                globalAlpha: 1,
                translateX: -10,
                translateY: 100,
                fontSize: '20px',
                fontFamily: 'serif',
                fontWeight: 'bold'
            });
            // let txt = ``+rightText+`  `;
            const watermark2 = new ImageWatermark({
                contentType: 'multi-line-text',
                content: leftText,
                width: 130,
                height: imgDom2.height,
                dom: imgDom2,
                rotate: 0,
                translatePlacement: 'top-start',
                fontColor: '#000',
                globalAlpha: 1,
                translateX: -1000,
                translateY: 150,
                fontSize: '13px',
                fontFamily: 'serif',
                lineHeight: 16,
                fontWeight: 'bold'
            });
            setWatermark2(watermark2);
            setWatermark(watermark);
            // watermark.create();
        };

        const findBlocks = () => {
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
                    // console.log(i, S1.length,  selectSizes[ele[i]]?.length);
                    if (S1.length + selectSizes[ele[i]]?.length + 2 <= 21) {
                        S1 += ` ${selectSizes[ele[i]]} `;
                        if (S1.length === 21) {
                            blocks += S1;
                            S1 = ``;
                        }
                        // console.log(i, S1);
                    }
                    else {
                        while (S1.length <= 21) {
                            S1 += ` `;
                        }
                        blocks += S1;
                        S1 = `  ${selectSizes[ele[i]]} `;
                    }
                }
            }
            blocks += S1;
            // console.log(blocks, blocks.length);
            return blocks;
        }

        if (imgDom.complete) {
            let rightText: string = ` ${data.code.toUpperCase()}   `;
            let leftText: string = findBlocks();
            loadWatermark(rightText, leftText);
        } else {
            imgDom.onload = function (this: GlobalEventHandlers, ev: Event) {
                // Call loadWatermark function with the appropriate text argument
                loadWatermark("", "");
            };
        }


    }, [stockString]);

    const handleClick = async () => {
        await watermark.create();
        await watermark2.create();
        downloadImage(data.code);
    }
    return (
        <div id='container' className='p-3 bg-slate-300'>
            <img id={data.code} src={data.images[idx].url} crossOrigin="anonymous" height={'500px'} width={'500px'}></img>
            <Button className="mt-2" type='button' onClick={handleClick} variant={'outline'} key={'download'}>⬇️</Button>
        </div>
    )
}

export default KurtiPicCardSingle;