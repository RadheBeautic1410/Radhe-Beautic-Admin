/**
 * Customer-facing WhatsApp notifications for customer orders (server-only).
 *
 * The customer app sends "we received your order" when the order is placed. This side owns
 * the two admin-driven messages:
 *   - paymentConfirmed: a payment screenshot is only a *claim* of payment, so the confirmation
 *     goes out when an admin accepts the order and marks payment COMPLETED on /customer-orders.
 *   - orderShipped: sent when a tracking ID is saved and the order flips to SHIPPED.
 *
 * Each send is claimed via a timestamp column so the same message is never sent twice, no
 * matter how many times an order is re-accepted or its tracking details are edited.
 *
 * Nothing here throws - a failed notification must never fail the admin action.
 */

import { db } from "@/src/lib/db";
import { getCourierDisplayName } from "@/src/lib/constants";
import { sendWhatsAppTemplate, type WhatsAppSendResult } from "@/src/lib/whatsapp";

/**
 * Gujarat pincodes run 36xxxx-39xxxx. The 39xxxx band also covers Daman and
 * Silvassa, which are next to Surat and deliver on the same fast window.
 *
 * We key off the pincode rather than Address.state because the state field is free text and
 * arrives spelled three different ways in production ("Gujarat", "Gujrat", "GUJARAT").
 */
const GUJARAT_PINCODE = /^3[6-9]\d{4}$/;

/** Delivery estimate shown to the customer, in working days. */
export const getDeliveryWindow = (zipCode?: string | null): string =>
  GUJARAT_PINCODE.test((zipCode || "").trim()) ? "4-5" : "7-8";

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

// Everything the templates can draw on. Keep in sync with the select below.
type NotifiableOrder = {
  id: string;
  orderId: string;
  total: number;
  shippingCharge: number;
  courier: string | null;
  trackingId: string | null;
  user: { name: string | null; phoneNumber: string } | null;
  shippingAddress: { fullName: string | null; phoneNumber: string | null; zipCode: string | null } | null;
};

const customerName = (o: NotifiableOrder) =>
  o.shippingAddress?.fullName || o.user?.name || "Customer";

type NotificationKind = "paymentConfirmed" | "orderShipped";

const NOTIFICATION_CONFIG: Record<
  NotificationKind,
  {
    claimField: "paymentConfirmedNotifiedAt" | "shippedNotifiedAt";
    envTemplate: string;
    /** Body params, or null to skip the send because required data is missing. */
    buildParams: (order: NotifiableOrder) => string[] | null;
  }
> = {
  paymentConfirmed: {
    claimField: "paymentConfirmedNotifiedAt",
    envTemplate: "WHATSAPP_PAYMENT_CONFIRMED_TEMPLATE",
    buildParams: (o) => [
      customerName(o),
      o.orderId,
      formatAmount((o.total || 0) + (o.shippingCharge || 0)),
    ],
  },
  orderShipped: {
    claimField: "shippedNotifiedAt",
    envTemplate: "WHATSAPP_ORDER_SHIPPED_TEMPLATE",
    buildParams: (o) => {
      const courier = getCourierDisplayName(o.courier);
      const tracking = (o.trackingId || "").trim();
      // Never send a shipping message with a blank courier or tracking number.
      if (!courier || !tracking) return null;
      return [
        customerName(o),
        o.orderId,
        courier,
        tracking,
        getDeliveryWindow(o.shippingAddress?.zipCode),
      ];
    },
  },
};

/**
 * Claim the notification for this order, send it, and release the claim if the send did not
 * go through so a later attempt can retry.
 *
 * @param orderId the public order id (CustomerOrder.orderId), not the Mongo _id
 */
const notify = async (kind: NotificationKind, orderId: string): Promise<WhatsAppSendResult> => {
  const { claimField, envTemplate, buildParams } = NOTIFICATION_CONFIG[kind];

  try {
    const order = await db.customerOrder.findFirst({
      where: { orderId },
      select: {
        id: true,
        orderId: true,
        total: true,
        shippingCharge: true,
        courier: true,
        trackingId: true,
        user: { select: { name: true, phoneNumber: true } },
        shippingAddress: { select: { fullName: true, phoneNumber: true, zipCode: true } },
      },
    });

    if (!order) {
      console.warn(`[OrderNotify:${kind}] Order not found:`, orderId);
      return { success: false, skipped: true, error: "order_not_found" };
    }

    const bodyParams = buildParams(order);
    if (!bodyParams) {
      console.warn(`[OrderNotify:${kind}] Skipped, required order details missing:`, orderId);
      return { success: false, skipped: true, error: "incomplete_order_details" };
    }

    // Stamp first so concurrent callers can't both send.
    // On MongoDB a `null` filter does NOT match documents where the field is absent, which is
    // every order predating these columns - so match "absent" and "explicitly null" separately.
    const claim = await db.customerOrder.updateMany({
      where: {
        id: order.id,
        OR: [{ [claimField]: null }, { [claimField]: { isSet: false } }],
      },
      data: { [claimField]: new Date() },
    });

    if (claim.count === 0) {
      console.log(`[OrderNotify:${kind}] Already notified, skipping:`, orderId);
      return { success: false, skipped: true, error: "already_notified" };
    }

    const result = await sendWhatsAppTemplate({
      to: order.shippingAddress?.phoneNumber || order.user?.phoneNumber,
      templateName: process.env[envTemplate],
      bodyParams,
    });

    if (!result.success) {
      // Release the claim so this can be retried later (config fixed, transient API error, ...).
      await db.customerOrder
        .update({ where: { id: order.id }, data: { [claimField]: null } })
        .catch((e) => console.error(`[OrderNotify:${kind}] Failed to release claim:`, e?.message || e));
    }

    return result;
  } catch (error: any) {
    console.error(`[OrderNotify:${kind}] Unexpected error for ${orderId}:`, error?.message || error);
    return { success: false, error: error?.message || "notification_failed" };
  }
};

/** "Your payment is confirmed" - sent once, when payment actually completes. */
export const notifyPaymentConfirmed = (orderId: string) => notify("paymentConfirmed", orderId);

/** "Your order has been shipped" - sent once, when a tracking ID is saved. */
export const notifyOrderShipped = (orderId: string) => notify("orderShipped", orderId);
