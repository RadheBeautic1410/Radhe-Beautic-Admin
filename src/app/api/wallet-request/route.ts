export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import {
  UserRole,
  Status,
  PaymentStatus,
  OrderStatus,
} from "@prisma/client";

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
          linkedOrder: {
            select: {
              id: true,
              orderId: true,
              total: true,
              shippingCharge: true,
              paymentStatus: true,
              paymentType: true,
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

      const isOrderPayment = Boolean(walletReq.linkedOrderId);

      if (action === "reject") {
        const updated = await tx.walletRequest.update({
          where: { id },
          data: {
            status: "REJECTED",
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        });
        return { updated, walletHistory: null, updatedUser: null, isOrderPayment };
      }

      const updated = await tx.walletRequest.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      });

      const payee = await tx.user.findUnique({
        where: { id: walletReq.resellerId },
        select: { role: true },
      });

      if (isOrderPayment && walletReq.linkedOrderId) {
        const linkedOrder = await tx.orders.findUnique({
          where: { id: walletReq.linkedOrderId },
          select: {
            paymentType: true,
            total: true,
            shippingCharge: true,
          },
        });
        await tx.orders.update({
          where: { id: walletReq.linkedOrderId },
          data: { paymentStatus: PaymentStatus.COMPLETED },
        });
        const userPatch: { balance: { increment: number }; creditLimit?: { increment: number } } = {
          balance: { increment: walletReq.amount },
        };
        if (
          linkedOrder?.paymentType === "credit_limit" &&
          payee?.role === UserRole.RESELLER
        ) {
          const due = Math.round(
            Number(linkedOrder.total || 0) +
              Number(linkedOrder.shippingCharge ?? 0)
          );
          if (due > 0) {
            userPatch.creditLimit = { increment: due };
          }
        }
        const updatedUser = await tx.user.update({
          where: { id: walletReq.resellerId },
          data: userPatch,
          select: { id: true, balance: true, creditLimit: true },
        });
        const walletHistory = await tx.walletHistory.create({
          data: {
            userId: walletReq.resellerId,
            amount: walletReq.amount,
            type: "CREDIT",
            paymentMethod: "order-payment-verified",
            paymentType: walletReq.paymentType,
          },
        });
        return {
          updated,
          walletHistory,
          updatedUser,
          isOrderPayment: true,
        };
      }

      const isReseller = payee?.role === UserRole.RESELLER;
      const amountPaid = Number(walletReq.amount);

      /**
       * Reseller repaying after using credit (GPay etc.):
       * 1) Apply payment FIFO to fully settle oldest PENDING-payment orders (drops "used credit").
       * 2) Remainder increases creditLimit (pure top-up / restores udhhar headroom).
       * Full amount always credits balance so later admin confirm can debit wallet when needed.
       */
      let remainingForCreditLine = isReseller ? amountPaid : 0;
      let allocatedToOrders = 0;
      let ordersClearedCount = 0;

      if (isReseller && remainingForCreditLine > 0) {
        const pendingOrders = await tx.orders.findMany({
          where: {
            userId: walletReq.resellerId,
            paymentStatus: PaymentStatus.PENDING,
            status: { not: OrderStatus.CANCELLED },
          },
          orderBy: { createdAt: "asc" },
          select: { id: true, total: true, shippingCharge: true },
        });

        for (const ord of pendingOrders) {
          const due = Math.round(
            Number(ord.total) + Number(ord.shippingCharge ?? 0)
          );
          if (due <= 0) continue;
          if (remainingForCreditLine >= due) {
            await tx.orders.update({
              where: { id: ord.id },
              data: { paymentStatus: PaymentStatus.COMPLETED },
            });
            await tx.user.update({
              where: { id: walletReq.resellerId },
              data: { creditLimit: { increment: due } },
            });
            remainingForCreditLine -= due;
            allocatedToOrders += due;
            ordersClearedCount += 1;
          } else {
            break;
          }
        }
      }

      const updatedUser = await tx.user.update({
        where: { id: walletReq.resellerId },
        data: {
          balance: { increment: amountPaid },
          ...(isReseller && remainingForCreditLine > 0
            ? { creditLimit: { increment: remainingForCreditLine } }
            : {}),
        },
        select: { id: true, balance: true, creditLimit: true },
      });

      const paymentTypeNote = (() => {
        if (!isReseller) return walletReq.paymentType;
        const bits: string[] = [walletReq.paymentType];
        if (ordersClearedCount > 0) {
          bits.push(
            `settled ${ordersClearedCount} order(s) ₹${allocatedToOrders}`
          );
        }
        if (remainingForCreditLine > 0) {
          bits.push(`credit line +₹${remainingForCreditLine}`);
        }
        return bits.join(" · ");
      })();

      const walletHistory = await tx.walletHistory.create({
        data: {
          userId: walletReq.resellerId,
          amount: walletReq.amount,
          type: "CREDIT",
          paymentMethod: "wallet-request",
          paymentType: paymentTypeNote,
        },
      });

      return {
        updated,
        walletHistory,
        updatedUser,
        isOrderPayment: false,
        ordersClearedCount,
        allocatedToOrders,
        creditLimitIncrement: isReseller ? remainingForCreditLine : 0,
      };
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
