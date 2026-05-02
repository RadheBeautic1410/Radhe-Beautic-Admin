import { db } from "@/src/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/src/auth";
import { UserRole } from "@prisma/client";

/**
 * Admin wallet top-up: increments balance + wallet history CREDIT.
 * For RESELLER users, also increments creditLimit by the same amount so udhhar headroom
 * is restored when they pay (matches decrements from confirmed credit orders).
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.MOD) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { amount, paymentMethod, userId } = body;

    const numericAmount = parseFloat(amount);
    if (
      !amount ||
      !paymentMethod ||
      isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Valid amount and paymentMethod are required." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, balance: true, role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    console.log("Raw amount:", amount, typeof amount);
    console.log("Parsed amount:", numericAmount);
    console.log("User balance before update:", existingUser?.balance);

    if (
      existingUser.balance == null ||
      typeof existingUser.balance !== "number" ||
      isNaN(existingUser.balance)
    ) {
      await db.user.update({
        where: { id: userId },
        data: { balance: 0 },
      });
      console.log("Balance field was missing or invalid. Set to 0.");
    }

    const isReseller = existingUser.role === UserRole.RESELLER;

    const { transaction, updatedUser } = await db.$transaction(async (tx) => {
      const wh = await tx.walletHistory.create({
        data: {
          userId: userId,
          amount: numericAmount,
          type: "CREDIT",
          paymentMethod: paymentMethod,
          paymentType: isReseller
            ? `Added From Admin · credit line +₹${numericAmount}`
            : "Added From Admin",
        },
      });
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          balance: { increment: numericAmount },
          ...(isReseller
            ? { creditLimit: { increment: numericAmount } }
            : {}),
        },
        select: { id: true, balance: true, creditLimit: true },
      });
      return { transaction: wh, updatedUser: user };
    });

    console.log("Transaction id:", updatedUser.id);
    console.log("Updated User Balance:", updatedUser.balance);

    return NextResponse.json(
      {
        success: "Money added to wallet successfully.",
        transaction,
        newBalance: updatedUser.balance,
        ...(isReseller ? { newCreditLimit: updatedUser.creditLimit } : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding money:", error.message);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
