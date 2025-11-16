export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import { UserRole, Status } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.max(parseInt(searchParams.get("limit") || "20", 10), 1);
    const statusParam = searchParams.get("status");
    const resellerIdParam = searchParams.get("resellerId");

    const where: any = {};
    if (
      statusParam &&
      ["PENDING", "ACCEPTED", "REJECTED"].includes(statusParam)
    ) {
      where.status = statusParam as Status;
    }

    if (resellerIdParam) {
      where.resellerId = resellerIdParam;
    } else if (
      !(
        session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.MOD
      )
    ) {
      where.resellerId = session.user.id;
    }

    const [total, items] = await db.$transaction([
      db.walletRequest.count({ where }),
      db.walletRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reseller: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
              role: true,
              balance: true,
            },
          },
        },
      }),
    ]);

    return new NextResponse(
      JSON.stringify({
        data: {
          items,
          total,
          page,
          limit,
        },
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Wallet request list API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    if (
      !(
        session.user.role === UserRole.ADMIN ||
        session.user.role === UserRole.MOD
      )
    ) {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      });
    }

    const body = await request.json();
    const { id, action } = body as {
      id?: string;
      action?: "approve" | "reject";
    };

    if (!id || !action || !["approve", "reject"].includes(action)) {
      return new NextResponse(
        JSON.stringify({
          error: "id and valid action ('approve'|'reject') are required",
        }),
        { status: 400 }
      );
    }

    const result = await db.$transaction(async (tx) => {
      const walletReq = await tx.walletRequest.findUnique({ where: { id } });
      if (!walletReq) {
        throw new Error("Wallet request not found");
      }
      if (walletReq.status !== "PENDING") {
        throw new Error("Only pending requests can be updated");
      }

      if (action === "reject") {
        const updated = await tx.walletRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        });
        return { updated, walletHistory: null, updatedUser: null };
      }

      const updated = await tx.walletRequest.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: walletReq.resellerId },
        data: {
          balance: { increment: walletReq.amount },
        },
        select: { id: true, balance: true },
      });

      const walletHistory = await tx.walletHistory.create({
        data: {
          userId: walletReq.resellerId,
          amount: walletReq.amount,
          type: "CREDIT",
          paymentMethod: "wallet-request",
          paymentType: walletReq.paymentType,
        },
      });

      return { updated, walletHistory, updatedUser };
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: result,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Wallet request update API Error:", error);
    return new NextResponse(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
