// Shared by the Phone Contacts page and its server actions (src/actions/phone-contact.ts).

/** Groups offered by default; any other name typed on the page is kept as its own group. */
export const DEFAULT_CONTACT_GROUPS = [
  "Customer",
  "Reseller",
  "Business",
  "Supplier",
  "Friend",
  "Relative",
  "Staff",
  "Other",
];

/** Filter value for contacts that have no group yet. */
export const NO_GROUP = "__none";

const digitsOf = (raw: string) => String(raw ?? "").replace(/\D/g, "");

/**
 * "+91 93168 05311", "09316805311" and "9316805311" all become "+919316805311".
 * Numbers that are not Indian mobiles keep their digits (with a leading + if they had one).
 */
export const formatPhone = (raw: string): string => {
  const d = digitsOf(raw);
  if (d.length === 10) return `+91${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`;
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  return String(raw ?? "").trim().startsWith("+") ? `+${d}` : d;
};

/** What makes two numbers the same contact: the last 10 digits. */
export const phoneKey = (raw: string): string => {
  const d = digitsOf(raw);
  return d.length >= 10 ? d.slice(-10) : d;
};

export const isValidPhone = (raw: string) => digitsOf(raw).length >= 6;

/** Splits a cell like "+91 98..., 98..." or Google's "a ::: b" into separate numbers. */
export const splitPhones = (raw: string): string[] =>
  String(raw ?? "")
    .split(/:::|,|;|\//)
    .map((p) => p.trim())
    .filter(isValidPhone);
