import { db } from "@/src/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, currentRole } from "@/src/lib/auth";
import { UserRole } from "@prisma/client";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const body = await req.json();
    const { pincode, rate, type, description, isActive } = body;

    const updateData: any = {};

    if (pincode !== undefined) {
      let pincodeType = type;
      if (!pincodeType) {
        if (pincode.includes("*")) {
          pincodeType = "wildcard";
        } else if (pincode.includes("-")) {
          pincodeType = "range";
        } else {
          pincodeType = "exact";
        }
      }

      // Validate range
      if (pincodeType === "range") {
        const [start, end] = pincode.split("-").map((s: string) => s.trim());
        if (!start || !end || !/^\d{6}$/.test(start) || !/^\d{6}$/.test(end)) {
          return new NextResponse(
            JSON.stringify({ error: "Invalid range format. Use: 364001-364005" }),
            { status: 400 }
          );
        }
        if (parseInt(start) >= parseInt(end)) {
          return new NextResponse(
            JSON.stringify({ error: "Range start must be less than range end" }),
            { status: 400 }
          );
        }
      }

      // Validate exact pincode
      if (pincodeType === "exact" && !/^\d{6}$/.test(pincode)) {
        return new NextResponse(
          JSON.stringify({ error: "Exact pincode must be 6 digits" }),
          { status: 400 }
        );
      }

      updateData.pincode = pincode;
      updateData.type = pincodeType;
    }

    if (rate !== undefined) {
      if (rate < 0) {
        return new NextResponse(
          JSON.stringify({ error: "Shipping rate must be 0 or greater" }),
          { status: 400 }
        );
      }
      updateData.rate = parseFloat(rate.toString());
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (type !== undefined) {
      updateData.type = type;
    }

    const shippingRate = await db.shippingRate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: shippingRate, success: true });
  } catch (err: any) {
    console.error("Error updating shipping rate:", err);
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const user = await currentUser();
    const role = await currentRole();

    if (!user || role !== UserRole.ADMIN) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await db.shippingRate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting shipping rate:", err);
    return new NextResponse(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}


