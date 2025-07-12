// /api/find-kurti/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/src/lib/db";
import { findKurti } from '@/src/lib/findKurti';

const isSize = (str: string): boolean => {
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return selectSizes.includes(str.toUpperCase());
}


export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const result = await findKurti(data);
        return new NextResponse(JSON.stringify({ data: result }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}

// Updated /api/sell/route.ts