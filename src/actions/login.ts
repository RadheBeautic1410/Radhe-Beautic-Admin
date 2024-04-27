"use server";

import * as z from "zod"
import { LoginSchema } from "@/src/schemas"
import { signIn } from '@/src/auth'
import { DEFAULT_LOGIN_REDIRECT } from "@/routes";
import { AuthError } from "next-auth";
// import { generateTwoFactorToken, generateVerificationTOken } from "@/src/lib/token";
import { getUserByPhoneNumber } from "@/src/data/user";
import { sendVerificationEmail, sendTwoFactorTokenEmail } from "@/src/lib/mail";
import { getTwoFactorTokenByPhoneNumber } from "@/src/data/two-factor-token";
import { db } from "@/src/lib/db";
import { getTwoFactorConfirmationByUserId } from "@/src/data/two-factor-confirmation";



export const login = async (values: z.infer<typeof LoginSchema>) => {
    const validatedFields = LoginSchema.safeParse(values)

    if (!validatedFields.success) {
        return {
            error: "Invalid Fields"
        }
    }

    const { phoneNumber, password, code } = validatedFields.data;

    const existingUser = await getUserByPhoneNumber(phoneNumber);
    console.log(existingUser);
    if (!existingUser || !existingUser.phoneNumber || !existingUser.password) {
        return { error: "Phone Number does not exist!" }
    }

    // if (!existingUser.emailVerified) {
    //     const verifictionToken = await generateVerificationTOken(
    //         existingUser.phoneNumber,
    //     )

    //     // TODO: get email Service
    //     // await sendVerificationEmail(verifictionToken.email, verifictionToken.token)
    //     // return { success: "Confirmation email sent!" }

    //     return { error: "Account is being verified by Admin" }
    // }

    // for verification using admin or mod
    if (!existingUser.isVerified) {
        return { error: "Account is being verified by Admin" }
    }

    if (existingUser.isTwoFactorEnabled && existingUser.phoneNumber) {

        if (code) {
            const twoFactorToken = await getTwoFactorTokenByPhoneNumber(existingUser.phoneNumber)

            if (!twoFactorToken) {
                return { error: "Invalid code!" }
            }

            if (twoFactorToken.token !== code) {
                return { error: "Invalid code!" }
            }

            const hasExpired = new Date(twoFactorToken.expires) < new Date()

            if (hasExpired) {
                return { error: "Code expired!" }
            }

            await db.twoFactorToken.delete({
                where: { id: twoFactorToken.id }
            })

            const existingConfirmation = await getTwoFactorConfirmationByUserId(existingUser.id)

            if (existingConfirmation) {
                await db.twoFactorConfirmation.delete({
                    where: { id: existingConfirmation.id }
                })
            }

            await db.twoFactorConfirmation.create({
                data: {
                    userId: existingUser.id
                }
            })

        } else {

            // const twoFactorToken = await generateTwoFactorToken(existingUser.phoneNumber);
            // await sendTwoFactorTokenEmail(
            //     twoFactorToken.phoneNumber,
            //     twoFactorToken.token
            // )

            return { twoFactor: true }
        }
    }

    try {
        await signIn("credentials", {
            phoneNumber,
            password,
            redirectTo: DEFAULT_LOGIN_REDIRECT
        })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials!" }

                default:
                    return { error: "Something went wrong!" }
            }
        }
        throw error;
    }
}

