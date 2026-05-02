 export const dynamic = 'force-dynamic'

 import { NextRequest, NextResponse } from "next/server";
 import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import { PaymentStatus, OrderStatus } from "@prisma/client";

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

    const orders = await db.orders.findMany({
       where: {
        userId: id,
         paymentStatus: PaymentStatus.PENDING,
        status: { not: OrderStatus.CANCELLED },
       },
      select: {
        id: true,
        orderId: true,
        total: true,
        shippingCharge: true,
        date: true,
        status: true,
        paymentType: true,
        paymentStatus: true,
       },
      orderBy: { date: "desc" },
     });

    const normalizedOrders = orders.map((o) => ({
      ...o,
      totalAmount: Number(o.total || 0),
      amountDue: Number(o.total || 0) + Number(o.shippingCharge || 0),
    }));

     return new NextResponse(
      JSON.stringify({ success: true, data: { user, orders: normalizedOrders } }),
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


