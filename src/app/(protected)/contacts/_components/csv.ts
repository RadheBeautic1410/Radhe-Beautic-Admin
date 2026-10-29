import type { ImportRow } from "@/src/actions/phone-contact"
import { splitPhones } from "@/src/lib/phone-contacts"

/** RFC 4180 parsing: quoted cells may hold commas, quotes ("") and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ",") {
      row.push(cell)
      cell = ""
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += ch
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => c.trim()))
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "")
const PHONE_HEADERS = ["mobilenumber", "mobile", "phone", "phonenumber", "number"]

export const csvToContacts = (text: string) => tableToContacts(parseCsv(text))

/**
 * Reads either a Google Contacts export (First Name, Phone 1 - Value, ...) or a
 * simple sheet with Name / Mobile Number / Organization columns (CSV or Excel rows).
 */
export function tableToContacts(table: string[][]): { rows: ImportRow[]; error?: string } {
  const all = table.filter((r) => r.some((c) => (c ?? "").trim()))
  if (!all.length) return { rows: [], error: "The file is empty" }
  const phoneColsOf = (h: string[]) =>
    h
      .map((name, i) => ({ name, i }))
      .filter(({ name }) => /^phone\d+value$/.test(name) || PHONE_HEADERS.includes(name))
      .map(({ i }) => i)

  // The header may sit below a title / button row (e.g. a sheet saved from Excel).
  const headerAt = all.slice(0, 5).findIndex((r) => phoneColsOf(r.map(norm)).length > 0)
  if (headerAt < 0) return { rows: [], error: "No phone / mobile number column found in the file" }
  const h = all[headerAt].map(norm)
  const body = all.slice(headerAt + 1)
  const phoneCols = phoneColsOf(h)
  const col = (...names: string[]) => names.map((n) => h.indexOf(norm(n))).find((i) => i >= 0) ?? -1
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "")

  const first = col("First Name")
  const middle = col("Middle Name")
  const last = col("Last Name")
  const name = col("Name", "Full Name")
  const fileAs = col("File As")
  const nick = col("Nickname")
  const org = col("Organization Name", "Organization", "Organisation", "Company")

  const rows = body.map((r) => {
    const organization = at(r, org)
    const fullName =
      at(r, name) ||
      [at(r, first), at(r, middle), at(r, last)].filter(Boolean).join(" ") ||
      at(r, fileAs) ||
      at(r, nick) ||
      organization
    return { name: fullName, organization, phones: phoneCols.flatMap((i) => splitPhones(at(r, i))) }
  })
  return { rows }
}

const cellOut = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export function toCsv(rows: string[][]): string {
  return "﻿" + rows.map((r) => r.map((c) => cellOut(c ?? "")).join(",")).join("\r\n")
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
