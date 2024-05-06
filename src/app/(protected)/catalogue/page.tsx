"use client"

import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/src/components/ui/table";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";
import { DialogDemo } from "@/src/components/dialog-demo";
import { deleteCategory } from "@/src/actions/kurti";
import { toast } from "sonner";

interface category {
    name: string;
    count: number;
    countOfPiece: number;
}

const ListPage = () => {
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [category, setCategory] = useState<category[]>([]);
    const [totalPiece, setTotalPiece] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                console.log(result);
                const sortedCategory = (result.data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                let sum1 = 0, sum2 = 0;
                for (let i = 0; i < sortedCategory.length; i++) {
                    sum1 += sortedCategory[i].count;
                    sum2 += sortedCategory[i].countOfPiece;
                }
                setTotalItems(sum1);
                setTotalPiece(sum2);
                setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setCategoryLoader(false);
            }
        };
        // if (categoryLoader) {
        fetchData();
        // }
    }, []);

    const handleDelete = async (category: string) => {
        startTransition(() => {
            deleteCategory({ category: category })
                .then(async (data: any) => {
                    console.log(data);
                    if (data.error) {
                        // formCategory.reset();
                        toast.error(data.error);
                    }
                    if (data.success) {
                        // formCategory.reset();
                        toast.success(data.success);

                        setCategoryLoader(true);
                        try {
                            const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                            const result = await response.json();
                            console.log(result);
                            const sortedCategory = (result.data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                            let sum1 = 0, sum2 = 0;
                            for (let i = 0; i < sortedCategory.length; i++) {
                                sum1 += sortedCategory[i].count;
                                sum2 += sortedCategory[i].countOfPiece;
                            }
                            setTotalItems(sum1);
                            setTotalPiece(sum2);
                            setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
                        } catch (error) {
                            console.error('Error fetching data:', error);
                        } finally {
                            setCategoryLoader(false);
                        }
                        // router.refresh();
                        // router.replace(`/catalogue/${data.category}/${data.code.toLowerCase()}`);
                        // setSizes(data.data);
                    }
                }).catch((e) => {
                    toast.error('Something went wrong!');
                })
        })
        return 0;
    }

    return (
        <>
            <PageLoader loading={categoryLoader} />
            {categoryLoader ? "" :
                <Card className="w-[90%]">
                    <CardHeader>
                        <p className="text-2xl font-semibold text-center">
                            👜 Catalogue
                        </p>
                    </CardHeader>
                    <CardContent>

                        <div className="flex flex-col gap-2">
                            <Table>
                                <TableCaption>List of all category</TableCaption>
                                <TableHeader>
                                    <TableRow className="text-black">
                                    <TableHead
                                            key={'sr.'}
                                            className="text-center font-bold text-base"
                                        >
                                            Sr.
                                        </TableHead>
                                        <TableHead
                                            key={'Category'}
                                            className="text-center font-bold text-base"
                                        >
                                            Category
                                        </TableHead>
                                        <TableHead
                                            className="text-center font-bold text-base"
                                            key={'Total Items'}
                                        >
                                            Total Items
                                        </TableHead>
                                        <TableHead
                                            className="text-center font-bold text-base"
                                            key={'Total Pieces'}
                                        >
                                            Total Pieces
                                        </TableHead>
                                        <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>

                                            <TableHead
                                                className="text-center font-bold text-base"
                                                key={'Delete Buttons'}
                                            >
                                                {'Delete Buttons'}
                                            </TableHead>
                                        </RoleGateForComponent>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {category.map((cat, idx) => (
                                        <TableRow
                                            key={idx}
                                        // className="" 
                                        >
                                            <TableCell 
                                                key={idx*idx}
                                                className="text-center"
                                            >
                                                {idx + 1}
                                            </TableCell>
                                            <TableCell
                                                key={cat.name}
                                                className="text-center text-blue-800 font-bold cursor-pointer"
                                                aria-label={`open categry ${cat.name} by clicking`}
                                                // onClick={() => router.push(`/catalogue/${cat.name.toLowerCase()}`)}
                                            >
                                                <Link href={`/catalogue/${cat.name.toLowerCase()}`}>
                                                    {cat.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell
                                                className="text-center"
                                                key={`${cat.name}-${cat.count}`}
                                            >
                                                {cat.count}
                                            </TableCell>
                                            <TableCell
                                                className="text-center"
                                                key={`${cat.name}-${cat.countOfPiece}`}
                                            >
                                                {cat.countOfPiece}
                                            </TableCell>
                                            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>

                                                <TableCell className="text-center"
                                                    key={`${cat.name}-delete`}
                                                >

                                                    <DialogDemo
                                                        dialogTrigger="Delete Category"
                                                        dialogTitle="Delete Category"
                                                        dialogDescription="Delete the category"
                                                        bgColor="destructive"
                                                    >
                                                        <div>
                                                            <h1>Delete</h1>
                                                            <h3>Are you sure wanted to delete category {`${cat.name}`}?</h3>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            disabled={isPending}
                                                            onClick={() => { handleDelete(cat.name) }}
                                                        // onClick={formCategory.handleSubmit(handleSubmitCategory)}
                                                        >
                                                            Delete
                                                        </Button>
                                                    </DialogDemo>
                                                </TableCell>
                                            </RoleGateForComponent>
                                        </TableRow>
                                    ))}
                                    <TableRow className="text-red-600 font-bold text-center text-base">
                                        <TableCell>
                                            {'Total'}
                                        </TableCell>
                                        <TableCell>
                                            {totalItems}
                                        </TableCell>
                                        <TableCell>
                                            {totalPiece}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            }
        </>
    )
}

const CatalogueListHelper = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER, UserRole.SELLER]}>
                <ListPage />
            </RoleGateForComponent>
            {/* <RoleGateForComponent allowedRole={[UserRole.SELLER]}>
                <NotAllowedPage />
            </RoleGateForComponent> */}
        </>
    );
}

export default CatalogueListHelper;