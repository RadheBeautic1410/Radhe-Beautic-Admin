import { db } from "@/src/lib/db";

export const getVerificationTOkenBYPhoneNumber = async (phoneNumber: string) => {
    try {
        const verificationToken = await db.verificationToken.findFirst({
            where: { phoneNumber }
        })

        return verificationToken;
    } catch {
        return null;
    }
}

export const getVerificationTOkenBYToken = async (token: string) => {
    try {
        const verificationToken = await db.verificationToken.findUnique({
            where: { token }
        })

        return verificationToken;
    } catch {
        return null;
    }
}