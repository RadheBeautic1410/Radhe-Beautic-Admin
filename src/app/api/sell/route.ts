export const dynamic = 'force-dynamic'

import { sellKurti2 } from "@/src/data/kurti";
import { NextRequest, NextResponse } from "next/server";


// export async function GET(request: NextRequest) {
//     try {
//         const code = request.nextUrl.searchParams.get("code") || "";
//         // console.log(code, code.substring(0, 7), code.substring(7));
//         const data = await sellKurti(code.toUpperCase());
//         return new NextResponse(JSON.stringify({ data }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }

// export async function POST(request: NextRequest) {
//     try {
//         // const code = request.nextUrl.searchParams.get("code") || "";
//         let data = await request.json();
//         console.log(data);
//         // console.log(code, code.substring(0, 7), code.substring(7));
//         data = await sellKurti2(data);
//         return new NextResponse(JSON.stringify({ data }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 404
//         });
//     }
// }



const getCurrTime = () => {
    const currentTime = new Date();
    const ISTOffset = 5.5 * 60 * 60 * 1000;
    const ISTTime = new Date(currentTime.getTime() + ISTOffset);
    return ISTTime;
}

const isSize = (str: string): boolean => {
    const selectSizes: string[] = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "10XL"];
    return selectSizes.includes(str.toUpperCase());
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        console.log('Sell request data:', data);
        const result = await sellKurti2(data);
        return new NextResponse(JSON.stringify({ data: result }), { status: 200 });
    } catch (error: any) {
        return new NextResponse(JSON.stringify({ error: error.message }), {
            status: 500
        });
    }
}