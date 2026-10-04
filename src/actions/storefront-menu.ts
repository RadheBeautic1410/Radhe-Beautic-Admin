"use server"

import { UserRole } from "@prisma/client";
import { db } from "@/src/lib/db";
import { currentRole } from "@/src/lib/auth";

// Customer storefront top menu (StorefrontMenuItem). Only one level of nesting:
// top-level items, each with an optional dropdown of children.

export type MenuItemInput = {
  label: string;
  parentId?: string | null;
  categoryCodes?: string[];
  href?: string | null;
  isActive?: boolean;
};

async function requireAdmin() {
  const role = await currentRole();
  if (role !== UserRole.ADMIN) throw new Error("Unauthorized");
}

function clean(input: MenuItemInput) {
  const label = input.label?.trim();
  if (!label) throw new Error("Label is required");
  return {
    label,
    parentId: input.parentId || null,
    categoryCodes: Array.from(new Set((input.categoryCodes || []).map((c) => c.trim()).filter(Boolean))),
    href: input.href?.trim() || null,
    isActive: input.isActive ?? true,
  };
}

async function assertValidParent(parentId: string | null, selfId?: string) {
  if (!parentId) return;
  if (parentId === selfId) throw new Error("An item can't be its own parent");
  const parent = await db.storefrontMenuItem.findUnique({ where: { id: parentId }, select: { parentId: true } });
  if (!parent) throw new Error("Parent menu item not found");
  if (parent.parentId) throw new Error("Dropdown items can't have their own dropdown");
  if (selfId) {
    const children = await db.storefrontMenuItem.count({ where: { parentId: selfId } });
    if (children > 0) throw new Error("This item has a dropdown, so it can't be moved under another item");
  }
}

export async function getStorefrontMenuAdmin() {
  await requireAdmin();
  const [items, categories] = await Promise.all([
    db.storefrontMenuItem.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    db.category.findMany({
      where: { isDeleted: false, code: { not: null } },
      select: { code: true, name: true, isVisibleForCustomer: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { items, categories };
}

export async function createStorefrontMenuItem(input: MenuItemInput) {
  try {
    await requireAdmin();
    const data = clean(input);
    await assertValidParent(data.parentId);
    const last = await db.storefrontMenuItem.findFirst({
      where: { parentId: data.parentId },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    await db.storefrontMenuItem.create({ data: { ...data, order: (last?.order ?? -1) + 1 } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add menu item" };
  }
}

export async function updateStorefrontMenuItem(id: string, input: MenuItemInput) {
  try {
    await requireAdmin();
    const data = clean(input);
    await assertValidParent(data.parentId, id);
    const current = await db.storefrontMenuItem.findUnique({ where: { id }, select: { parentId: true } });
    if (!current) throw new Error("Menu item not found");

    let order: number | undefined;
    if ((current.parentId || null) !== data.parentId) {
      // Moved to another level: append at the end there
      const last = await db.storefrontMenuItem.findFirst({
        where: { parentId: data.parentId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? -1) + 1;
    }
    await db.storefrontMenuItem.update({ where: { id }, data: { ...data, ...(order !== undefined && { order }) } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update menu item" };
  }
}

/** Deletes the item and its dropdown children. */
export async function deleteStorefrontMenuItem(id: string) {
  try {
    await requireAdmin();
    await db.storefrontMenuItem.deleteMany({ where: { OR: [{ id }, { parentId: id }] } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete menu item" };
  }
}

/** Swap with the neighbour above/below within the same level. */
export async function moveStorefrontMenuItem(id: string, direction: "up" | "down") {
  try {
    await requireAdmin();
    const item = await db.storefrontMenuItem.findUnique({ where: { id } });
    if (!item) throw new Error("Menu item not found");

    const siblings = await db.storefrontMenuItem.findMany({
      where: { parentId: item.parentId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const index = siblings.findIndex((s) => s.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= siblings.length) return { success: true };

    [siblings[index], siblings[target]] = [siblings[target], siblings[index]];
    // Renumber the whole level so legacy/duplicate order values can't stick
    await db.$transaction(
      siblings.map((s, i) => db.storefrontMenuItem.update({ where: { id: s.id }, data: { order: i } }))
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to reorder menu item" };
  }
}
