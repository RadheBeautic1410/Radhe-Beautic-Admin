import axios from "axios";

export interface BarcodeRow {
  size: string;
  quantity: number;
}

/**
 * Order the labels round by round (M, L, M, L ...) instead of all of one size
 * and then all of the next. One entry per label.
 */
export const interleaveBarcodeRows = (rows: BarcodeRow[]): BarcodeRow[] => {
  const withQty = rows
    .map((r) => ({ size: r.size, quantity: Number(r.quantity) || 0 }))
    .filter((r) => r.quantity > 0);
  const out: BarcodeRow[] = [];
  const maxQty = Math.max(0, ...withQty.map((r) => r.quantity));
  for (let round = 0; round < maxQty; round++) {
    for (const r of withQty) {
      if (round < r.quantity) out.push({ size: r.size, quantity: 1 });
    }
  }
  return out;
};

/**
 * Generate the barcode PDF for `rows` (M, L, M, L order) and save it in the
 * browser. Returns false, without a request, when there is nothing to print.
 */
export const downloadBarcodePdf = async (code: string, rows: BarcodeRow[]): Promise<boolean> => {
  const toPrint = interleaveBarcodeRows(rows);
  if (toPrint.length === 0) return false;

  const res = await axios.get(
    `${process.env.NEXT_PUBLIC_SERVER_URL}/generate-pdf2?data=${JSON.stringify(toPrint)}&id=${code}`,
    { responseType: "blob" }
  );
  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${code}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
  return true;
};
