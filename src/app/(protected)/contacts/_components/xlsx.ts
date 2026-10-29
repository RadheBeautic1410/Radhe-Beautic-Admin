import JSZip from "jszip"

// Minimal .xlsx / .xlsm reader for the contacts import: the first sheet's cell
// text as rows of strings (no formulas, no dates, macros ignored).

const colIndex = (ref: string) => {
  const letters = ref.replace(/\d+$/, "")
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

const textOf = (el: Element | null | undefined) =>
  Array.from(el?.getElementsByTagName("t") ?? [])
    .map((t) => t.textContent ?? "")
    .join("")

/** A number Excel stored as 9.19316805311E+11 back to all its digits. */
const numberText = (v: string) => (/e/i.test(v) && isFinite(Number(v)) ? Number(v).toFixed(0) : v)

export async function readXlsx(data: Parameters<typeof JSZip.loadAsync>[0]): Promise<string[][]> {
  const zip = await JSZip.loadAsync(data)
  const xml = async (path: string) => {
    const file = zip.file(path)
    return file ? new DOMParser().parseFromString(await file.async("string"), "application/xml") : null
  }

  // First sheet in the workbook, via its relationship id.
  const workbook = await xml("xl/workbook.xml")
  const rels = await xml("xl/_rels/workbook.xml.rels")
  const sheetEl = workbook?.getElementsByTagName("sheet")[0]
  const rid = sheetEl?.getAttribute("r:id") ?? sheetEl?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id")
  const target = Array.from(rels?.getElementsByTagName("Relationship") ?? [])
    .find((r) => r.getAttribute("Id") === rid)
    ?.getAttribute("Target")
  const sheetPath = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target}`) : "xl/worksheets/sheet1.xml"

  const shared = Array.from((await xml("xl/sharedStrings.xml"))?.getElementsByTagName("si") ?? []).map(textOf)
  const sheet = await xml(sheetPath)
  if (!sheet) throw new Error("Could not read the first sheet of the Excel file")

  return Array.from(sheet.getElementsByTagName("row")).map((row) => {
    const out: string[] = []
    Array.from(row.getElementsByTagName("c")).forEach((c, i) => {
      const ref = c.getAttribute("r")
      const at = ref ? colIndex(ref) : i
      const type = c.getAttribute("t")
      const v = c.getElementsByTagName("v")[0]?.textContent ?? ""
      out[at] =
        type === "s" ? shared[Number(v)] ?? "" : type === "inlineStr" ? textOf(c) : type === "str" || type === "b" ? v : numberText(v)
    })
    return Array.from(out, (x) => x ?? "")
  })
}
