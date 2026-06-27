import { db } from "@/src/lib/db";

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "Color name is required" }), { status: 400 });
    }

    const normalizedLowerCase = name.trim().toLowerCase().replace(/\s+/g, "");

    const existing = await db.color.findUnique({
      where: { normalizedLowerCase },
    });

    if (existing) {
      return new Response(JSON.stringify({ error: "Color already exists" }), { status: 409 });
    }

    const newColor = await db.color.create({
      data: { name: name.trim(), normalizedLowerCase },
    });

    return Response.json({ data: newColor });
  } catch (err: any) {
    console.error("Create Color Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to create color" }), {
      status: 500,
    });
  }
}
