import fs from "node:fs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { readXlsx } from "@/src/app/(protected)/contacts/_components/xlsx";
import { tableToContacts } from "@/src/app/(protected)/contacts/_components/csv";

const workbook = async () => {
  const zip = new JSZip();
  zip.file(
    "xl/workbook.xml",
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contacts" sheetId="1" r:id="rId1"/></sheets></workbook>'
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'
  );
  zip.file(
    "xl/sharedStrings.xml",
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Name</t></si><si><t>Mobile Number</t></si><si><t>Ravi</t></si><si><r><t>Shop</t></r><r><t> 1</t></r></si></sst>'
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
      '<row r="1"><c r="F1" t="inlineStr"><is><t>Selected: 0</t></is></c></row>' +
      '<row r="2"><c r="B2" t="s"><v>0</v></c><c r="C2" t="s"><v>1</v></c><c r="D2" t="inlineStr"><is><t>Organization</t></is></c></row>' +
      '<row r="3"><c r="B3" t="s"><v>2</v></c><c r="C3"><v>9.19316805311E+11</v></c><c r="D3" t="s"><v>3</v></c></row>' +
      "</sheetData></worksheet>"
  );
  return zip.generateAsync({ type: "arraybuffer" });
};

describe("contacts Excel import", () => {
  it("reads the first sheet, shared strings and numbers stored as 9.2E+11", async () => {
    const table = await readXlsx(await workbook());
    expect(table[2]).toEqual(["", "Ravi", "919316805311", "Shop 1"]);
    expect(tableToContacts(table).rows).toEqual([{ name: "Ravi", organization: "Shop 1", phones: ["919316805311"] }]);
  });

  // One-off check against a real file: CONTACTS_XLSX=path npx vitest run contacts-xlsx
  it.runIf(!!process.env.CONTACTS_XLSX)("reads a real export", async () => {
    const buf = fs.readFileSync(process.env.CONTACTS_XLSX!);
    const { rows, error } = tableToContacts(await readXlsx(buf));
    console.log({ error, rows: rows.length, withPhone: rows.filter((r) => r.phones.length).length, sample: rows.slice(100, 102) });
    expect(error).toBeUndefined();
  }, 120_000);
});
