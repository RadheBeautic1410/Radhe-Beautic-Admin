"use client"

import PageLoader from "@/src/components/loader";
import { Card, CardContent, CardHeader } from "@/src/components/ui/card";
import Link from "next/link";
import { useEffect, useState } from "react";

interface category {
    name: string
    count: any;
}

const ListPage = () => {
    const [categoryLoader, setCategoryLoader] = useState(true);
    const [category, setCategory] = useState<category[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/category'); // Adjust the API endpoint based on your actual setup
                const result = await response.json();
                console.log(result);
                const sortedCategory = (result.data || []).sort((a: category, b: category) => a.name.localeCompare(b.name));
                setCategory(sortedCategory); // Use an empty array as a default value if result.data is undefined or null
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setCategoryLoader(false);
            }
        };
        fetchData();
    }, []);

    return (
        <>
            <PageLoader loading={categoryLoader}/>

            <Card className="w-[90%]">
                <CardHeader>
                    <p className="text-2xl font-semibold text-center">
                        👜 Catalogue
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-2">
                        {category.map((org) => (
                            <div>
                                {"✦ "}
                                <Link key={org.name} href={`/catalogue/${org.name.toLowerCase()}`}>
                                    {`${org.name} (${org.count})`}
                                </Link>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </>
    )
}

export default ListPage;