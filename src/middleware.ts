import authConfig from "@/src/auth.config"
import NextAuth from "next-auth"

export const { auth } = NextAuth(authConfig)

import { DEFAULT_LOGIN_REDIRECT, apiAuthPrefix, authRoutes, publicRoutes } from '@/routes'
import { currentRole } from "./lib/auth"
import { UserRole } from "@prisma/client"



export default auth(async (req) => {
    const { nextUrl } = req;
    // console.log(req.auth);
    const role = await currentRole();
    // console.log(role);
    const isLoggedIn = !!req.auth;

    const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix)
    const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
    const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return null;
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            let url = DEFAULT_LOGIN_REDIRECT;
            if (role === UserRole.SELLER) {
                url = '/sell';
            }
            return Response.redirect(new URL(url, nextUrl))
        }
        return null
    }

    if (!isLoggedIn && !isPublicRoute) {
        return Response.redirect(new URL("/auth/login", nextUrl));
    }

    return null;

})

// Optionally, don't invoke Middleware on some paths
export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
} 