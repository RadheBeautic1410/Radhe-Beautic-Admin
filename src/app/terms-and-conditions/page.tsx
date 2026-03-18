import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Terms &amp; Conditions</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 18 Mar 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-6">
        <p>
          This is a temporary Terms &amp; Conditions page created for payment gateway
          onboarding (PhonePe). Content will be updated with full legal terms soon.
        </p>
        <p>
          By using our services, you agree to comply with applicable laws and not misuse the
          platform.
        </p>
        <p>
          If you have any questions, please contact us using the details provided on our
          website.
        </p>
      </section>
    </main>
  );
}

