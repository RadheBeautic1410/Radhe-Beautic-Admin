import { db } from "@/src/lib/db";
import { UserRole } from "@prisma/client";

export const getUserByPhoneNumber = async (phoneNumber: string) => {
    try {
        await db.$connect();
        console.log(" Database connection successful");
        console.log("Login Mobile No",phoneNumber)
        const user = await db.user.findUnique({
            where: { phoneNumber }
        })
        console.log("DB User",user);
        return user;
    } catch (error){
        console.error("DB Error:", error);
        return null;
    }
    finally {
        await db.$disconnect(); // Avoid memory leaks
    }
}



export const getUserById = async (id: string) => {
    try {
        const user = await db.user.findUnique({
            where: { id }
        })

        return user;
    } catch {
        return null;
    }
}
export const getUserByIdReqInfo = async (id: string) => {
    try {
        const user = await db.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                organization: true,
                isVerified: true,
            },
        })

        return user;
    } catch {
        return null;
    }
}


export interface UserQuery {
    role?: UserRole[];
    organization?: string | { not: string };
}

/**
 * User lists for the admin tables. The stored password is left out unless the
 * caller explicitly asks for it (the staff table shows it to holders of
 * staff.resetPassword); every other scalar is returned as before.
 */
export const getAllUsersWithRole = async (
    query?: UserQuery,
    { includePassword = false }: { includePassword?: boolean } = {}
) => {
    try {
        const whereClause: any = {
            role: query?.role ? { in: query.role } : undefined,
            organization: query?.organization || undefined,
        };

        const users = await db.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
                emailVerified: true,
                image: true,
                password: includePassword,
                organization: true,
                isVerified: true,
                verifiedBy: true,
                verifiedAt: true,
                groupName: true,
                role: true,
                roleId: true,
                isTwoFactorEnabled: true,
                balance: true,
                creditLimit: true,
                salary: true,
            },
        });
        
        return users;
    } catch (error) {
        console.error('Error fetching users with role:', error);
        return null;
    }
};