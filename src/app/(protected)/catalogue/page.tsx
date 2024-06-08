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
import SearchBar from "@mkyy/mui-search-bar";
import KurtiPicCard from "../_components/kurti/kurtiPicCard";
import { RadioGroup, RadioGroupItem } from "@/src/components/ui/radio-group";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { getCurrTime } from "../sell/page";
import axios from "axios";
interface category {
    name: string;
    count: number;
    countOfPiece: number;
    sellingPrice: number;
    actualPrice: number;
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


const ListPage = () => {
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [category, setCategory] = useState<category[]>([]);

    const [totalPiece, setTotalPiece] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [totalStockPrice, setTotalStockPrice] = useState(0);

    const [isPending, startTransition] = useTransition();
    const [textFieldValue, setTextFieldValue] = useState('');
    const router = useRouter();
    const [kurtiData, setKurtiData] = useState<kurti[]>([]);
    const [displayKurtiData, setDisplayKurtiData] = useState<kurti[]>([]);
    const [displayCategoryData, setDisplayCategoryData] = useState<category[]>([]);
    const [isSearching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);

    const [searchId, setSearchId] = useState("0");
    const [sortId, setSortId] = useState("0");

    const handleSearch = (newVal: string) => {
        if (searchId === "0") {
            if (newVal === "") {
                setTextFieldValue("");
                setSearching(false);
                // handleSearch(textFieldValue);
                setDisplayKurtiData(kurtiData);
                setDisplayCategoryData([]);
            }
            else {
                if (!isSearching) {
                    setSearching(true);
                }
                const filteredRows = kurtiData.filter((row) => {
                    return row.code.toUpperCase().includes(newVal.toUpperCase());
                }).slice(0, 20);
                setDisplayKurtiData(filteredRows);
                setDisplayCategoryData([]);
            }
        }
        else if (searchId === "1") {
            if (newVal === "") {
                setTextFieldValue("");
                setSearching(false);
                // handleSearch(textFieldValue);
                setDisplayKurtiData([]);
                setDisplayCategoryData(category);
            }
            else {
                if (!isSearching) {
                    setSearching(true);
                }
                const filteredRows = category.filter((row) => {
                    return row.name.toUpperCase().includes(newVal.toUpperCase());
                });
                console.log(filteredRows);
                setDisplayKurtiData([]);
                setDisplayCategoryData(filteredRows);
            }
        }
        if (searchId === "2") {
            if (newVal === "") {
                setTextFieldValue("");
                setSearching(false);
                // handleSearch(textFieldValue);
                setDisplayKurtiData([]);
                setDisplayCategoryData(category);
            }
            else {
                if (!isSearching) {
                    setSearching(true);
                }
                const filteredRows = category.filter((row) => {
                    return row.sellingPrice === (parseInt(newVal) || 0);
                });
                console.log(filteredRows);
                setDisplayKurtiData([]);
                setDisplayCategoryData(filteredRows);
            }
        }
    }
    const cancelSearch = () => {
        setTextFieldValue("");
        handleSearch(textFieldValue);
        if (searchId === "0") {
            setDisplayKurtiData(kurtiData);
            setDisplayCategoryData([]);
        }
        else {
            setDisplayCategoryData(category);
            setDisplayKurtiData([]);
        }
        setSearching(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                console.log(result);
                const sortedCategory = (result.data || []).sort((a: category, b: category) => b.countOfPiece - a.countOfPiece);
                let sum1 = 0, sum2 = 0;
                let sum3 = 0;
                for (let i = 0; i < sortedCategory.length; i++) {
                    sum1 += sortedCategory[i].count;
                    sum2 += sortedCategory[i].countOfPiece;
                    sum3 += (sortedCategory[i].actualPrice);
                }
                setTotalItems(sum1);
                setTotalPiece(sum2);
                setTotalStockPrice(sum3)
                setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null


                let storedTime: any = localStorage.getItem('radhe-time');
                let storedData: any = localStorage.getItem('radhe-data');
                // console.log(storedTime, storedData);
                const currTime = await getCurrTime();
                if (storedTime !== null && storedData !== null) {
                    storedTime = JSON.parse(storedTime) || currTime.toISOString();
                    storedData = JSON.parse(storedData) || [];
                    const res = await axios.post(`/api/kurti/getall`, {
                        currentTime: storedTime,
                    })
                    let fetchedData = res.data.data || [];
                    console.log(fetchedData);
                    // Create a map from newArray for quick lookup by code
                    const newMap = new Map(fetchedData.map((obj: any) => [obj.code, obj]));

                    // Update oldArray objects or add new ones
                    const updatedArray = storedData.map((obj: any) => {
                        return newMap.has(obj.code) ? newMap.get(obj.code) : obj;
                    });

                    // Optionally, add new entries that are only in fetchedData
                    fetchedData.forEach((obj: any) => {
                        if (!storedData.some((oldObj: any) => oldObj.code === obj.code)) {
                            updatedArray.push(obj);
                        }
                    });
                    setKurtiData(updatedArray);
                    localStorage.setItem('radhe-time', JSON.stringify(currTime.toISOString()));
                    let store = await JSON.stringify(updatedArray);
                    localStorage.setItem('radhe-data', store);
                }
                else {
                    let res2 = await fetch(`/api/kurti/getall`);
                    const res = await res2.json();
                    console.log(res.data);
                    setKurtiData(res.data);
                    localStorage.setItem('radhe-time', JSON.stringify(currTime.toISOString()));
                    let store = await JSON.stringify(res.data);
                    localStorage.setItem('radhe-data', store);
                    console.log('fetched again');
                }


            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
                setCategoryLoader(false);
            }
        };
        // if (categoryLoader) {
        if (loading) {
            fetchData();

        }
        // }
    }, [loading]);

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
                            const sortedCategory = (result.data || []).sort((a: category, b: category) => b.countOfPiece - a.countOfPiece);
                            let sum1 = 0, sum2 = 0, sum3 = 0;
                            for (let i = 0; i < sortedCategory.length; i++) {
                                sum1 += sortedCategory[i].count;
                                sum2 += sortedCategory[i].countOfPiece;
                                sum3 += (sortedCategory[i].actualPrice);
                            }
                            setTotalItems(sum1);
                            setTotalPiece(sum2);
                            setTotalStockPrice(sum3)
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


    const handleKurtiDelete = async (data: kurti[]) => {
        console.log('data', [...data]);
        await setKurtiData([...data]);
        setLoading(true);
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
                        <div className="pb-2">
                            <div className="flex flex-row justify-center mb-2">
                                <div className="w-[30%] flex-col">
                                    <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                                        Select search type
                                    </h2>
                                    <Select
                                        onValueChange={(val) => setSearchId(val)}
                                        value={searchId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Search Field Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem key={'search-design-select'} value="0">
                                                {'Search Design'}
                                            </SelectItem>
                                            <SelectItem key={'search-category-select'} value="1">
                                                {'Search Category'}
                                            </SelectItem>
                                            <SelectItem key={'search-price-select'} value="2">
                                                {'Search Price'}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-[30%] ml-3">
                                    <h2 className="scroll-m-20 text-sm font-semibold tracking-tight first:mt-0">
                                        Select sort type
                                    </h2>
                                    <Select
                                        onValueChange={(val) => {
                                            setSortId(val);
                                            if (val === "0") {
                                                let data = category;
                                                data = (data || []).sort((a: category, b: category) => b.countOfPiece - a.countOfPiece);
                                                setCategory(data);
                                                data = displayCategoryData;
                                                data = (data || []).sort((a: category, b: category) => b.countOfPiece - a.countOfPiece);
                                                setDisplayCategoryData(data);
                                            }
                                            else {
                                                let data = category;
                                                data = (data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                                                setCategory(data);
                                                data = displayCategoryData;
                                                data = (data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                                                setDisplayCategoryData(data);
                                            }
                                        }}
                                        value={sortId}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Sort Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem key={'sort-count-select'} value="0">
                                                {'Sort By Piece Count'}
                                            </SelectItem>
                                            <SelectItem key={'search-category-select'} value="1">
                                                {'Sort By Name'}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>

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
                        {isSearching ? <>
                            {searchId === "0" ?
                                <CardContent className="w-full flex flex-row space-evenely justify-center flex-wrap gap-3">
                                    {displayKurtiData.map((data, i) => (
                                        <KurtiPicCard data={data} key={i} onKurtiDelete={handleKurtiDelete} />
                                    ))}
                                </CardContent>
                                : <div className="flex flex-col gap-2">
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
                                                <TableHead
                                                    className="text-center font-bold text-base"
                                                    key={'Price'}
                                                >
                                                    Price
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
                                            {displayCategoryData.map((cat, idx) => (
                                                <TableRow
                                                    key={`${idx}-1`}
                                                >
                                                    <TableCell
                                                        key={idx * idx}
                                                        className="text-center"
                                                    >
                                                        {idx + 1}
                                                    </TableCell>
                                                    <TableCell
                                                        key={cat.name}
                                                        className="text-center text-blue-800 font-bold cursor-pointer"
                                                        aria-label={`open categry ${cat.name} by clicking`}
                                                    >
                                                        <Link href={`/catalogue/${cat.name.toLowerCase()}`}>
                                                            {cat.name}
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-center"
                                                        key={`${cat.name}-${cat.count}-count`}
                                                    >
                                                        {cat.count}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-center"
                                                        key={`${cat.name}-${cat.countOfPiece}-total`}
                                                    >
                                                        {cat.countOfPiece}
                                                    </TableCell>
                                                    <TableCell
                                                        className="text-center"
                                                        key={`${cat.name}-${cat.countOfPiece}-price`}
                                                    >
                                                        {cat.sellingPrice}
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
                                        </TableBody>
                                    </Table>
                                </div>
                            } </> :

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
                                            <TableHead
                                                className="text-center font-bold text-base"
                                                key={'Price'}
                                            >
                                                Price
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
                                                    key={idx * idx}
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
                                                    key={`${cat.name}-${cat.count}-count`}
                                                >
                                                    {cat.count}
                                                </TableCell>
                                                <TableCell
                                                    className="text-center"
                                                    key={`${cat.name}-${cat.countOfPiece}-total`}
                                                >
                                                    {cat.countOfPiece}
                                                </TableCell>
                                                <TableCell
                                                    className="text-center"
                                                    key={`${cat.name}-${cat.countOfPiece}-price`}
                                                >
                                                    {cat.sellingPrice}
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
                                                {'-'}
                                            </TableCell>
                                            <TableCell>
                                                {'Total'}
                                            </TableCell>
                                            <TableCell>
                                                {totalItems.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                {totalPiece.toLocaleString('en-IN')}
                                            </TableCell>
                                            <TableCell>
                                                {`${totalStockPrice.toLocaleString('en-IN')}/-`}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                        }
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