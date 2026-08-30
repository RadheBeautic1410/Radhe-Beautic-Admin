/**
 * Customer-facing WhatsApp notifications for customer orders (server-only).
 *
 * The customer app sends the "we received your order" message when the order is placed.
 * This side owns payment confirmation for the manual/offline flow: a payment screenshot
 * is only a *claim* of payment, so the confirmation goes out when an admin accepts the
 * order and marks the payment COMPLETED on /customer-orders.
 *
 * The send is claimed via a timestamp column so the same message is never sent twice,
 * no matter how many times an order is re-accepted or re-saved.
 *
 * Nothing here throws - a failed notification must never fail the admin action.
 */

import { db } from "@/src/lib/db";
import { sendWhatsAppTemplate, type WhatsAppSendResult } from "@/src/lib/whatsapp";

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

/**
 * "Your payment is confirmed" - sent once, when payment actually completes.
 *
 * @param orderId the public order id (CustomerOrder.orderId), not the Mongo _id
 */
export const notifyPaymentConfirmed = async (orderId: string): Promise<WhatsAppSendResult> => {
  try {
    const order = await db.customerOrder.findFirst({
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        total: true,
        shippingCharge: true,
        user: { select: { name: true, phoneNumber: true } },
        shippingAddress: { select: { fullName: true, phoneNumber: true } },
      },
    });

    if (!order) {
      console.warn("[OrderNotify:paymentConfirmed] Order not found:", orderId);
      return { success: false, skipped: true, error: "order_not_found" };
    }

    // Stamp first so concurrent callers can't both send.
    // On MongoDB a `null` filter does NOT match documents where the field is absent, which is
    // every order predating these columns - so match "absent" and "explicitly null" separately.
    const claim = await db.customerOrder.updateMany({
      where: {
        id: order.id,
        OR: [
          { paymentConfirmedNotifiedAt: null },
          { paymentConfirmedNotifiedAt: { isSet: false } },
        ],
      },
      data: { paymentConfirmedNotifiedAt: new Date() },
    });

    if (claim.count === 0) {
      console.log("[OrderNotify:paymentConfirmed] Already notified, skipping:", orderId);
      return { success: false, skipped: true, error: "already_notified" };
    }

    const to = order.shippingAddress?.phoneNumber || order.user?.phoneNumber;
    const customerName = order.shippingAddress?.fullName || order.user?.name || "Customer";
    const grandTotal = (order.total || 0) + (order.shippingCharge || 0);

    const result = await sendWhatsAppTemplate({
      to,
      templateName: process.env.WHATSAPP_PAYMENT_CONFIRMED_TEMPLATE,
      bodyParams: [customerName, order.orderId, formatAmount(grandTotal)],
    });

    if (!result.success) {
      // Release the claim so this can be retried later (config fixed, transient API error, ...).
      await db.customerOrder
        .update({ where: { id: order.id }, data: { paymentConfirmedNotifiedAt: null } })
        .catch((e) =>
          console.error("[OrderNotify:paymentConfirmed] Failed to release claim:", e?.message || e)
        );
    }

    return result;
  } catch (error: any) {
    console.error(
      `[OrderNotify:paymentConfirmed] Unexpected error for ${orderId}:`,
      error?.message || error
    );
    return { success: false, error: error?.message || "notification_failed" };
  }
};
