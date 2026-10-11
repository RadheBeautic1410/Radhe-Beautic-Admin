import { db } from "@/src/lib/db";
import { apiPermission } from "@/src/lib/permissions/server";

export async function POST(req: Request) {
  const guard = await apiPermission(["upload.create","catalogue.manageCategories"]);
  if (guard.response) return guard.response;
  try {
    const { name } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400 });
    }

    const normalizedLowerCase = name.toLowerCase().replace(/\s+/g, "");

    const existing = await db.party.findUnique({
      where: { normalizedLowerCase },
    });

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Party already exists" }),
        { status: 409 }
      );
    }

    const newParty = await db.party.create({
      data: {
        name,
        normalizedLowerCase,
      },
    });

    return Response.json({ data: newParty });
  } catch (err: any) {
    console.error("Failed to create party:", err);
    return new Response(
      JSON.stringify({ error: "Failed to create party" }),
      { status: 500 }
    );
  }
}
