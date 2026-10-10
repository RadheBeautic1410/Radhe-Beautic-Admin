
// used to extend user type with some optional fields

import { UserRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
    role: UserRole
    /** Sidebar hrefs the user's role grants; null = defaults for their fixed role. */
    menus: string[] | null
    isTwoFactorEnabled: boolean
    isOAuth: boolean
    organization: string
}



declare module "next-auth" {
    interface Session {
        user: ExtendedUser;
    }
}