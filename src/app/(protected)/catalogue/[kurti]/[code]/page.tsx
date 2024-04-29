// "use client";

import PageLoader from '@/src/components/loader';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import KurtiPicCardSingle from '../../../_components/kurtiPicCardSingle';
import KurtiUpdate from '../../../_components/kurtiUpdate';
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

function OneKurtiPage() {
    const [kurtiData, setKurtiData] = useState<kurti>();
    const [loader, setLoader] = useState(true);
    const [valid, setValid] = useState(true);
    const pathname = usePathname();
    let paths = pathname.split('/');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`/api/kurti/getByCode?code=${paths[3].toLowerCase()}`); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                if (result.data) {
                    console.log(result.data);
                    setKurtiData(result.data);
                    setValid(result.data);
                }
                else {
                    setValid(false);
                }// Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoader(false);
            }
        }

        fetchData();
    }, [setKurtiData]);

    return (
        <>
            <PageLoader loading={loader} />
            <Card className="w-[90%]">
                <CardHeader className='font-bold'>
                    <p className="text-2xl font-semibold text-center">
                        {`👗 KURTI - ${paths[3].toUpperCase()}`}
                    </p>
                </CardHeader>
                <CardContent className='w-full'>
                    <div className='w-full flex flex-row justify-center pb-4'>
                        {kurtiData ? <KurtiUpdate data={kurtiData}/> : ""}
                    </div>
                    <div className="w-full flex flex-row space-evenely justify-center flex-wrap gap-3">
                        {kurtiData?.images.map((img, idx) => {
                            return (
                                <KurtiPicCardSingle data={kurtiData} idx={idx}/>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

export default OneKurtiPage