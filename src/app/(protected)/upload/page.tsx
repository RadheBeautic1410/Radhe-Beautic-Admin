"use client";
import * as z from "zod"
import axios, { AxiosProgressEvent, CancelTokenSource } from "axios";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import { useDropzone } from "react-dropzone";
import { Input } from "@/src/components/ui/input";
import {
    AudioWaveform,
    File,
    FileImage,
    FolderArchive,
    Loader2,
    UploadCloud,
    Video,
    X,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, useTransition } from "react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import ProgressBar from "@/src/components/ui/progress";
import { db } from "@/src/lib/db";
import ImageUpload, { ImageUploadRef } from "../_components/upload/imageUpload";
import { Button } from "@/src/components/ui/button";
import {
    Form, FormItem, FormLabel, FormControl, FormMessage, FormField,
    FormDescription
} from '@/src/components/ui/form'
import { KurtiSchema, categoryAddSchema, partyAddSchema } from "@/src/schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { DialogDemo } from "@/src/components/dialog-demo";
import { partyAddition } from "@/src/actions/party";
import { toast } from "sonner";
import { categoryAddition } from "@/src/actions/category";
import { kurtiAddition } from "@/src/actions/kurti";
import { useRouter } from "next/navigation";
import { currentRole } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";
import { RoleGateForComponent } from "@/src/components/auth/role-gate-component";
import NotAllowedPage from "../_components/errorPages/NotAllowedPage";
import PageLoader from "@/src/components/loader";
import { AddSizeForm } from "../_components/dynamicFields/sizes";
import { Sriracha } from "next/font/google";
import ImageUpload2 from "../_components/upload/imageUpload2";

interface party {
    id: string;
    name: string
    normalizedLowerCase: string;
}

interface category {
    id: string;
    name: string;
    type: string;
    normalizedLowerCase: string;
}

interface Size {
    size: string;
    quantity: number;
}


const UploadPage = () => {
    const [isPending, startTransition] = useTransition()

    const imageUploadRef = useRef<ImageUploadRef>(null);

    const [party, setParty] = useState<any[]>([]);
    const [partyLoader, setPartyLoader] = useState(true);
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [generatedCode, setGeneratedCode] = useState("");
    const [category, setCategory] = useState<category[]>([]);
    const [images, setImages] = useState<any[]>([]);
    const [generatorLoader, setGeneratorLoader] = useState(false);
    // const [components, setComponents] = useState<any[]>([]);
    const [sizes, setSizes] = useState<Size[]>([]);
    const router = useRouter();
    const [barcodeDownloading, setBarcodeDownloading] = useState(false);

    const onAddSize = (sizes: Size[]) => {
        setSizes(sizes);
    };

    const handleBarcodeDownload = async () => {
        if (sizes.length === 0 || generatedCode.length === 0 || images.length === 0) {
            toast.error('Fill out the form first!!!');
        }
        else {
            try {
                setBarcodeDownloading(true);
                let obj = JSON.stringify(sizes);
                const res = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${obj}&id=${generatedCode}`, {
                    responseType: 'blob'
                });
                console.log(res);
                let blob = res.data;
                console.log(blob);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document.pdf';
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } catch (e: any) {
                console.log(e.message);
            }
            finally {
                setBarcodeDownloading(false);
            }
        }
    }

    const handleImageChange = (data: any) => {
        setImages(data)
        console.log(data);
    }

    const handleSubmitParty = (values: z.infer<typeof partyAddSchema>) => {
        startTransition(() => {
            partyAddition(values)
                .then((data) => {
                    if (data.error) {
                        formParty.reset();
                        toast.error(data.error);
                    }

                    if (data.success) {
                        formParty.reset();
                        toast.success(data.success);
                        let result = party;
                        result.push(data.data);
                        const sortedParty = (result || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                        setParty(sortedParty);
                    }
                })
                .catch(() => toast.error("Something went wrong!"));
        });
    }

    const handleSubmitCategory = (values: z.infer<typeof categoryAddSchema>) => {
        startTransition(() => {
            categoryAddition(values)
                .then((data) => {
                    if (data.error) {
                        formCategory.reset();
                        toast.error(data.error);
                    }
                    if (data.success) {
                        formCategory.reset();
                        toast.success(data.success);
                        let result: any = category;
                        result.push(data.data);
                        const sortedCategory = (result || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                        setCategory(sortedCategory);
                    }
                })
                .catch(() => toast.error("Something went wrong!"));
        });
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/party'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                const sortedParties = (result.data || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                setParty(sortedParties); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setPartyLoader(false);
            }
            try {
                const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                const sortedCategory = (result.data || []).sort((a: party, b: party) => a.name.localeCompare(b.name));
                setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setCategoryLoader(false);
            }
        };
        fetchData();
    }, []);
    const defaultValues = {
        images: images,
        sizes: [],
        party: "",
        sellingPrice: "0",
        actualPrice: "0",
        category: "",
        code: "",
        countOfPiece: 0,
    };

    const form = useForm<z.infer<typeof KurtiSchema>>({
        resolver: zodResolver(KurtiSchema),
        defaultValues: {
            images: images,
            sizes: [],
            party: "",
            sellingPrice: "0",
            actualPrice: "0",
            category: "",
            code: "",
            countOfPiece: 0,
        }
    });

    const handleFormSubmit = async () => {
        await CodeGenerator();
        form.setValue('images', images);
        form.setValue('code', generatedCode);
        form.setValue('sizes', sizes);
        if (images.length === 0) {
            toast.error("Upload Images");
        }
        else if (sizes.length === 0) {
            toast.error("Add Stock");
        }
        else {
            // console.log(sizes);
            let cnt = 0;
            for (let i = 0; i < sizes.length; i++) {
                cnt += sizes[i].quantity;
            }
            form.setValue('countOfPiece', cnt);
            const values = form.getValues();
            startTransition(() => {
                kurtiAddition(values)
                    .then(async (data) => {
                        if (data.success) {
                            await handleBarcodeDownload();
                            form.reset(defaultValues);
                            // form.setValue('category', 'Set Category');
                            setSizes([]);
                            setGeneratedCode("");
                            // setComponents([]);
                            setImages([]);
                            if (imageUploadRef.current) {
                                imageUploadRef.current.reset();
                            }
                            toast.success(data.success);
                            router.refresh();
                        }
                    })
                    .catch((e) => { console.log(e); toast.error("Something went wrong!") });
            });
        }
    }

    const CodeGenerator = async () => {
        try {
            setGeneratorLoader(true);
            const categorySelected = form.getValues().category;
            if (categorySelected === "") {
                toast.error('Please select the cateory first');
            }
            const response = await fetch(`/api/kurti/generateCode?cat=${categorySelected}`); // Adjust the API endpoint based on your actual setup
            const result = await response.json();
            setGeneratedCode(result.code);

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setGeneratorLoader(false);
        }
    }

    const formParty = useForm({
        defaultValues: {
            name: "",
        }
    });

    const formCategory = useForm({
        defaultValues: {
            name: "",
            type: "",
        }
    });

    return (
        <>
            <PageLoader loading={partyLoader || categoryLoader} />
            {(partyLoader || categoryLoader) ? "" :
                <Card className="w-[90%]">

                    <CardHeader>
                        <p className="text-2xl font-semibold text-center">
                            ⬆️ UPLOAD
                        </p>
                    </CardHeader>
                    <CardContent className="text-center">
                        <ImageUpload2 onImageChange={handleImageChange} images={images} ref={imageUploadRef} />
                        <div className="text-left w-[100%]">
                            <Form {...form}>
                                {/* Add Category Component */}
                                <form className="space-y-6 w-auto" onSubmit={handleFormSubmit}>
                                    <div className="flex flex-row justify-normal">
                                        <FormField
                                            control={form.control}
                                            name="category"
                                            render={({ field }) => (
                                                <FormItem className="w-[30%]">
                                                    <FormLabel>Category</FormLabel>
                                                    <Select
                                                        disabled={isPending}
                                                        onValueChange={field.onChange}
                                                        value={field.value}
                                                    >

                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Category" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {category.map((org) => (
                                                                <SelectItem key={org.id} value={org.name}>
                                                                    {org.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="ml-3 mt-7">
                                            <Button
                                                asChild
                                            >
                                                <DialogDemo
                                                    dialogTrigger="Add Category"
                                                    dialogTitle="New Category Addition"
                                                    dialogDescription="give Category name and click add Category"
                                                    bgColor="destructive"
                                                >

                                                    <Form {...formCategory}>
                                                        <form
                                                            className="space-y-6"
                                                        >

                                                            <FormField
                                                                control={formCategory.control}
                                                                name="name"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Category</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                disabled={isPending}
                                                                                placeholder="enter category name"

                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={formCategory.control}
                                                                name="type"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                disabled={isPending}
                                                                                placeholder="enter category type"

                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <Button
                                                                type="button"
                                                                disabled={isPending}
                                                                onClick={formCategory.handleSubmit(handleSubmitCategory)}
                                                            >
                                                                Add Category
                                                            </Button>
                                                        </form>
                                                    </Form>

                                                </DialogDemo>

                                            </Button>
                                        </div>
                                    </div>
                                    {/* Add Party Component */}
                                    <div className="flex flex-row justify-normal">
                                        <FormField
                                            control={form.control}
                                            name="party"
                                            render={({ field }) => (
                                                <FormItem className="w-[30%]">
                                                    <FormLabel>Party</FormLabel>
                                                    <Select
                                                        disabled={isPending}
                                                        onValueChange={field.onChange}
                                                        value={field.value === "" ? "" : field.value}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select Party" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {party.map((org) => (
                                                                <SelectItem key={org.id} value={org.name}>
                                                                    {org.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="ml-3 mt-7">
                                            <Button
                                                asChild
                                            >
                                                <DialogDemo
                                                    dialogTrigger="Add Party"
                                                    dialogTitle="New Party Addition"
                                                    dialogDescription="give party name and click add party"
                                                    bgColor="destructive"
                                                >

                                                    <Form {...formParty}>
                                                        <form
                                                            className="space-y-6"
                                                        >

                                                            <FormField
                                                                control={formParty.control}
                                                                name="name"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Party</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                {...field}
                                                                                disabled={isPending}
                                                                                placeholder="enter party name"

                                                                            />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />


                                                            <Button
                                                                type="button"
                                                                disabled={isPending}
                                                                onClick={formParty.handleSubmit(handleSubmitParty)}
                                                            >
                                                                Add Party
                                                            </Button>
                                                        </form>
                                                    </Form>

                                                </DialogDemo>

                                            </Button>
                                        </div>
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="actualPrice"
                                        render={({ field }) => (
                                            <FormItem className="w-[30%]">
                                                <FormLabel>Actual Price</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled={isPending}
                                                        type="number"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter Actual Price of the Piece.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sellingPrice"
                                        render={({ field }) => (
                                            <FormItem className="w-[30%]">
                                                <FormLabel>Sell Price</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        disabled={isPending}
                                                        type="number"
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter Selling Price of the Piece.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="w-[40%]">
                                        <h2>Sizes</h2>
                                        <AddSizeForm
                                            preSizes={[]}
                                            onAddSize={onAddSize}
                                            sizes={sizes}
                                        />
                                    </div>

                                    <div className="flex flex-row justify-normal">

                                        <div>
                                            <FormField
                                                control={form.control}
                                                name="code"
                                                render={({ field }) => (
                                                    <FormItem className="w-[90%]">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                disabled
                                                                placeholder={generatedCode}
                                                                value={generatedCode.toUpperCase()}
                                                            />
                                                        </FormControl>
                                                        <FormDescription>
                                                            Generate the code.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button onClick={CodeGenerator} disabled={generatorLoader} type="button">
                                            {generatorLoader ?
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                :
                                                ""
                                            }
                                            Generate Code
                                        </Button>
                                    </div>


                                    <Button
                                        type="button"
                                        disabled={isPending || barcodeDownloading}
                                        onClick={form.handleSubmit(handleFormSubmit)}
                                    >
                                        {(isPending || barcodeDownloading) ?
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            : ""}
                                        Submit
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </CardContent>
                </Card >
            }
        </>
    );
}

const UploadHelper = () => {
    return (
        <>
            <RoleGateForComponent allowedRole={[UserRole.ADMIN, UserRole.UPLOADER]}>
                <UploadPage />
            </RoleGateForComponent>
            <RoleGateForComponent allowedRole={[UserRole.SELLER, UserRole.RESELLER]}>
                <NotAllowedPage />
            </RoleGateForComponent>
        </>
    )
}

export default UploadHelper;