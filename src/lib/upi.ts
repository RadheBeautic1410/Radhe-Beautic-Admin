/**
 * Builds `upi://pay` deep links so a QR can carry the exact order amount instead of
 * leaving the payer to type it.
 *
 * Caveat worth remembering: pre-filling `am` makes UPI apps show the amount as
 * non-editable, but that is app behaviour, not something the payee can enforce, and it
 * is no proof the money actually arrived. The payment-proof step still matters.
 */

/** e.g. `radhebeautic@okaxis` */
const VPA_PATTERN = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;

export function isValidUpiId(upiId: string | null | undefined): boolean {
  return typeof upiId === "string" && VPA_PATTERN.test(upiId.trim());
}

export interface UpiPayLinkInput {
  /** Payee VPA. */
  upiId: string;
  /** Name the payer sees in their UPI app. */
  payeeName?: string | null;
  /** Rupees. Omit for an open-amount QR. */
  amount?: number | null;
  /** Short note, e.g. an order id. */
  note?: string | null;
  /** Merchant-side reference, echoed back by most PSPs. */
  transactionRef?: string | null;
}

/**
 * Returns the deep link, or `null` when the UPI id is missing/malformed so callers can
 * fall back to the uploaded QR image.
 */
export function buildUpiPayLink({
  upiId,
  payeeName,
  amount,
  note,
  transactionRef,
}: UpiPayLinkInput): string | null {
  const vpa = (upiId || "").trim();
  if (!isValidUpiId(vpa)) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("pa", vpa);
  params.set("pn", (payeeName || "").trim() || "Radhe Beautic");

  const amountNum = Number(amount);
  if (Number.isFinite(amountNum) && amountNum > 0) {
    /** UPI wants a plain 2-decimal string; `1020` must go out as `1020.00`. */
    params.set("am", amountNum.toFixed(2));
    /** Locks the currency alongside the amount. */
    params.set("cu", "INR");
  }

  if (note) {
    /** UPI apps truncate long notes, and some reject punctuation outright. */
    params.set("tn", String(note).replace(/[^a-zA-Z0-9 .-]/g, " ").trim().slice(0, 50));
  }
  if (transactionRef) {
    params.set("tr", String(transactionRef).replace(/[^a-zA-Z0-9-]/g, "").slice(0, 35));
  }

  /**
   * `URLSearchParams` encodes spaces as `+`, which some UPI apps read literally.
   * `%20` is understood everywhere.
   */
  const query = params
    .toString()
    .replace(/\+/g, "%20")
    /** Older UPI apps fail to resolve a `pa` that arrives as `name%40bank`. */
    .replace(/%40/g, "@");

  return `upi://pay?${query}`;
}
