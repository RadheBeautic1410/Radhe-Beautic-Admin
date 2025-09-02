 export const dynamic = 'force-dynamic'

 import { NextRequest, NextResponse } from "next/server";
 import { auth } from "@/src/auth";
 import { db } from "@/src/lib/db";
import { PaymentStatus } from "@prisma/client";

 export async function GET(
   request: NextRequest,
   { params }: { params: Promise<{ id: string }> }
 ) {
   try {
     const session = await auth();
     if (!session?.user) {
       return new NextResponse(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
     }

     const { id } = await params;

     const user = await db.user.findUnique({
       where: { id },
       select: {
         id: true,
         name: true,
         email: true,
         phoneNumber: true,
         role: true,
         balance: true,
       },
     });

     if (!user) {
       return new NextResponse(JSON.stringify({ error: "User not found" }), { status: 404 });
     }

     const orders = await db.onlineSellBatch.findMany({
       where: {
         order: {
           user: { id },
         },
         paymentStatus: PaymentStatus.PENDING,
       },
       include: {
         sales: true,
         order: true,
       },
       orderBy: { saleTime: "desc" },
     });
     console.log("🚀 ~ GET ~ orders:", orders)

     return new NextResponse(
       JSON.stringify({ success: true, data: { user, orders } }),
       { status: 200 }
     );
   } catch (error: any) {
     console.error("Error fetching pending online orders for user:", error);
     return new NextResponse(
       JSON.stringify({ error: error?.message || "Internal server error" }),
       { status: 500 }
     );
   }
 }


