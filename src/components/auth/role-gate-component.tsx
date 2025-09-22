"use client";

import { UserRole } from "@prisma/client";
import { FormError } from "@/src/components/form-error";
import { useSession } from "next-auth/react";

interface RoleGateProps {
    children: React.ReactNode;
    allowedRole: UserRole[];
};

export const RoleGateForComponent = ({
    children,
    allowedRole,
}: RoleGateProps) => {
    const { status, data } = useSession();
    const role = data?.user?.role;
    // While session is loading on client nav, render nothing to avoid flicker
    if (status === "loading") return <></>;
    if (!role) return <></>;
    
    if (!allowedRole.includes(role)) {
        // console.log(role, allowedRole);
        return (
            <></>
        )
    }

    return (
        <>
            {children}
        </>
    );
};