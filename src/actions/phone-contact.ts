"use server";

import { db } from "@/src/lib/db";
import { permissionError } from "@/src/lib/permissions/server";
import { NO_GROUP, formatPhone, isValidPhone, phoneKey } from "@/src/lib/phone-contacts";

// The admin's phone book (Google Contacts export), sorted into groups such as
// friend / customer / relative. One row per person, matched on the main number.

export type ContactFilter = {
  search?: string;
  /** "" = all groups, NO_GROUP = contacts without a group, otherwise a group name. */
  group?: string;
};

/** Bulk actions work on ticked rows, or on every contact the current filter shows. */
export type ContactTarget = { ids: string[] } | { filter: ContactFilter };

export type ContactInput = {
  name: string;
  phone: string;
  otherPhones?: string[];
  organization?: string;
  group?: string | null;
  notes?: string | null;
};

export type ImportRow = {
  name: string;
  phones: string[];
  organization?: string;
};

const PAGE_SIZE_MAX = 200;
const IMPORT_BATCH_MAX = 1000;

const cleanGroup = (g?: string | null) => (g ?? "").trim().replace(/\s+/g, " ") || null;

const buildWhere = (filter: ContactFilter = {}) => {
  const and: any[] = [];
  const group = filter.group ?? "";
  if (group === NO_GROUP) and.push({ OR: [{ group: null }, { group: { isSet: false } }] });
  else if (group) and.push({ group });

  const search = (filter.search ?? "").trim();
  if (search) {
    const or: any[] = [
      { name: { contains: search, mode: "insensitive" } },
      { organization: { contains: search, mode: "insensitive" } },
    ];
    const digits = search.replace(/\D/g, "");
    if (digits.length >= 3) {
      or.push({ phoneKey: { contains: digits.length > 10 ? digits.slice(-10) : digits } });
      or.push({ otherPhones: { has: formatPhone(digits) } });
    }
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
};

const targetWhere = (target: ContactTarget) =>
  "ids" in target ? { id: { in: target.ids.filter(Boolean) } } : buildWhere(target.filter);

const cleanInput = (input: ContactInput) => {
  const phone = String(input.phone ?? "").trim();
  if (!isValidPhone(phone)) return { error: "Enter a valid mobile number" };
  const key = phoneKey(phone);
  const otherPhones = Array.from(
    new Set(
      (input.otherPhones ?? [])
        .filter(isValidPhone)
        .filter((p) => phoneKey(p) !== key)
        .map(formatPhone)
    )
  );
  return {
    data: {
      name: String(input.name ?? "").trim(),
      phone: formatPhone(phone),
      phoneKey: key,
      otherPhones,
      organization: String(input.organization ?? "").trim(),
      group: cleanGroup(input.group),
      notes: input.notes?.trim() || null,
    },
  };
};

export const getContacts = async (filter: ContactFilter = {}, page = 1, pageSize = 50) => {
  const denied = await permissionError("contacts.view");
  if (denied) return { error: denied.error };

  const take = Math.min(Math.max(1, Math.floor(pageSize)), PAGE_SIZE_MAX);
  const skip = (Math.max(1, Math.floor(page)) - 1) * take;
  const where = buildWhere(filter);

  const [contacts, total, grouped, all] = await Promise.all([
    db.phoneContact.findMany({ where, orderBy: [{ name: "asc" }, { phone: "asc" }], skip, take }),
    db.phoneContact.count({ where }),
    db.phoneContact.groupBy({ by: ["group"], _count: { _all: true } }),
    db.phoneContact.count(),
  ]);

  // Counts per group for the filter chips (ignoring the search box and group filter).
  const groupCounts: Record<string, number> = {};
  for (const g of grouped) {
    const key = g.group || NO_GROUP;
    groupCounts[key] = (groupCounts[key] ?? 0) + g._count._all;
  }
  return { contacts, total, groupCounts, all };
};

export const saveContact = async (id: string | null, input: ContactInput) => {
  const denied = await permissionError(id ? "contacts.edit" : "contacts.create");
  if (denied) return { error: denied.error };
  const checked = cleanInput(input);
  if ("error" in checked) return { error: checked.error };
  try {
    const clash = await db.phoneContact.findUnique({ where: { phoneKey: checked.data.phoneKey } });
    if (clash && clash.id !== id) {
      return { error: `${checked.data.phone} is already saved as "${clash.name || "no name"}"` };
    }
    const contact = id
      ? await db.phoneContact.update({ where: { id }, data: checked.data })
      : await db.phoneContact.create({ data: checked.data });
    return { success: id ? "Contact updated" : "Contact added", contact };
  } catch (error: any) {
    console.error("Error saving phone contact:", error);
    return { error: error.message || "Failed to save contact" };
  }
};

/** Puts the target contacts in `group` (null removes their group). */
export const setContactsGroup = async (target: ContactTarget, group: string | null) => {
  const denied = await permissionError("contacts.edit");
  if (denied) return { error: denied.error };
  try {
    const res = await db.phoneContact.updateMany({ where: targetWhere(target), data: { group: cleanGroup(group) } });
    return { success: `${res.count} contact(s) updated`, count: res.count };
  } catch (error: any) {
    console.error("Error setting contact group:", error);
    return { error: error.message || "Failed to update contacts" };
  }
};

export const deleteContacts = async (target: ContactTarget) => {
  const denied = await permissionError("contacts.delete");
  if (denied) return { error: denied.error };
  try {
    const res = await db.phoneContact.deleteMany({ where: targetWhere(target) });
    return { success: `${res.count} contact(s) deleted`, count: res.count };
  } catch (error: any) {
    console.error("Error deleting contacts:", error);
    return { error: error.message || "Failed to delete contacts" };
  }
};

/**
 * Adds contacts whose main number is not saved yet; numbers already in the phone
 * book are skipped so a re-import never overwrites groups set on the page.
 * The page sends the file in batches of up to IMPORT_BATCH_MAX rows.
 */
export const importContacts = async (rows: ImportRow[]) => {
  const denied = await permissionError("contacts.create");
  if (denied) return { error: denied.error };
  if (!Array.isArray(rows) || rows.length > IMPORT_BATCH_MAX) return { error: "Send at most 1000 rows at a time" };

  type Clean = Extract<ReturnType<typeof cleanInput>, { data: unknown }>["data"];
  const fresh = new Map<string, Clean>();
  let invalid = 0;
  for (const r of rows) {
    const [phone, ...otherPhones] = (r.phones ?? []).filter(isValidPhone);
    if (!phone) {
      invalid++;
      continue;
    }
    const checked = cleanInput({ name: r.name, phone, otherPhones, organization: r.organization });
    if ("error" in checked) {
      invalid++;
      continue;
    }
    if (!fresh.has(checked.data.phoneKey)) fresh.set(checked.data.phoneKey, checked.data);
  }

  try {
    const existing = await db.phoneContact.findMany({
      where: { phoneKey: { in: Array.from(fresh.keys()) } },
      select: { phoneKey: true },
    });
    existing.forEach((e) => fresh.delete(e.phoneKey));
    const data = Array.from(fresh.values());
    if (data.length) await db.phoneContact.createMany({ data });
    return { added: data.length, skipped: rows.length - data.length - invalid, invalid };
  } catch (error: any) {
    console.error("Error importing contacts:", error);
    return { error: error.message || "Failed to import contacts" };
  }
};

/** Every contact matching the filter, for the CSV download. */
export const exportContacts = async (filter: ContactFilter = {}) => {
  const denied = await permissionError("contacts.export");
  if (denied) return { error: denied.error };
  const contacts = await db.phoneContact.findMany({
    where: buildWhere(filter),
    orderBy: [{ name: "asc" }, { phone: "asc" }],
    select: { name: true, phone: true, otherPhones: true, organization: true, group: true, notes: true },
  });
  return { contacts };
};
