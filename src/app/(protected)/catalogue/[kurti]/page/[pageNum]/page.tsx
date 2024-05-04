"use client";

import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
// import KurtiPicCard from "../../_components/kurti/kurtiPicCard";
import PageLoader from "@/src/components/loader";
import SearchBar from '@mkyy/mui-search-bar'
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
// import NotAllowedPage from "../../_components/errorPages/NotAllowedPage";
import { UserRole } from "@prisma/client";
import KurtiPicCard from '@/src/app/(protected)/_components/kurti/kurtiPicCard';
import NotValidKurtiCode from '@/src/app/(protected)/_components/errorPages/NotValidKurtiCode';
import { promise } from 'zod';
// import NotValidKurtiCode from "../../_components/errorPages/NotValidKurtiCode";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/src/components/ui/pagination"
import NotAllowedPage from '@/src/app/(protected)/_components/errorPages/NotAllowedPage';

interface category {
    id: string;
    name: string;
    normalizedLowerCase: string;
}

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

function KurtiListPage() {
    const path = usePathname().split('/');
    const [loading, setLoading] = useState(true);
    const [isErrorInPath, setPathError] = useState(false);
    const [valid, setValid] = useState(true);
    const [kurtiData, setKurtiData] = useState<kurti[]>([]);
    const [displayData, setDisplayData] = useState<kurti[]>([]);

    const pathname = usePathname();
    const baseUrl = pathname.substring(0, pathname.indexOf('page/') + 5);
    const [textFieldValue, setTextFieldValue] = useState('');
    const code = path[2];
    const pageNum = path[4];
    const [currentPage, setCurrentPage] = useState(parseInt(pageNum));
    const [totalPages, setTotalPages] = useState(1);
    const [pageLoader, setPageLoader] = useState(true);
    const router = useRouter();

    const handleSearch = (newVal: string) => {
        if (newVal === "") {
            setTextFieldValue("");
            // handleSearch(textFieldValue);
            setDisplayData(kurtiData.slice(20 * (parseInt(pageNum) - 1), 20 * (parseInt(pageNum) - 1) + 20));
        }
        else {
            const filteredRows = kurtiData.filter((row) => {
                return row.code.toUpperCase().includes(newVal.toUpperCase());
            }).slice(0, 20);
            setDisplayData(filteredRows);
        }
    }
    const cancelSearch = () => {
        setTextFieldValue("");
        handleSearch(textFieldValue);
        setDisplayData(kurtiData.slice(20 * (parseInt(pageNum) - 1), 20 * (parseInt(pageNum) - 1) + 20));
    };
    let paths = pathname.split('/');

    const handleKurtiDelete = async (data: kurti[]) => {
        console.log('data', [...data]);
        await setKurtiData([...data]);
        setLoading(true);
    }

    const handlePageChange = (page: number) => {
        if (page <= totalPages && page >= 1) {
            router.replace(`${baseUrl}${page}`);
        }
    }
    useEffect(() => {
        const fetchData = async () => {

            try {
                const response = await fetch(`/api/category/isexist?category=${code.toLowerCase()}`);
                const result = await response.json();
                if (result.data) {
                    setValid(result.data);
                    let prom1 = fetch(`/api/kurti/countAvail?cat=${code.toLowerCase()}`);
                    let prom2 = fetch(`/api/kurti/getByCategory?category=${code}`);
                    const [resPage, response2] = await Promise.all([prom1, prom2]);
                    const result2 = await response2.json();
                    const pageResult = await resPage.json();
                    console.log(Math.ceil(result2.data.length / 20));
                    console.log(result2);
                    setDisplayData(result2.data.slice(20 * (parseInt(pageNum) - 1), 20 * (parseInt(pageNum) - 1) + 20));
                    setKurtiData(result2.data);
                    setTotalPages(Math.ceil(result2.data.length / 20));
                    // setCurrentPage(parseInt(pageNum));
                    // console.log(result2.data);
                }
                else {
                    setValid(false);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
                setPageLoader(false);
            }
        }
        if (loading) {
            fetchData();
        }
    }, [loading]);

    return (
        <>
            <PageLoader loading={loading || pageLoader} />

            {loading ? "" :
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                className='cursor-pointer'
                                isActive={currentPage !== 1}
                                onClick={() => handlePageChange(currentPage - 1)}
                            />
                        </PaginationItem>
                        {currentPage - 2 <= 0 ?
                            "" :
                            <>
                                {currentPage === 2 ? "" :
                                    <PaginationItem >
                                        <PaginationLink
                                            className='cursor-pointer'
                                            onClick={() => handlePageChange(1)}
                                        >
                                            {1}
                                        </PaginationLink>
                                    </PaginationItem>
                                }
                                {currentPage === 3 ? "" :
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                }
                            </>
                        }
                        {currentPage - 1 <= 0 ? "" :
                            <PaginationItem>
                                <PaginationLink
                                    className='cursor-pointer'
                                    onClick={() => handlePageChange(currentPage - 1)}
                                // href={`${baseUrl}${currentPage - 1}`}
                                // isActive
                                >
                                    {currentPage - 1}
                                </PaginationLink>
                            </PaginationItem>
                        }
                        <PaginationItem>
                            <PaginationLink
                                href="#"
                                isActive
                            >
                                {currentPage}
                            </PaginationLink>
                        </PaginationItem>
                        {currentPage + 1 > totalPages ? "" :
                            <PaginationItem>
                                <PaginationLink
                                    className='cursor-pointer'
                                    onClick={() => handlePageChange(currentPage + 1)}
                                // isActive
                                >
                                    {currentPage + 1}
                                </PaginationLink>
                            </PaginationItem>
                        }
                        {currentPage + 2 > totalPages ?
                            "" :
                            <>
                                {totalPages - currentPage <= 2 ? "" :
                                    <PaginationItem>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                }
                                {totalPages - currentPage < 2 ? "" :
                                    <PaginationItem >
                                        <PaginationLink
                                            className='cursor-pointer'
                                            onClick={() => handlePageChange(totalPages)}
                                        >
                                            {totalPages}
                                        </PaginationLink>
                                    </PaginationItem>
                                }

                            </>
                        }
                        {/* {currentPage + 2 > totalPages ? "" :
                            <PaginationItem>
                                <PaginationEllipsis />
                            </PaginationItem>
                        } */}
                        {/* {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                            (page, idx) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href={`${baseUrl}${idx + 1}`}
                                        aria-current={page === currentPage ? "page" : undefined}
                                        isActive={currentPage === idx + 1}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            )
                        )} */}

                        <PaginationItem>
                            <PaginationNext
                                className='cursor-pointer'
                                isActive={currentPage < totalPages}
                                onClick={() => handlePageChange(currentPage + 1)}
                            // href={currentPage < totalPages ?
                            //     `${baseUrl}${currentPage + 1}` :
                            //     `#`
                            // }
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination >
            }

            {
                valid ?
                    <Card className="w-[90%]">
                        <CardHeader>
                            <p className="text-2xl font-semibold text-center">
                                {`👜 Catalogue - ${paths[2]}`}
                            </p>
                        </CardHeader>
                        <CardContent>

                            <div>
                                <SearchBar
                                    value={textFieldValue}
                                    onChange={newValue => handleSearch(newValue)}
                                    onCancelResearch={() => cancelSearch()}
                                    width={'100%'}
                                    style={{
                                        backgroundColor: '#fff',
                                        border: '1px solid #ccc',
                                    }}
                                />
                            </div>
                            {/* :
                        <div>
                            <p className="text-2xl font-semibold text-center">
                                {`👜 Error`}
                            </p>
                        </div> */}

                        </CardContent>
                        {displayData ?
                            <CardContent className="w-full flex flex-row space-evenely justify-center flex-wrap gap-3">
                                {displayData.map((data, i) => (
                                    <KurtiPicCard data={data} key={i} onKurtiDelete={handleKurtiDelete} />
                                ))}
                            </CardContent>
                            : ""}
                    </Card> :
                    <NotValidKurtiCode />
            }
        </>
    )
};

const KurtiListPageHelper = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER, UserRole.SELLER]}>
                <KurtiListPage />
            </RoleGateForComponent>
            {/* <RoleGateForComponent allowedRole={[UserRole.SELLER]}>
                <NotAllowedPage />
            </RoleGateForComponent> */}
        </>
    );
}

export default KurtiListPageHelper