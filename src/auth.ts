import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/src/auth.config";
import { db } from "./lib/db";
import { getUserById } from "./data/user";
import { UserRole } from "@prisma/client";
import { ALL_MENU_ITEMS } from "@/src/lib/menus";
import { getTwoFactorConfirmationByUserId } from "./data/two-factor-confirmation";

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      // Allow OAuth without email verification
      console.log(user, account);
      if (account?.provider !== "credentials") return true;
      if (user?.id) {
        const existingUser = await getUserById(user.id);
        console.log(existingUser?.isVerified);
        // prevent signin without email verification
        // if (!existingUser?.emailVerified) return false;

        if (!existingUser?.isVerified) return false; // for verification

        // TODO: Add 2FA Check
        if (existingUser.isTwoFactorEnabled) {
          const twoFactorConfirmation = await getTwoFactorConfirmationByUserId(
            existingUser.id
          );

          if (!twoFactorConfirmation) return false;

          // delete two factor confirmation for next sign in
          await db.twoFactorConfirmation.delete({
            where: { id: twoFactorConfirmation.id },
          });
        }
      }
      return true;
    },

    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }

      if (session.user) {
        // Sidebar hrefs this user may open; null = built-in defaults for their role.
        session.user.menus = (token.menus as string[] | null | undefined) ?? null;
      }

      if (session.user) {
        session.user.isTwoFactorEnabled = token.isTwoFactorEnabled as boolean;
      }

      if (session.user) {
        session.user.name = token.name;
        session.user.phoneNumber = (token.phoneNumber as string | null | undefined) ?? null;
        session.user.roleName = (token.roleName as string | undefined) ?? session.user.role;
        session.user.organization = token.organization as string;

        session.user.isOAuth = token.isOAuth as boolean;
      }

      return session;
    },

    async jwt({ token }) {
      if (!token.sub) return token;
      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      // const existingAccount = await getAccountByUserId(
      //     existingUser.id
      // );

      // token.isOAuth = !!existingAccount;
      token.name = existingUser.name;
      token.phoneNumber = existingUser.phoneNumber;
      // A custom role (or the system Role row for the fixed role) decides the
      // menus. The session role is the fixed role the custom role acts as, so
      // every existing in-page role check keeps working.
      // A failed lookup (e.g. before the Role collection exists) falls back to
      // the built-in defaults for the fixed role instead of blocking sign-in.
      const roleRow = await (existingUser.roleId
        ? db.role.findUnique({ where: { id: existingUser.roleId } })
        : db.role.findUnique({ where: { name: existingUser.role } })
      ).catch(() => null);
      token.role = roleRow?.baseRole ?? existingUser.role;
      // Display name of the role, for the profile page.
      token.roleName = roleRow?.name ?? existingUser.role;
      // A plain ADMIN gets every menu (null) unless its Role row was trimmed on
      // /roles; a row that still ticks every menu stays null, so menus added later
      // reach admins automatically.
      const rowHasEverything = (roleRow?.menus ?? []).length
        ? ALL_MENU_ITEMS.every((m) => roleRow!.menus.includes(m.href))
        : false;
      token.menus =
        existingUser.role === UserRole.ADMIN && !existingUser.roleId
          ? roleRow && !rowHasEverything
            ? roleRow.menus
            : null
          : roleRow?.menus ?? null;
      token.organization = existingUser.organization;
      token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;

      return token;
    },
  },
  adapter: PrismaAdapter(db),
  // Signed in for 3 days; the expiry is pushed forward at most once a day while
  // the user keeps using the app, so an active user is not logged out mid-shift.
  session: { strategy: "jwt", maxAge: 3 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  ...authConfig,
});
