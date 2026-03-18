import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 18 Mar 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This is a temporary Privacy Policy page created for payment gateway onboarding
          (PhonePe). Content will be updated with full policy details soon.
        </p>
        <p>
          We only collect information necessary to provide our services (for example:
          account/contact details and transaction-related information).
        </p>
        <p>
          We do not sell your personal data. We may share data with service providers only
          as required to operate the platform and process payments.
        </p>
      </section>
    </main>
  );
}

