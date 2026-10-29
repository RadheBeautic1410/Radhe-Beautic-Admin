import { describe, expect, it } from "vitest";
import { formatPhone, phoneKey, splitPhones } from "@/src/lib/phone-contacts";
import { csvToContacts, parseCsv, toCsv } from "@/src/app/(protected)/contacts/_components/csv";

describe("phone numbers", () => {
  it("treats +91 / 0 / spaced variants as one number", () => {
    for (const p of ["+91 93168 05311", "09316805311", "9316805311", "919316805311"]) {
      expect(formatPhone(p)).toBe("+919316805311");
      expect(phoneKey(p)).toBe("9316805311");
    }
  });

  it("keeps foreign numbers as digits", () => {
    expect(formatPhone("+1 (415) 555-0100")).toBe("+14155550100");
  });

  it("splits Google's ::: lists and drops junk", () => {
    expect(splitPhones("+919316805311 ::: 98250 12345, x")).toEqual(["+919316805311", "98250 12345"]);
  });
});

describe("contacts CSV", () => {
  it("parses quoted cells with commas, quotes and line breaks", () => {
    expect(parseCsv('a,"b, c","say ""hi""\nthere"\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'say "hi"\nthere'],
      ["1", "2", "3"],
    ]);
  });

  it("reads a Google Contacts export", () => {
    const csv = [
      "First Name,Middle Name,Last Name,File As,Organization Name,Phone 1 - Label,Phone 1 - Value,Phone 2 - Label,Phone 2 - Value",
      'Pis,,Vali,,Naik Enterprise,Mobile,"+917818829955 ::: +919000000001",Work,',
      ",,,,Sharanz,Mobile,+917305238865,,",
      "No,,Number,,,,,,",
    ].join("\n");
    const { rows, error } = csvToContacts(csv);
    expect(error).toBeUndefined();
    expect(rows[0]).toEqual({ name: "Pis Vali", organization: "Naik Enterprise", phones: ["+917818829955", "+919000000001"] });
    expect(rows[1].name).toBe("Sharanz");
    expect(rows[2].phones).toEqual([]);
  });

  it("reads the simple Name / Mobile Number / Organization sheet", () => {
    const { rows } = csvToContacts("Name,Mobile Number,Organization\nRavi,\"+919316805311, +919316805312\",Shop");
    expect(rows).toEqual([{ name: "Ravi", organization: "Shop", phones: ["+919316805311", "+919316805312"] }]);
  });

  it("finds the header below a title row (sheet saved from Excel)", () => {
    const { rows } = csvToContacts(",,,,,Selected: 0\nSelect,Name,Mobile Number,Organization\n☐,Ravi,+919316805311,");
    expect(rows).toEqual([{ name: "Ravi", organization: "", phones: ["+919316805311"] }]);
  });

  it("export round-trips through the parser", () => {
    const text = toCsv([["Name", "Notes"], ['A "B"', "x,y"]]);
    expect(parseCsv(text)).toEqual([["Name", "Notes"], ['A "B"', "x,y"]]);
  });
});
