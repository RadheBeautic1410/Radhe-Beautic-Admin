import { db } from "@/src/lib/db";

export async function POST(req: Request) {
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
      return new Response(JSON.stringify({ error: "Party already exists" }), { status: 409 });
    }

    const newParty = await db.party.create({
      data: { name, normalizedLowerCase }, // Removed type
    });

    return Response.json({ data: newParty });
  } catch (err: any) {
    console.error("Create Party Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to create party" }), {
      status: 500,
    });
  }
}
