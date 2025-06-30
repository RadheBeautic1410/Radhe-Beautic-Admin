// src/lib/findKurti.ts
import { db } from "@/src/lib/db";

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
