import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  getPhonePeOrderStatus,
  isPhonePeConfigured,
} from "@/src/lib/server/phonepe";

export const maxDuration = 60;

const BATCH_SIZE = 30;
const LOOKBACK_DAYS = 7;
const RESULT_LIMIT = 50;

function isAuthorizedCron(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  // Allow Vercel native cron header for scheduled runs.
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader === "1") return true;

  // Also allow manual/secure invocation with CRON_SECRET.
  if (cronSecret && providedSecret && providedSecret === cronSecret) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  console.log("GET /api/cron/reconcile-customer-payments");
  try {
    if (!isAuthorizedCron(request)) {
      return NextResponse.json(
        { error: "Unauthorized cron access" },
        { status: 401 },
      );
    }

    if (!isPhonePeConfigured()) {
      return NextResponse.json(
        { error: "PhonePe is not configured on this deployment" },
        { status: 500 },
      );
    }

    const fromDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const candidates = await db.customerOrder.findMany({
      where: {
        paymentStatus: PaymentStatus.PENDING,
        paymentProvider: "PHONEPE",
        createdAt: { gte: fromDate },
        status: OrderStatus.PENDING,
      },
      select: {
        id: true,
        orderId: true,
        paymentStatus: true,
      },
      orderBy: { createdAt: "asc" },
      take: BATCH_SIZE,
    });

    let checked = 0;
    let updated = 0;
    let notFound = 0;
    const notFoundOrders: string[] = [];
    const failures: Array<{ orderId: string; reason: string }> = [];
    const orderResults: Array<{
      orderId: string;
      dbPaymentStatusBefore: PaymentStatus;
      gatewayPaymentState: string;
      dbPaymentStatusAfter: PaymentStatus;
      action: "UPDATED_TO_COMPLETED" | "NO_CHANGE" | "NOT_FOUND" | "FAILED";
      reason?: string;
    }> = [];

    for (const order of candidates) {
      checked += 1;
      try {
        const statusResponse = await getPhonePeOrderStatus(
          order.orderId,
          true,
        );
        console.log("statusResponse", statusResponse);
        const state = statusResponse?.data?.state as string | undefined;
        const paymentDetails = Array.isArray(
          statusResponse?.data?.paymentDetails,
        )
          ? statusResponse.data.paymentDetails
          : [];
        const latestPayment =
          paymentDetails.length > 0
            ? paymentDetails[paymentDetails.length - 1]
            : undefined;
        const transactionId =
          latestPayment?.transactionId ||
          statusResponse?.data?.transactionId ||
          null;

        if (state === "COMPLETED") {
          await db.customerOrder.update({
            where: { id: order.id },
            data: {
              paymentStatus: PaymentStatus.COMPLETED,
              paymentTxnId: transactionId ?? undefined,
              paymentProvider: "PHONEPE",
            },
          });
          updated += 1;
          orderResults.push({
            orderId: order.orderId,
            dbPaymentStatusBefore: order.paymentStatus,
            gatewayPaymentState: state,
            dbPaymentStatusAfter: PaymentStatus.COMPLETED,
            action: "UPDATED_TO_COMPLETED",
          });
        } else {
          orderResults.push({
            orderId: order.orderId,
            dbPaymentStatusBefore: order.paymentStatus,
            gatewayPaymentState: state || "UNKNOWN",
            dbPaymentStatusAfter: order.paymentStatus,
            action: "NO_CHANGE",
          });
        }
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Unknown status error";
        const isApiMappingNotFound =
          typeof reason === "string" &&
          reason.toLowerCase().includes("api mapping not found");

        if (isApiMappingNotFound) {
          notFound += 1;
          notFoundOrders.push(order.orderId);
          orderResults.push({
            orderId: order.orderId,
            dbPaymentStatusBefore: order.paymentStatus,
            gatewayPaymentState: "NOT_FOUND",
            dbPaymentStatusAfter: order.paymentStatus,
            action: "NOT_FOUND",
            reason,
          });
          continue;
        }

        failures.push({
          orderId: order.orderId,
          reason,
        });
        orderResults.push({
          orderId: order.orderId,
          dbPaymentStatusBefore: order.paymentStatus,
          gatewayPaymentState: "ERROR",
          dbPaymentStatusAfter: order.paymentStatus,
          action: "FAILED",
          reason,
        });
      }
    }

    return NextResponse.json({
      success: true,
      lookedBackDays: LOOKBACK_DAYS,
      batchSize: BATCH_SIZE,
      checked,
      updated,
      pendingInBatch: Math.max(0, checked - updated),
      notFound,
      notFoundOrders: notFoundOrders.slice(0, 20),
      failuresCount: failures.length,
      failures: failures.slice(0, 10),
      results: orderResults.slice(0, RESULT_LIMIT),
    });
  } catch (error) {
    console.error("[Cron][Reconcile Customer Payments] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to reconcile customer payments",
      },
      { status: 500 },
    );
  }
}
