"use server"

import { getUserByPhoneNumber } from "@/src/data/user"
import { getVerificationTOkenBYToken } from "@/src/data/verifiction-token"
import { db } from "@/src/lib/db"

export const newVerification = async (token: string) => {
    
    const existingToken = await getVerificationTOkenBYToken(token);

    if (!existingToken) {
        return { error: "Token doest not exist" }
    }

    const hasExpired = new Date(existingToken.expires) < new Date()

    if (hasExpired) {
        return { error: "Token has expired" }
    }

    const existingUser = await getUserByPhoneNumber(existingToken.phoneNumber);

    if (!existingUser) {
        return { error: "Phone Number does not exist" };
    }

    await db.user.update({
        where: {
            id: existingUser.id
        },
        data: {
            emailVerified: new Date(),
            phoneNumber: existingToken.phoneNumber
        }
    })

    await db.verificationToken.delete({
        where: { id: existingToken.id }
    })

    return { success: "Phone number Verified" }
}