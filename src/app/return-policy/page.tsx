import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy",
};

export default function ReturnPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Return Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 18 Mar 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This is a temporary Return Policy page created for payment gateway onboarding
          (PhonePe). Content will be updated with complete return terms soon.
        </p>
        <p>
          If returns are applicable, items may be eligible for return within a defined window
          after delivery, subject to verification and product condition.
        </p>
        <p>
          For support, please contact us with your order/transaction details.
        </p>
      </section>
    </main>
  );
}

