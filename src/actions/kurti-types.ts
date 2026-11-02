"use server";

import { db } from "@/src/lib/db";
import { currentUser } from "@/src/lib/auth";
import { permissionError } from "@/src/lib/permissions/server";
import {
  BUILT_IN_KURTI_TYPES,
  builtInImage,
  kurtiTypeKeyFromName,
} from "@/src/lib/kurti-types";

export interface KurtiTypeNames {
  name: string;
  nameHi?: string;
  nameGu?: string;
}

const cleanNames = (names: KurtiTypeNames) => ({
  name: names.name.trim(),
  nameHi: names.nameHi?.trim() || null,
  nameGu: names.nameGu?.trim() || null,
});

/**
 * Fills an empty table from the built-in list, carrying over pictures already
 * uploaded to the old KurtiTypeImage table. Upserts, so two requests racing on
 * first use cannot create duplicates.
 */
const ensureSeeded = async () => {
  if ((await db.kurtiType.count()) > 0) return;
  const pictures = await db.kurtiTypeImage.findMany();
  await Promise.all(
    BUILT_IN_KURTI_TYPES.map((t, sortOrder) => {
      const picture = pictures.find((p) => p.key === t.key);
      const data = {
        key: t.key,
        name: t.name,
        nameHi: t.nameHi,
        nameGu: t.nameGu,
        imageUrl: picture?.imageUrl ?? null,
        imagePath: picture?.imagePath ?? null,
        isHidden: t.isHidden ?? false,
        sortOrder,
      };
      return db.kurtiType.upsert({ where: { key: t.key }, create: data, update: {} });
    })
  );
};

/** Names for the category forms and filters; every logged-in admin-panel user needs these. */
export async function getKurtiTypeOptions() {
  const user = await currentUser();
  if (!user) return [];
  try {
    await ensureSeeded();
    return await db.kurtiType.findMany({
      orderBy: { sortOrder: "asc" },
      select: { key: true, name: true, isHidden: true },
    });
  } catch (error) {
    console.error("Failed to get kurti type options:", error);
    return [];
  }
}

/** Everything the Kurti Types page shows, with how many active categories use each type. */
export async function getKurtiTypesForManage() {
  const denied = await permissionError("kurtiTypes.view");
  if (denied) return [];
  try {
    await ensureSeeded();
    const [types, usage] = await Promise.all([
      db.kurtiType.findMany({ orderBy: { sortOrder: "asc" } }),
      db.category.groupBy({
        by: ["kurtiType"],
        where: { isDeleted: false },
        _count: { _all: true },
      }),
    ]);
    const counts = new Map<string, number>();
    for (const row of usage) {
      if (!row.kurtiType) continue;
      const key = row.kurtiType.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + row._count._all);
    }
    return types.map((t) => ({
      ...t,
      defaultImage: builtInImage(t.key),
      categoryCount: counts.get(t.key.toLowerCase()) ?? 0,
    }));
  } catch (error) {
    console.error("Failed to get kurti types:", error);
    return [];
  }
}

export async function createKurtiType(
  names: KurtiTypeNames,
  image: { imageUrl: string; imagePath: string }
) {
  const denied = await permissionError("kurtiTypes.create");
  if (denied) return { success: false as const, error: denied.error };
  const data = cleanNames(names);
  if (!data.name) return { success: false as const, error: "Please enter a name." };
  try {
    const existing = await db.kurtiType.findMany({
      select: { key: true, name: true, sortOrder: true },
    });
    const lowerName = data.name.toLowerCase();
    if (existing.some((t) => t.name.toLowerCase() === lowerName)) {
      return { success: false as const, error: `"${data.name}" already exists.` };
    }

    // Names with no English letters (e.g. typed in Gujarati) still need a key.
    const base = kurtiTypeKeyFromName(data.name) || `type${Date.now().toString(36)}`;
    const taken = new Set(existing.map((t) => t.key.toLowerCase()));
    let key = base;
    for (let n = 2; taken.has(key.toLowerCase()); n++) key = `${base}${n}`;

    const sortOrder = Math.max(-1, ...existing.map((t) => t.sortOrder)) + 1;
    const kurtiType = await db.kurtiType.create({
      data: { ...data, ...image, key, sortOrder },
    });
    return { success: true as const, kurtiType };
  } catch (error) {
    console.error("Failed to create kurti type:", error);
    return { success: false as const, error: "Failed to create kurti type." };
  }
}

export async function updateKurtiTypeNames(id: string, names: KurtiTypeNames) {
  const denied = await permissionError("kurtiTypes.edit");
  if (denied) return { success: false as const, error: denied.error };
  const data = cleanNames(names);
  if (!data.name) return { success: false as const, error: "Please enter a name." };
  try {
    const clash = await db.kurtiType.findFirst({
      where: { id: { not: id }, name: { equals: data.name, mode: "insensitive" } },
      select: { id: true },
    });
    if (clash) return { success: false as const, error: `"${data.name}" already exists.` };
    await db.kurtiType.update({ where: { id }, data });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to rename kurti type:", error);
    return { success: false as const, error: "Failed to save kurti type." };
  }
}

export async function setKurtiTypeHidden(id: string, isHidden: boolean) {
  const denied = await permissionError("kurtiTypes.edit");
  if (denied) return { success: false as const, error: denied.error };
  try {
    await db.kurtiType.update({ where: { id }, data: { isHidden } });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to change kurti type visibility:", error);
    return { success: false as const, error: "Failed to save kurti type." };
  }
}

export async function setKurtiTypeImage(
  id: string,
  image: { imageUrl: string; imagePath: string }
) {
  const denied = await permissionError("kurtiTypes.edit");
  if (denied) return { success: false as const, error: denied.error };
  try {
    await db.kurtiType.update({ where: { id }, data: image });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to save kurti type picture:", error);
    return { success: false as const, error: "Failed to save picture." };
  }
}

/** Back to the built-in picture. Types added from admin have none, so they must keep theirs. */
export async function resetKurtiTypeImage(id: string) {
  const denied = await permissionError("kurtiTypes.delete");
  if (denied) return { success: false as const, error: denied.error };
  try {
    const type = await db.kurtiType.findUnique({ where: { id }, select: { key: true } });
    if (!type || !builtInImage(type.key)) {
      return { success: false as const, error: "This type has no default picture." };
    }
    await db.kurtiType.update({ where: { id }, data: { imageUrl: null, imagePath: null } });
    return { success: true as const };
  } catch (error) {
    console.error("Failed to reset kurti type picture:", error);
    return { success: false as const, error: "Failed to reset picture." };
  }
}

/** Refuses while an active category uses the type, since it would lose its type. */
export async function deleteKurtiType(id: string) {
  const denied = await permissionError("kurtiTypes.delete");
  if (denied) return { success: false as const, error: denied.error };
  try {
    const type = await db.kurtiType.findUnique({ where: { id } });
    if (!type) return { success: false as const, error: "This type no longer exists." };

    const usedBy = await db.category.count({
      where: {
        isDeleted: false,
        kurtiType: { equals: type.key, mode: "insensitive" },
      },
    });
    if (usedBy > 0) {
      return {
        success: false as const,
        error: `Used by ${usedBy} ${usedBy === 1 ? "category" : "categories"}. Move them to another type first, or hide this type.`,
      };
    }
    // An empty table would be refilled from the built-in list on the next read.
    if ((await db.kurtiType.count()) <= 1) {
      return { success: false as const, error: "At least one kurti type must remain." };
    }

    await db.kurtiType.delete({ where: { id } });
    return { success: true as const, imagePath: type.imagePath };
  } catch (error) {
    console.error("Failed to delete kurti type:", error);
    return { success: false as const, error: "Failed to delete kurti type." };
  }
}
