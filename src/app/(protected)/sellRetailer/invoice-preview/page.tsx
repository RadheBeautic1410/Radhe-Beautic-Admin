"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import InvoicePreview, { InvoicePayload } from "./InvoicePreview";

export default function SellRetailerInvoicePreviewPage() {
  const searchParams = useSearchParams();
  const [invoice, setInvoice] = useState<InvoicePayload | null>(null);

  useEffect(() => {
    const key = searchParams.get("key");
    if (!key) return;
    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as InvoicePayload;
      setInvoice(parsed);
    } catch (error) {
      console.error("Invalid invoice preview payload", error);
    }
  }, [searchParams]);

  if (!invoice) {
    return (
      <div className="p-6">
        <p className="text-base font-medium">
          Invoice data not found. Please create the invoice again from sell page.
        </p>
      </div>
    );
  }

  return <InvoicePreview invoice={invoice} />;
}
