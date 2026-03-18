import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
};

export default function RefundPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Refund Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 18 Mar 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This is a temporary Refund Policy page created for payment gateway onboarding
          (PhonePe). Content will be updated with complete refund terms soon.
        </p>
        <p>
          If a refund is applicable, it will be processed to the original payment method
          after verification. Processing time may vary by payment provider.
        </p>
        <p>
          For support, please contact us with your order/transaction details.
        </p>
      </section>
    </main>
  );
}

