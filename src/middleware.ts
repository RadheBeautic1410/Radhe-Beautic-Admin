import authConfig from "@/src/auth.config";
import NextAuth from "next-auth";

export const { auth } = NextAuth(authConfig);

import { DEFAULT_LOGIN_REDIRECT, apiAuthPrefix, authRoutes, publicRoutes } from "@/routes";
import { UserRole } from "@prisma/client";

export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth; // ✅ Already available from auth()

  const role = session?.user?.role; // ✅ Avoid using currentRole()
  const isLoggedIn = !!session;

  const isApiAuthRoute = nextUrl.pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(nextUrl.pathname);
  const isAuthRoute = authRoutes.includes(nextUrl.pathname);

    if (isApiAuthRoute) {
        return;
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            let url = DEFAULT_LOGIN_REDIRECT;
            if (role === UserRole.SELLER) {
                url = '/sell';
            }
            if(role === UserRole.RESELLER) {
                url = '/catalogue'
            }
            console.log("url:", url);
            return Response.redirect(new URL(url, nextUrl))
        }
        return;
    }

  if (!isLoggedIn && !isPublicRoute) {
    return Response.redirect(new URL("/auth/login", nextUrl));
  }

    return;

})

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
