"use client";

import PageLoader from '@/src/components/loader';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react'
import KurtiPicCardSingle from '../../../_components/kurti/kurtiPicCardSingle';
import KurtiUpdate from '../../../_components/kurti/kurtiUpdate';
import { RoleGateForComponent } from '@/src/components/auth/role-gate-component';
import NotAllowedPage from '../../../_components/errorPages/NotAllowedPage';
import { UserRole } from '@prisma/client';
import { useRouter } from 'next/router';
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
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    let paths = pathname.split('/');
    const handleKurtiUpdate = async (data: kurti) => {
        console.log('data', data);
        await setKurtiData(data);
        setLoading(true);
    }
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
                setLoading(false);
            }
        }
        if(loading) {
            fetchData();
        }
    }, [setKurtiData, loading]);

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
                        {kurtiData ? <KurtiUpdate data={kurtiData} onKurtiUpdate={handleKurtiUpdate}/> : ""}
                    </div>
                    <div className="w-full flex flex-row space-evenely justify-center flex-wrap gap-3">
                        {kurtiData?.images.map((img, idx) => {
                            return (
                                <KurtiPicCardSingle data={kurtiData} idx={idx} onPicDelete={handleKurtiUpdate}/>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

const CatalogueKurtiHelper = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
                <OneKurtiPage/>
                
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.SELLER,  UserRole.RESELLER]}>
                <NotAllowedPage/>
            </RoleGateForComponent>
        </>
    );
}


export default CatalogueKurtiHelper;