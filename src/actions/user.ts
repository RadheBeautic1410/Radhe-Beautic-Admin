"use server";

import { db } from "@/src/lib/db";
import { permissionError } from "@/src/lib/permissions/server";
import { getUserById } from "@/src/data/user";



export const userDelete = async (
    id: string
) => {
    const denied = await permissionError("staff.delete");
    if (denied) return denied;

    const dbForm = await getUserById(id);

    if (!dbForm) {
        return { error: "User does not exist" }
    }

    const deletedUser = await db.user.delete({
        where: { id: id },
    });

    return { success: "Deletion Success!", deletedUser }
}