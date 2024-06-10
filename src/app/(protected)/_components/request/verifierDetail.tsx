"use client"

import { Button } from "@/src/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/src/components/ui/dialog"


import * as React from "react"
import { useEffect, useState } from "react";

import {
    Card,
    CardContent,
} from "@/src/components/ui/card"

interface referrerProps {
    id: string;
    name: string
    phoneNumber: string;
    organization: string;
    isVerified: boolean;
}

interface referrerDataProps {
    id: string;
}

export const VerifierDetail = ({ id }: referrerDataProps) => {


    const [details, setDetails] = useState<referrerProps>();

    const fetchMemberForms = async (id: string | null) => {
        try {
            const response = await fetch(`/api/referrers/${id}`);
            const result = await response.json();
            console.log(result);
            if (result.referrerDetail !== undefined) {
                setDetails(result.referrerDetail);
            } else {
                console.error('No data received from the API');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };




    return (

        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" onClick={() => { fetchMemberForms(id); }}>
                    Show Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Verifier Details</DialogTitle>
                    <DialogDescription>
                        View detailed information about this verifier
                    </DialogDescription>
                </DialogHeader>
                <CardContent className="grid gap-4">
                    <div className=" flex items-center space-x-4 rounded-md border p-4">
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                                Name
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {details?.name}
                            </p>
                            <p className="text-sm font-medium leading-none">
                                Phone Number
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {details?.phoneNumber}
                            </p>
                        </div>
                    </div>

                </CardContent>
            </DialogContent>
        </Dialog >


    )
}

