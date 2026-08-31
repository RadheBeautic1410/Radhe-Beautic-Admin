/**
 * WhatsApp notifications to resellers for their orders (server-only).
 *
 * Reseller orders are placed in the reseller panel but paid and shipped from here, so both
 * messages are sent from the admin side. Unlike customer orders there is deliberately NO
 * "order placed" message - the reseller only hears from us once money has moved:
 *   - paymentConfirmed: an admin approves a wallet request or settles pending orders.
 *   - orderShipped: `shippedOrder()` saves a tracking ID and flips the order to SHIPPED.
 *
 * The recipient is the reseller (Orders.user), not their end customer - ResellersCustomer
 * holds only a name, and the goods ship against the reseller's own address.
 *
 * Each send is claimed via a timestamp column so a message is never sent twice. Nothing here
 * throws, and callers must invoke it AFTER their transaction commits - these make a network
 * call and would hold a Mongo transaction open.
 */

import { db } from "@/src/lib/db";
import { getCourierDisplayName } from "@/src/lib/constants";
import { sendWhatsAppTemplate, type WhatsAppSendResult } from "@/src/lib/whatsapp";

function formatAmount(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

/**
 * Deep link into the reseller panel's order list, narrowed to this one order - the list page
 * runs its existing order-ID search when handed an `orderId` param.
 *
 * Returns "" when RESELLER_PANEL_URL isn't configured, which skips the send rather than
 * promising the reseller a link that goes nowhere.
 */
function buildOrderLink(orderId: string): string {
  const base = (process.env.RESELLER_PANEL_URL || "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return `${base}/orders/pending?status=SHIPPED&orderId=${encodeURIComponent(orderId)}`;
}

type NotifiableOrder = {
  id: string;
  orderId: string;
  total: number;
  shippingCharge: number;
  courier: string | null;
  trackingId: string | null;
  user: { name: string | null; phoneNumber: string; organization: string | null } | null;
};

const resellerName = (o: NotifiableOrder) =>
  o.user?.name || o.user?.organization || "Partner";

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
    envTemplate: "WHATSAPP_RESELLER_PAYMENT_CONFIRMED_TEMPLATE",
    buildParams: (o) => [
      resellerName(o),
      o.orderId,
      formatAmount((o.total || 0) + (o.shippingCharge || 0)),
    ],
  },
  orderShipped: {
    claimField: "shippedNotifiedAt",
    envTemplate: "WHATSAPP_RESELLER_SHIPPED_TEMPLATE",
    buildParams: (o) => {
      const courier = getCourierDisplayName(o.courier);
      const tracking = (o.trackingId || "").trim();
      const link = buildOrderLink(o.orderId);
      // A shipping message without these reads as broken, and WhatsApp rejects empty params.
      if (!courier || !tracking || !link) return null;
      return [resellerName(o), o.orderId, courier, tracking, link];
    },
  },
};

/**
 * Claim the notification for this order, send it, and release the claim if the send did not
 * go through so a later attempt can retry.
 *
 * @param id the Mongo id of the Orders row (what the payment/ship call sites have to hand)
 */
const notify = async (kind: NotificationKind, id: string): Promise<WhatsAppSendResult> => {
  const { claimField, envTemplate, buildParams } = NOTIFICATION_CONFIG[kind];

  try {
    const order = await db.orders.findUnique({
      where: { id },
      select: {
        id: true,
        orderId: true,
        total: true,
        shippingCharge: true,
        courier: true,
        trackingId: true,
        user: { select: { name: true, phoneNumber: true, organization: true } },
      },
    });

    if (!order) {
      console.warn(`[ResellerNotify:${kind}] Order not found:`, id);
      return { success: false, skipped: true, error: "order_not_found" };
    }

    const bodyParams = buildParams(order);
    if (!bodyParams) {
      console.warn(`[ResellerNotify:${kind}] Skipped, required order details missing:`, order.orderId);
      return { success: false, skipped: true, error: "incomplete_order_details" };
    }

    // Stamp first so concurrent callers can't both send.
    // On MongoDB a `null` filter does NOT match documents where the field is absent, which is
    // every order predating these columns - so match "absent" and "explicitly null" separately.
    const claim = await db.orders.updateMany({
      where: {
        id: order.id,
        OR: [{ [claimField]: null }, { [claimField]: { isSet: false } }],
      },
      data: { [claimField]: new Date() },
    });

    if (claim.count === 0) {
      console.log(`[ResellerNotify:${kind}] Already notified, skipping:`, order.orderId);
      return { success: false, skipped: true, error: "already_notified" };
    }

    const result = await sendWhatsAppTemplate({
      to: order.user?.phoneNumber,
      templateName: process.env[envTemplate],
      bodyParams,
    });

    if (!result.success) {
      // Release the claim so this can be retried later (config fixed, transient API error, ...).
      await db.orders
        .update({ where: { id: order.id }, data: { [claimField]: null } })
        .catch((e) => console.error(`[ResellerNotify:${kind}] Failed to release claim:`, e?.message || e));
    }

    return result;
  } catch (error: any) {
    console.error(`[ResellerNotify:${kind}] Unexpected error for ${id}:`, error?.message || error);
    return { success: false, error: error?.message || "notification_failed" };
  }
};

/** "We received your payment" - sent once, when an admin confirms payment for the order. */
export const notifyResellerPaymentConfirmed = (id: string) => notify("paymentConfirmed", id);

/** "Your order has been shipped" - sent once, when a tracking ID is saved. */
export const notifyResellerShipped = (id: string) => notify("orderShipped", id);

/** Notify several orders without letting one failure stop the rest (bulk settlement). */
export const notifyResellerPaymentConfirmedMany = async (ids: string[]) => {
  for (const id of ids) {
    await notifyResellerPaymentConfirmed(id);
  }
};
