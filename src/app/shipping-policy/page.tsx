import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shipping Policy",
};

export default function ShippingPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Shipping Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 18 Mar 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This is a temporary Shipping Policy page created for payment gateway onboarding
          (PhonePe). Content will be updated with complete shipping terms soon.
        </p>
        <p>
          Orders are typically processed within a standard handling time. Delivery timelines
          depend on the courier service and destination.
        </p>
        <p>
          Shipping charges, if any, will be shown during checkout or order confirmation.
        </p>
      </section>
    </main>
  );
}

