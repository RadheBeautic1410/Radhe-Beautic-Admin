"use client";

import React, { useMemo } from "react";
import { Button } from "@/src/components/ui/button";

type GSTType = "IGST" | "SGST_CGST";

type SoldProduct = {
  kurti: {
    code: string;
    hsnCode?: string;
  };
  size: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type InvoicePayload = {
  batchNumber: string;
  invoiceNumber: string;
  /**
   * Optional: shorter/pretty numbers for display only (keeps original batch/invoice values intact).
   * Useful when backend numbers are long.
   */
  displayBatchNumber?: string;
  displayInvoiceNumber?: string;
  customerName: string;
  customerPhone: string;
  billCreatedBy: string;
  remark?: string;
  discountAmount?: number;
  gstType: GSTType;
  paymentType?: string;
  soldProducts: SoldProduct[];
  totalAmount: number;
  shopName: string;
  shopLocation: string;
};

const GST_RATE = 5;

const calculateGSTBreakdown = (totalPriceWithGST: number, gstType: GSTType) => {
  if (!totalPriceWithGST || Number.isNaN(totalPriceWithGST)) {
    return { basePrice: 0, igst: 0, sgst: 0, cgst: 0, totalGST: 0 };
  }

  const basePrice = totalPriceWithGST / (1 + GST_RATE / 100);
  const totalGSTAmount = totalPriceWithGST - basePrice;

  if (gstType === "IGST") {
    return {
      basePrice: parseFloat(basePrice.toFixed(2)),
      igst: parseFloat(totalGSTAmount.toFixed(2)),
      sgst: 0,
      cgst: 0,
      totalGST: parseFloat(totalGSTAmount.toFixed(2)),
    };
  }

  const sgst = totalGSTAmount / 2;
  const cgst = totalGSTAmount / 2;
  return {
    basePrice: parseFloat(basePrice.toFixed(2)),
    igst: 0,
    sgst: parseFloat(sgst.toFixed(2)),
    cgst: parseFloat(cgst.toFixed(2)),
    totalGST: parseFloat(totalGSTAmount.toFixed(2)),
  };
};

export default function InvoicePreview({
  invoice,
  embedded = false,
  showPrintButton = true,
  groupByCode = false,
}: {
  invoice: InvoicePayload;
  embedded?: boolean;
  showPrintButton?: boolean;
  groupByCode?: boolean;
}) {
  const displayRows = useMemo(() => {
    if (!groupByCode) return invoice.soldProducts;

    type GroupRow = SoldProduct & {
      _baseAmount: number; // base amount excluding GST
    };

    const map = new Map<string, GroupRow>();

    for (const item of invoice.soldProducts) {
      const code = item.kurti.code?.toUpperCase() || "";
      const qty = Number(item.quantity || 0);
      const unit = Number(item.unitPrice || 0);
      const baseAmount = (unit / (1 + GST_RATE / 100)) * qty;

      const prev = map.get(code);
      if (!prev) {
        map.set(code, {
          ...item,
          size: "", // not shown in grouped mode
          quantity: qty,
          unitPrice: unit,
          totalPrice: unit * qty,
          _baseAmount: baseAmount,
        });
      } else {
        const nextQty = prev.quantity + qty;
        const nextTotal = prev.totalPrice + unit * qty;
        const nextBase = prev._baseAmount + baseAmount;
        map.set(code, {
          ...prev,
          quantity: nextQty,
          totalPrice: nextTotal,
          // show weighted average unit price (incl GST) for reference
          unitPrice: nextQty > 0 ? nextTotal / nextQty : prev.unitPrice,
          _baseAmount: nextBase,
        });
      }
    }

    return Array.from(map.values());
  }, [groupByCode, invoice.soldProducts]);

  const gstSummary = useMemo(() => {
    return invoice.soldProducts.reduce(
      (acc, item) => {
        const itemTotal = Number(item.unitPrice || 0) * Number(item.quantity || 0);
        const breakdown = calculateGSTBreakdown(itemTotal, invoice.gstType);
        return {
          basePrice: acc.basePrice + breakdown.basePrice,
          igst: acc.igst + breakdown.igst,
          sgst: acc.sgst + breakdown.sgst,
          cgst: acc.cgst + breakdown.cgst,
          totalGST: acc.totalGST + breakdown.totalGST,
        };
      },
      { basePrice: 0, igst: 0, sgst: 0, cgst: 0, totalGST: 0 }
    );
  }, [invoice]);

  const totalQty = useMemo(() => {
    return invoice.soldProducts.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }, [invoice]);

  return (
    <div
      className={[
        embedded ? "bg-transparent p-0" : "bg-gray-100 min-h-screen p-4",
        "print:bg-white print:p-0",
      ].join(" ")}
    >
      <style jsx global>{`
        @page {
          /* 4x6 inch (thermal/label style) */
          size: 4in 6in;
          margin: 3mm;
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Make invoice use full printable width on small paper */
          .invoice-page {
            max-width: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          .invoice-page {
            display: flex;
            flex-direction: column;
            /* Tighten typography so everything fits on 4x6 */
            font-size: 10px;
            line-height: 1.25;
          }
          /* Reduce Tailwind paddings inside invoice for print */
          .invoice-page .p-4 {
            padding: 8px !important;
          }
          .invoice-page .p-3 {
            padding: 6px !important;
          }
          .invoice-page .p-2 {
            padding: 2px !important;
          }
          .invoice-page .px-5 {
            padding-left: 8px !important;
            padding-right: 8px !important;
          }
          .invoice-page .py-4 {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          /* Reduce some common font-size utilities for print */
          .invoice-page .text-2xl {
            font-size: 16px !important;
            line-height: 1.2 !important;
          }
          .invoice-page .text-sm {
            font-size: 10px !important;
          }
          .invoice-page .text-xs {
            font-size: 9px !important;
          }
          .invoice-page .text-\[10px\] {
            font-size: 8px !important;
            line-height: 1.2 !important;
          }
          .invoice-footer {
            margin-top: auto;
            break-inside: avoid;
          }
          thead,
          tfoot {
            display: table-row-group;
          }
          tr,
          td,
          th {
            break-inside: avoid;
          }
        }
      `}</style>

      {showPrintButton && (
        <div className="max-w-[900px] mx-auto mb-4 print:hidden flex justify-end">
          <Button
            onClick={() => window.print()}
            className="bg-green-600 hover:bg-green-700"
          >
            Print Bill
          </Button>
        </div>
      )}

      <div className="max-w-[900px] mx-auto bg-white border-2 border-black invoice-page">
        <div className="border-b-2 border-black px-5 py-4 text-center bg-gray-50">
          <div className="text-sm font-bold float-left">Tax Invoice</div>
          <div className="text-sm font-bold float-right">
            No: {invoice.displayInvoiceNumber || invoice.invoiceNumber}
          </div>
          <div className="clear-both" />
          <div className="text-2xl font-bold tracking-wide mt-2 uppercase">
            Radhe Beautic
          </div>
          <div className="text-[10px] leading-4 mt-1">
            269, Narayan Nagar Soc., Opposite Sagun Jawells street, Katargam, Surat
            <br />
            MOB 9924381353
            <br />
            GST No: 24KJGPD0026N1ZA
          </div>
        </div>

        <div className="flex border-b-2 border-black">
          <div className="basis-[54%] p-4 border-r-2 border-black">
            <div className="text-xs font-bold mb-2">
              Mr./Ms.: {(invoice.customerName || "").toUpperCase()}
            </div>
            <div className="text-sm leading-6">
              <span className="font-semibold">Mobile:</span> {invoice.customerPhone || "-"}
            </div>
          </div>
          <div className="basis-[46%] p-4 text-sm">
            <div className="flex justify-between mb-2">
              <span className="font-bold">Bill No:</span>
              <span>{invoice.displayBatchNumber || invoice.batchNumber}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="font-bold">Date:</span>
              <span>
                {new Date().toLocaleString("en-IN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold">Bill By:</span>
              <span>{invoice.billCreatedBy}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-bold">Payment:</span>
              <span>{invoice.paymentType || "-"}</span>
            </div>
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-xs font-bold">SR</th>
              <th className="border border-black p-2 text-xs font-bold text-left">
                DESCRIPTION
              </th>
              <th className="border border-black p-2 text-xs font-bold">HSN</th>
              <th className="border border-black p-2 text-xs font-bold">QTY</th>
              <th className="border border-black p-2 text-xs font-bold">RATE</th>
              <th className="border border-black p-2 text-xs font-bold">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item, index) => (
              <tr key={`${item.kurti.code}-${groupByCode ? "group" : item.size}-${index}`}>
                <td className="border border-black p-2 text-xs text-center">
                  {index + 1}
                </td>
                <td className="border border-black p-2 text-xs">
                  {item.kurti.code?.toUpperCase()}
                  {!groupByCode && item.size ? ` (${item.size?.toUpperCase()})` : ""}
                </td>
                <td className="border border-black p-2 text-xs text-center">
                  {item.kurti.hsnCode || "6204"}
                </td>
                <td className="border border-black p-2 text-xs text-center">
                  {Number(item.quantity || 0).toFixed(2)}
                </td>
                <td className="border border-black p-2 text-xs text-right">
                  {(() => {
                    if (groupByCode) {
                      const anyItem = item as any;
                      const baseAmount = Number(anyItem._baseAmount || 0);
                      const qty = Number(item.quantity || 0);
                      return qty > 0 ? (baseAmount / qty).toFixed(2) : "0.00";
                    }
                    return (
                      Number(item.unitPrice || 0) / (1 + GST_RATE / 100)
                    ).toFixed(2);
                  })()}
                </td>
                <td className="border border-black p-2 text-xs text-right">
                  {(() => {
                    if (groupByCode) {
                      const anyItem = item as any;
                      return Number(anyItem._baseAmount || 0).toFixed(2);
                    }
                    return (
                      (Number(item.unitPrice || 0) / (1 + GST_RATE / 100)) *
                      Number(item.quantity || 0)
                    ).toFixed(2);
                  })()}
                </td>
              </tr>
            ))}

            <tr>
              <td className="border border-black p-2 text-xs" colSpan={4} />
              <td className="border border-black p-2 text-xs text-right font-bold">
                {totalQty.toFixed(2)}
              </td>
              <td className="border border-black p-2 text-xs text-right font-bold">
                {gstSummary.basePrice.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex border-t border-black">
          <div className="flex-1 p-3 border-r border-black text-xs" />
          <div className="flex-1 p-3 text-right">
            <div className="text-xs mb-2">
              {invoice.gstType === "IGST" ? (
                <table className="w-full border border-black text-xs">
                  <tbody>
                    <tr>
                      <td className="border-r border-black px-2 py-1 text-left">IGST (5%)</td>
                      <td className="px-2 py-1 text-right">Rs.{gstSummary.igst.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table className="w-full border border-black text-xs">
                  <tbody>
                    <tr>
                      <td className="border-r border-b border-black px-2 py-1 text-left">
                        SGST (2.5%)
                      </td>
                      <td className="border-b border-black px-2 py-1 text-right">
                        Rs.{gstSummary.sgst.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border-r border-black px-2 py-1 text-left">
                        CGST (2.5%)
                      </td>
                      <td className="px-2 py-1 text-right">Rs.{gstSummary.cgst.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            <div className="pt-2 border-t border-black text-sm font-bold">
              {Number(invoice.discountAmount || 0) > 0 ? (
                <div className="flex items-center justify-between text-xs font-normal mb-2">
                  <span className="bg-gray-100 px-2 py-1">DISCOUNT</span>
                  <span className="bg-gray-100 px-2 py-1">
                    -{Number(invoice.discountAmount || 0).toFixed(2)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="bg-gray-100 px-2 py-1">INVOICE TOTAL</span>
                <span className="bg-gray-100 px-2 py-1">
                  {Number(invoice.totalAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {(invoice.remark || "").trim().length > 0 ? (
          <div className="border-t border-black px-5 py-2 text-xs">
            <span className="font-bold">Remark:</span> {invoice.remark}
          </div>
        ) : null}

        <div className="flex border-t-2 border-black invoice-footer">
          <div className="flex-1 p-4 border-r-2 border-black">
            <div className="text-xs font-bold mb-2">Terms & Conditions:</div>
            <div className="text-[10px] leading-5">
              - Subject to SURAT Jurisdiction
              <br />
              - Goods once sold will not be taken back
              <br />
              - Payment within 0 days
              <br />
              - No less payment
            </div>
          </div>
          <div className="flex-1 p-4">
            <div className="text-center text-xs font-bold mb-5">For, RADHE BEAUTIC</div>
            <div className="text-center mt-10 pt-1 text-xs font-bold">
              Authorised Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

