export const dynamic = 'force-dynamic'

import { db } from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        let data = await db.color.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        // Lazy seed default basic colors if empty
        if (data.length === 0) {
            const basicColors = [
                "Black", "White", "Red", "Blue", "Green", "Yellow", "Pink", "Orange", 
                "Purple", "Brown", "Grey", "Navy Blue", "Maroon", "Beige", "Mustard", 
                "Peach", "Olive Green", "Indigo", "Turquoise"
            ];
            
            const createPromises = basicColors.map(colorName => {
                const normalized = colorName.trim().toLowerCase().replace(/\s+/g, "");
                return db.color.upsert({
                    where: { normalizedLowerCase: normalized },
                    update: {},
                    create: { name: colorName, normalizedLowerCase: normalized }
                });
            });
            
            await Promise.all(createPromises);

            data = await db.color.findMany({
                orderBy: {
                    name: 'asc'
                }
            });
        }

        return new NextResponse(JSON.stringify({ data }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}
