"use server"

import { UserRole } from "@prisma/client";
import { db } from "@/src/lib/db";
import { currentRole } from "@/src/lib/auth";

// Customer "Watch & Shop" reels (Reel). Each reel is a YouTube Short plus the kurtis and
// categories it shows; the customer reel page lists kurtiCodes first, then the categories.

export type ReelInput = {
  title: string;
  youtubeUrl: string;
  kurtiCodes?: string[];
  categoryCodes?: string[];
  isActive?: boolean;
};

async function requireAdmin() {
  const role = await currentRole();
  if (role !== UserRole.ADMIN) throw new Error("Unauthorized");
}

/** Pulls the 11-char video id out of a shorts / watch / youtu.be / embed link (or a bare id). */
function parseYoutubeId(raw: string): string | null {
  const value = raw.trim();
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const host = url.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.split("/")[1] || null;
    } else if (host === "youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const [, kind, vid] = url.pathname.split("/");
        if (["shorts", "embed", "live", "v"].includes(kind)) id = vid || null;
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function clean(input: ReelInput) {
  const title = input.title?.trim();
  if (!title) throw new Error("Title is required");
  const youtubeUrl = input.youtubeUrl?.trim();
  const videoId = youtubeUrl ? parseYoutubeId(youtubeUrl) : null;
  if (!videoId) throw new Error("That doesn't look like a YouTube link");
  const uniq = (list?: string[]) =>
    Array.from(new Set((list || []).map((c) => c.trim()).filter(Boolean)));
  const kurtiCodes = uniq(input.kurtiCodes);
  const categoryCodes = uniq(input.categoryCodes);
  if (kurtiCodes.length === 0 && categoryCodes.length === 0) {
    throw new Error("Pick at least one kurti or one category for this reel");
  }
  return { title, youtubeUrl, videoId, kurtiCodes, categoryCodes, isActive: input.isActive ?? true };
}

export type KurtiPick = { code: string; category: string; image: string | null };

function toPick(k: { code: string; category: string; images: unknown[] }): KurtiPick {
  const first = (k.images as any[]).find((img) => img && !img.is_hidden && img.url);
  return { code: k.code, category: k.category, image: first?.url ?? null };
}

export async function getReelsAdmin() {
  await requireAdmin();
  const [reels, categories] = await Promise.all([
    db.reel.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] }),
    db.category.findMany({
      where: { isDeleted: false, code: { not: null } },
      select: { code: true, name: true, isVisibleForCustomer: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const usedCodes = Array.from(new Set(reels.flatMap((r) => r.kurtiCodes)));
  const kurtis = usedCodes.length
    ? await db.kurti.findMany({
        where: { code: { in: usedCodes } },
        select: { code: true, category: true, images: true },
      })
    : [];
  return { reels, categories, kurtis: kurtis.map(toPick) };
}

/** Search kurtis by code or category for the reel picker. */
export async function searchKurtisForReel(query: string): Promise<KurtiPick[]> {
  await requireAdmin();
  const q = query.trim();
  if (!q) return [];
  const kurtis = await db.kurti.findMany({
    where: {
      isDeleted: false,
      OR: [
        { code: { contains: q, mode: "insensitive" } },
        { category: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { code: true, category: true, images: true },
    orderBy: { lastUpdatedTime: "desc" },
    take: 24,
  });
  return kurtis.map(toPick);
}

export async function createReel(input: ReelInput) {
  try {
    await requireAdmin();
    const data = clean(input);
    const last = await db.reel.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    await db.reel.create({ data: { ...data, order: (last?.order ?? -1) + 1 } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add reel" };
  }
}

export async function updateReel(id: string, input: ReelInput) {
  try {
    await requireAdmin();
    await db.reel.update({ where: { id }, data: clean(input) });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update reel" };
  }
}

export async function deleteReel(id: string) {
  try {
    await requireAdmin();
    await db.reel.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete reel" };
  }
}

/** Swap with the neighbour above/below. */
export async function moveReel(id: string, direction: "up" | "down") {
  try {
    await requireAdmin();
    const all = await db.reel.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const index = all.findIndex((r) => r.id === id);
    const target = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= all.length) return { success: true };

    [all[index], all[target]] = [all[target], all[index]];
    // Renumber everything so legacy/duplicate order values can't stick
    await db.$transaction(all.map((r, i) => db.reel.update({ where: { id: r.id }, data: { order: i } })));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to reorder reel" };
  }
}
