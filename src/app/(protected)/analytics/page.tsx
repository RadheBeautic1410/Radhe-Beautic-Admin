"use client";

import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState, use } from "react";
import { useSession } from "next-auth/react";
import { SettingSchema } from "@/src/schemas";

import { Card, CardHeader, CardContent, } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { settings } from "@/src/actions/settings";
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage, } from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { useCurrentUser } from "@/src/hooks/use-current-user";
import { FormError } from "@/src/components/form-error";
import { FormSuccess } from "@/src/components/form-success";
import { Label } from "@/src/components/ui/label";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

import DayAnalytics from "@/src/app/(protected)/_components/analytics/dayAnalytics";
import MonthAnalytics from "@/src/app/(protected)/_components/analytics/monthAnalytics";
import YearAnalytics from "@/src/app/(protected)/_components/analytics/yearAnalytics";
import TopMonthlySellingKurti from "@/src/app/(protected)/_components/analytics/topMonthlySellingKurti";
import AvailableKurtiSizes from "@/src/app/(protected)/_components/analytics/awailableKurtiSizes";
import PartyWiseSales from "../_components/analytics/partyWiseCount";
import TopSoldKurti from "../_components/analytics/topSoldKurti";
import KurtiReports from "../_components/analytics/kurtiReports";
import KurtiOnlineReports from "../_components/analytics/kurtiOnlineReports";

const AnalyticsPage = () => {

    // const user = useCurrentUser();

    // const [error, setError] = useState<string | undefined>();
    // const [success, setSuccess] = useState<string | undefined>();
    // const { update } = useSession();
    // const [isPending, startTransition] = useTransition();

    // const onSubmit = (values: z.infer<typeof SettingSchema>) => {
    //     startTransition(() => {
    //         settings(values)
    //             .then((data) => {
    //                 if (data.error) {
    //                     setError(data.error);
    //                 }

    //                 if (data.success) {
    //                     update();
    //                     setSuccess(data.success);
    //                 }
    //             })
    //             .catch(() => setError("Something went wrong!"));
    //     });
    // }
    // const [passwordType, setPasswordType] = useState('password');

    return (
        <>
            <Card className="w-[100%] rounded-none">
                <DayAnalytics />
                <MonthAnalytics />
                {/* <YearAnalytics /> */}
                <TopSoldKurti />
                <PartyWiseSales />
                <TopMonthlySellingKurti />
                <AvailableKurtiSizes />
                <KurtiReports />
                <KurtiOnlineReports/>
            </Card>
        </>
    );
}

export default AnalyticsPage;