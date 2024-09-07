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

import DayAnalytics from "../_components/analytics/dayAnalytics";
import MonthAnalytics from "../_components/analytics/monthAnalytics";
import YearAnalytics from "../_components/analytics/yearAnalytics";

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
        <Card className="w-[90%] flex p-3 gap-2 justify-evenly">
            <DayAnalytics />
            <MonthAnalytics />
            <YearAnalytics />
        </Card>
    );
}

export default AnalyticsPage;