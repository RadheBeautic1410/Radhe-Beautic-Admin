import { db } from "@/src/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
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

    // Step 1: Fetch user with balance
    const existingUser = await db.user.findUnique({
      where: { id: userId },
    });

    console.log("Raw amount:", amount, typeof amount);
    console.log("Parsed amount:", numericAmount);
    console.log("User balance before update:", existingUser?.balance);

    // Step 2: Ensure balance field is set to number if missing or invalid
    if (
      !existingUser?.balance ||
      typeof existingUser.balance !== "number" ||
      isNaN(existingUser.balance)
    ) {
      await db.user.update({
        where: { id: userId },
        data: { balance: 0 },
      });
      console.log("Balance field was missing or invalid. Set to 0.");
    }

    // Step 3: Create transaction + update balance in a transaction
    const [transaction, updatedUser] = await db.$transaction([
      db.walletHistory.create({
        data: {
          userId: userId,
          amount: numericAmount,
          type: "CREDIT",
          paymentMethod: paymentMethod,
          paymentType: "Added From Admin",
        },
      }),
      db.user.update({
        where: {
          id: userId,
        },
        data: {
          balance: {
            increment: numericAmount,
          },
        },
      }),
    ]);
    console.log("Transaction id:", updatedUser.id);
    console.log("Updated User Balance:", updatedUser.balance);

    return NextResponse.json(
      {
        success: "Money added to wallet successfully.",
        transaction,
        newBalance: updatedUser.balance,
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
