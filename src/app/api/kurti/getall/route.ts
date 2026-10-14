export const dynamic = "force-dynamic";

import { getAllKurti, getAllKurtiByTime } from "@/src/data/kurti";
import { db } from "@/src/lib/db";
import { KURTI_LIST_SELECT } from "@/src/lib/kurti-select";
import { availableStock, clampPaging, rankByAvailableStock } from "@/src/lib/kurti-search";
import { NextResponse, NextRequest } from "next/server";
import { PRODUCT_READ_PERMISSIONS } from "@/src/lib/permissions/registry";
import { apiPermission } from "@/src/lib/permissions/server";

export async function GET(req: NextRequest) {
  const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
  if (guard.response) return guard.response;
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit, skip } = clampPaging(searchParams.get("page"), searchParams.get("limit"));

    const search = searchParams.get("search")?.trim() ?? "";

    let where: any = { isDeleted: false };
    if (search) {
      where.code = { contains: search, mode: "insensitive" };
    }

    let kurtis;
    let totalCount;

    if (search) {
      // Results are ordered by available stock across ALL matches, so every match is
      // still ranked - but only from its sizes. The full documents are then loaded
      // for the requested page alone.
      const matches = await db.kurti.findMany({
        where,
        select: { id: true, sizes: true, reservedSizes: true },
      });
      const ranked = rankByAvailableStock(matches);
      totalCount = ranked.length;

      const pageIds = ranked.slice(skip, skip + limit).map((r) => r.id);
      const docs = pageIds.length
        ? await db.kurti.findMany({
            where: { id: { in: pageIds } },
            select: KURTI_LIST_SELECT,
          })
        : [];
      const byId = new Map(docs.map((d) => [d.id, d]));
      kurtis = pageIds
        .map((id) => byId.get(id))
        .filter((k): k is NonNullable<typeof k> => !!k)
        .map((kurti) => ({ ...kurti, countOfPiece: availableStock(kurti) }));
    } else {
      // Normal database paginated query
      const [fetchedKurtis, count] = await Promise.all([
        db.kurti.findMany({
          where,
          select: KURTI_LIST_SELECT,
          skip,
          take: limit,
        }),
        db.kurti.count({ where }),
      ]);

      kurtis = fetchedKurtis.map((kurti) => ({
        ...kurti,
        countOfPiece: availableStock(kurti),
      }));
      totalCount = count;
    }

    return NextResponse.json({
      data: kurtis,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err: any) {
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}



export async function POST(request: NextRequest) {
  const guard = await apiPermission(PRODUCT_READ_PERMISSIONS);
  if (guard.response) return guard.response;
  try {
    let { currentTime } = await request.json();
    console.log(currentTime);
    const data = await getAllKurtiByTime(currentTime);
    console.log("data", data?.length);
    return new NextResponse(JSON.stringify({ data }), {
      status: 200,
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 404,
    });
  }
}
