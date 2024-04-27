"use server";

import * as z from "zod"
import { RegisterSchema } from "@/src/schemas"
import bcrypt from "bcryptjs"
import { db } from "@/src/lib/db";
import { getUserByPhoneNumber } from "@/src/data/user";
// import { generateVerificationTOken } from "@/src/lib/token";
import { sendVerificationEmail } from "@/src/lib/mail";


export const register = async (values: z.infer<typeof RegisterSchema>) => {
    const validatedFields = RegisterSchema.safeParse(values)

    if (!validatedFields.success) {
        return {
            error: "Invalid Fields"
        }
    }

    const { phoneNumber, password, name, role } = validatedFields.data;
    const existingUser = await getUserByPhoneNumber(phoneNumber);
    if (existingUser) {
        return { error: "Phone Number already exist!" }
    }
    const hashedPassword = password;

    await db.user.create({
        data: {
            name,
            phoneNumber: phoneNumber,
            role,
            password: hashedPassword,
        },
    });

    // TODO: Send Verification token email
    // const verificationToken = await generateVerificationTOken(email);
    // await sendVerificationEmail(verificationToken.email, verificationToken.token)

    return { success: "Registration Success wait for Admin verification" }
}
