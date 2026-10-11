import { getUserByIdReqInfo } from "@/src/data/user";
import { NextResponse } from "next/server";
import { apiPermission } from "@/src/lib/permissions/server";



export async function GET(req: Request) {
  const guard = await apiPermission("staff.view");
  if (guard.response) return guard.response;

    const id = req.url.split("referrers/")[1];

    try {
        const referrerDetail = await getUserByIdReqInfo(id);
        if (referrerDetail) {
            return new NextResponse(JSON.stringify({ referrerDetail }), { status: 200 })
        } else {
            return new NextResponse(JSON.stringify({ error: "Referrer not found" }), {
                status: 403
            });
        }
    } catch (err) {
        return new NextResponse(JSON.stringify({ error: "Interner Server error" }), {
            status: 500
        });
    }

}



