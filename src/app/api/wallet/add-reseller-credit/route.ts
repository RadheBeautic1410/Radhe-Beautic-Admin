export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { db } from "@/src/lib/db";
import { UserRole } from "@prisma/client";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  gpay: "GPay",
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== UserRole.ADMIN && role !== UserRole.MOD) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { amount, paymentMethod, userId } = body as {
      amount?: unknown;
      paymentMethod?: string;
      userId?: string;
    };

    const numericAmount = typeof amount === "number" ? amount : parseFloat(String(amount ?? ""));
    if (
      !userId ||
      !paymentMethod ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Valid userId, amount, and paymentMethod are required." },
        { status: 400 }
      );
    }

    const allowedMethods = ["cash", "bank_transfer", "gpay"] as const;
    if (!allowedMethods.includes(paymentMethod as (typeof allowedMethods)[number])) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 }
      );
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, creditLimit: true },
    });

    if (!target || target.role !== UserRole.RESELLER) {
      return NextResponse.json(
        { error: "User not found or is not a reseller." },
        { status: 400 }
      );
    }

    const methodLabel = METHOD_LABEL[paymentMethod] ?? paymentMethod;

    const updated = await db.$transaction(async (tx) => {
      await tx.walletHistory.create({
        data: {
          userId,
          amount: numericAmount,
          type: "DEBIT",
          paymentMethod: "admin-credit-line",
          paymentType: `Credit extended (${methodLabel})`,
        },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          creditLimit: { increment: numericAmount },
        },
        select: {
          id: true,
          creditLimit: true,
        },
      });
    });

    return NextResponse.json(
      {
        success: "Credit limit increased. A debit entry was added to the reseller wallet for tracking.",
        updatedUser: {
          id: updated.id,
          creditLimit: updated.creditLimit,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("add-reseller-credit:", message);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
