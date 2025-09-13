import { OfflineSellType, OnlineSellType } from "@prisma/client";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Shared invoice generation utility
export const generateInvoiceHTML = (
  saleData: any,
  batchNumber: string,
  customerName: string,
  customerPhone: string,
  selectedLocation: string,
  billCreatedBy: string,
  currentUser: any,
  soldProducts: any[],
  totalAmount: number,
  gstType: "IGST" | "SGST_CGST" = "SGST_CGST",
  invoiceNumber: string = "",
  sellType: OfflineSellType | OnlineSellType = "SHOP_SELL_OFFLINE",
  shippingCharge?: number,
  trackingId?: string
) => {
  const currentDate = new Date().toLocaleDateString("en-IN");
  const currentTime = new Date().toLocaleTimeString("en-IN");
  const GST_RATE = 5; // Total GST (2.5% SGST + 2.5% CGST)

  const calculateGSTBreakdown = (totalPriceWithGST: number) => {
    if (!totalPriceWithGST || isNaN(totalPriceWithGST)) {
      return {
        basePrice: 0,
        igst: 0,
        sgst: 0,
        cgst: 0,
        totalGST: 0,
      };
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
    } else {
      const sgst = totalGSTAmount / 2;
      const cgst = totalGSTAmount / 2;
      return {
        basePrice: parseFloat(basePrice.toFixed(2)),
        igst: 0,
        sgst: parseFloat(sgst.toFixed(2)),
        cgst: parseFloat(cgst.toFixed(2)),
        totalGST: parseFloat(totalGSTAmount.toFixed(2)),
      };
    }
  };

  // Group products by code and price for hall sales
  let displayProducts = soldProducts;
  if (sellType === "HALL_SELL_OFFLINE" || sellType === "HALL_SELL_ONLINE") {
    const groupedProducts = new Map();

    soldProducts.forEach((item) => {
      const key = `${item.kurti.code}-${item.unitPrice}`;
      if (groupedProducts.has(key)) {
        const existing = groupedProducts.get(key);
        existing.quantity += item.quantity;
        existing.totalPrice += item.totalPrice;
      } else {
        groupedProducts.set(key, {
          kurti: item.kurti,
          size: item.size,
          quantity: item.quantity,
          selledPrice: item.selledPrice,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }
    });

    displayProducts = Array.from(groupedProducts.values());
  }

  const totalGSTBreakdown = soldProducts.reduce(
    (acc, item) => {
      const selledPrice =
        item.sale?.selledPrice ??
        item.unitPrice ??
        (typeof item.sellingPrice === "number"
          ? item.sellingPrice
          : parseFloat(item.sellingPrice || "0"));

      const quantity = Number(item.quantity) || 0;

      const itemTotal = selledPrice * quantity;
      const breakdown = calculateGSTBreakdown(itemTotal);

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

  console.log("totalGSTBreakdown", totalGSTBreakdown);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${batchNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
        .invoice-container {
          max-width: 800px;
          margin: auto;
          background: #fff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { text-align: center; margin-bottom: 30px; }
        .shop-name { font-size: 32px; font-weight: bold; color: #e74c3c; }
        .shop-tagline { font-size: 16px; color: #666; font-style: italic; }
        .invoice-details, .customer-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .info-block { min-width: 250px; margin: 10px; }
        .info-block h3 { border-bottom: 2px solid #eee; padding-bottom: 5px; color: #333; }
        .info-row { margin: 6px 0; }
        .info-label { font-weight: bold; width: 100px; display: inline-block; color: #555; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 10px; border: 1px solid #ccc; }
        th { background: #34495e; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .total-section {
          margin-top: 30px;
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          text-align: right;
        }
        .total-amount { font-size: 24px; font-weight: bold; color: #e74c3c; }
        .footer { margin-top: 40px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #ddd; padding-top: 20px; }
        .thank-you { font-size: 18px; color: #27ae60; font-weight: bold; margin-bottom: 10px; }
        @media print {
          body { background: white; }
          .invoice-container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="shop-name">Radhe Beautic</div>
          <div class="shop-tagline">Premium Fashion Collection - Offline Sale${
            sellType === "HALL_SELL_OFFLINE" || sellType === "HALL_SELL_ONLINE"
              ? " (Hall Sale)"
              : ""
          }</div>
        </div>

        <div class="invoice-details">
          <div class="info-block">
            <h3>Invoice Details</h3>
            <div class="info-row"><span class="info-label">Invoice #:</span> ${
              invoiceNumber || batchNumber
            }</div>
            <div class="info-row"><span class="info-label">Batch #:</span> ${batchNumber}</div>
            <div class="info-row"><span class="info-label">Date:</span> ${currentDate}</div>
            <div class="info-row"><span class="info-label">Time:</span> ${currentTime}</div>
            <div class="info-row"><span class="info-label">Seller:</span> ${
              currentUser?.name || "N/A"
            }</div>
            ${
              selectedLocation
                ? `<div class="info-row"><span class="info-label">Location:</span> ${selectedLocation}</div>`
                : ""
            }
            <div class="info-row"><span class="info-label">Bill By:</span> ${billCreatedBy}</div>
            ${
              trackingId
                ? `<div class="info-row"><span class="info-label">Tracking ID:</span> ${trackingId}</div>`
                : ""
            }
          </div>
          <div class="info-block">
            <h3>Customer Details</h3>
            <div class="info-row"><span class="info-label">Name:</span> ${customerName}</div>
            ${
              customerPhone
                ? `<div class="info-row"><span class="info-label">Phone:</span> ${customerPhone}</div>`
                : ""
            }
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>Rate (Ex. GST)</th>
              <th>Amount (Ex. GST)</th>
            </tr>
          </thead>
          <tbody>
            ${displayProducts
              .map((item) => {
                return `
              <tr>
                <td>
                  ${item.kurti.code.toUpperCase()}<br/>
                </td>
                <td>${item.kurti.hsnCode || "N/A"}</td>
                <td>${item.quantity}</td>
                <td>₹${item.unitPrice.toFixed(2).toString()}</td>
                <td>₹${item.totalPrice?.toFixed(2)?.toString() || "0"}</td>
              </tr>
              `;
              })
              .join("")}
            <tr class="gst-row">
              <td colspan="4" style="text-align: right; font-weight: bold;">Subtotal (Ex. GST):</td>
              <td style="font-weight: bold;">₹${totalGSTBreakdown.basePrice.toFixed(
                2
              )}</td>
            </tr>
            ${
              gstType === "IGST"
                ? `
            <tr>
              <td colspan="4" style="text-align: right;">IGST (5%):</td>
              <td>₹${totalGSTBreakdown.igst.toFixed(2)}</td>
            </tr>
            `
                : `
            <tr>
              <td colspan="4" style="text-align: right;">SGST (2.5%):</td>
              <td>₹${totalGSTBreakdown.sgst.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="4" style="text-align: right;">CGST (2.5%):</td>
              <td>₹${totalGSTBreakdown.cgst.toFixed(2)}</td>
            </tr>
            `
            }
            <tr style="border-top: 2px solid #333;">
              <td colspan="4" style="text-align: right; font-weight: bold; font-size: 18px;">Subtotal:</td>
              <td style="font-weight: bold; font-size: 18px;">₹${(typeof totalAmount ===
              "string"
                ? parseFloat(totalAmount)
                : totalAmount || 0
              ).toFixed(2)}</td>
            </tr>
            ${
              shippingCharge && shippingCharge > 0
                ? `
            <tr>
              <td colspan="4" style="text-align: right; font-weight: bold;">Shipping Charge:</td>
              <td style="font-weight: bold;">₹${Number(shippingCharge).toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #333;">
              <td colspan="4" style="text-align: right; font-weight: bold; font-size: 18px;">Total Amount:</td>
              <td style="font-weight: bold; font-size: 18px;">₹${((typeof totalAmount ===
              "string"
                ? parseFloat(totalAmount)
                : totalAmount || 0) + Number(shippingCharge || 0)).toFixed(2)}</td>
            </tr>
            `
                : `
            <tr style="border-top: 2px solid #333;">
              <td colspan="4" style="text-align: right; font-weight: bold; font-size: 18px;">Total Amount:</td>
              <td style="font-weight: bold; font-size: 18px;">₹${(typeof totalAmount ===
              "string"
                ? parseFloat(totalAmount)
                : totalAmount || 0
              ).toFixed(2)}</td>
            </tr>
            `
            }
          </tbody>
        </table>

        <div class="total-section">
          <div class="total-amount">Total Amount Payable: ₹${((typeof totalAmount ===
          "string"
            ? parseFloat(totalAmount)
            : totalAmount || 0) + Number(shippingCharge || 0)).toFixed(2)}</div>
        </div>
        <div class="footer">
          <div class="thank-you">Thank you for your purchase!</div>
          ${
            trackingId && trackingId.trim() !== ""
              ? `<p style="font-size: 14px; color: #333; font-weight: bold;">Tracking ID: ${trackingId}</p>`
              : ""
          }
          <p>Visit us again for more amazing collections</p>
          ${
            sellType === "HALL_SELL_ONLINE" || sellType === "HALL_SELL_OFFLINE"
              ? '<p style="font-size: 12px; color: #666; font-style: italic;">* Products are grouped by code and price for hall sale convenience</p>'
              : ""
          }
          <p style="font-size: 12px; color: #999;">
            This is a computer generated invoice. For any queries, please contact us.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const generateAddressInfoHtml = ({orderId,date,quantity,group,name,address,mobileNo}:{
  orderId: string;
  date: string;
  quantity: number;
  group: string;
  name: string;
  address: string;
  mobileNo: string;
}) => {
  return  `
  <div class="ship-label">
    <div class="row title">
      <span>Order ID:</span>
      <strong>${orderId}</strong>
    </div>

    <div class="grid">
      <div><span>Date:</span> <strong>${date}</strong></div>
      <div><span>Quantity:</span> <strong>${quantity}</strong></div>
    </div>

    <div class="row">
      <span>Code Name:</span>
      <strong>${group}</strong>
    </div>

    <div class="section">
      <div class="section-title">Shipping Address:</div>
      <div class="addr-line"><span>Name -</span> <strong>${name}</strong></div>
      <div class="addr-line"><span>Mo. no. -</span> <strong>${mobileNo}</strong></div>
      <div class="addr-block">${address}</div>
    </div>

    <!-- Optional QR: place an <img class="qr" src="data:image/png;base64,..." /> here -->
  </div>

  <style>
    .ship-label{
      width: 80mm;               /* good for thermal/label printers */
      max-width: 360px;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 14px;
      line-height: 1.35;
      color: #000;
      padding: 10px 12px;
      box-sizing: border-box;
      border: 1px solid #000;
      border-radius: 4px;
    }
    .row{ display:flex; gap:6px; margin: 6px 0; align-items: baseline; }
    .title{ font-size: 18px; margin-top: 2px; }
    .grid{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      margin: 6px 0;
    }
    .section{ margin-top: 8px; }
    .section-title{
      font-weight: 700;
      margin-bottom: 4px;
      border-top: 1px dashed #000;
      padding-top: 6px;
    }
    .addr-line{ margin: 2px 0; }
    .addr-block{
      margin-top: 4px;
      white-space: pre-wrap;   /* keeps your line breaks */
    }
    .qr{
      display:block;
      margin: 10px auto 0;
      width: 120px;
      height: 120px;
      object-fit: contain;
    }

    /* Print tweaks */
    @media print{
      .ship-label{ border: none; padding: 0; width: 80mm; }
      @page{ margin: 6mm; }
    }
    span{ opacity: 0.9; }
  </style>
  `;
};