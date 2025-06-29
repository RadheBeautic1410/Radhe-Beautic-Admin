// /api/find-kurti/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from "@/src/lib/db";

const isSize = (str: string): boolean => {
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return selectSizes.includes(str.toUpperCase());
}

export const findKurti = async (data: any) => {
    try {
        let { code } = data;
        code = code.toUpperCase();
        
        let search = code.substring(0, 7).toUpperCase();
        
        // Handle special case for CK codes
        if (code.toUpperCase().substring(0, 2) === 'CK' && code[2] === "0") {
            search = code.substring(0, 6).toUpperCase();
        }
        
        console.log('Searching for code:', search);
        
        const kurti = await db.kurti.findUnique({
            where: { 
                code: search.toUpperCase(), 
                isDeleted: false 
            },
            include: {
                prices: true
            }
        });
        
        if (!kurti) {
            return { error: 'No Kurti found with this code!' };
        }
        
        return { success: 'Product found', kurti };
    } catch (error) {
        console.error('Error finding kurti:', error);
        return { error: 'Something went wrong!' };
    }
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