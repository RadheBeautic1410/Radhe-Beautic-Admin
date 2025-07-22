export const dynamic = 'force-dynamic'

import {  sellMultipleKurtis } from "@/src/data/kurti";
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

// export async function POST(request: NextRequest) {
//     try {
//         const data = await request.json();
//         console.log('Sell request data:', data);
//         const result = await sellKurti2(data);
//         return new NextResponse(JSON.stringify({ data: result }), { status: 200 });
//     } catch (error: any) {
//         return new NextResponse(JSON.stringify({ error: error.message }), {
//             status: 500
//         });
//     }
// }
// API Route Handler
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Multiple sell request data:', data);

    // Validate required fields
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: "Products array is required and cannot be empty" }),
        { status: 400 }
      );
    }

    if (!data.customerName?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Customer name is required" }), { status: 400 });
    }

    if (!data.selectedLocation?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Shop location is required" }), { status: 400 });
    }

    if (!data.billCreatedBy?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Bill created by is required" }), { status: 400 });
    }

    if (!data.paymentType?.trim()) {
      return new NextResponse(JSON.stringify({ error: "Payment type is required" }), { status: 400 });
    }

    // ✅ Forward all required data to sellMultipleKurtis
    const result = await sellMultipleKurtis(data);

    if (result.error) {
      return new NextResponse(JSON.stringify({ data: result }), { status: 400 });
    }

    return new NextResponse(JSON.stringify({ data: result }), { status: 200 });
  } catch (error: any) {
    console.error('API Error:', error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
