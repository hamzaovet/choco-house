import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, phone, vehicle, "isActive"
      FROM choco."Captain"
      ORDER BY name ASC;
    `);
    return NextResponse.json(rows || []);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, vehicle, isActive = true } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "اسم ورقم هاتف الطيار مطلوبان" }, { status: 400 });
    }

    const id = `cpt_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO choco."Captain" (id, name, phone, vehicle, "isActive", "createdAt")
      VALUES (
        '${id}',
        '${name.trim().replace(/'/g, "''")}',
        '${phone.trim().replace(/'/g, "''")}',
        '${(vehicle || "سكوتر دليفري").replace(/'/g, "''")}',
        ${isActive ? "true" : "false"},
        NOW()
      )
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        vehicle = EXCLUDED.vehicle,
        "isActive" = EXCLUDED."isActive";
    `);

    return NextResponse.json({ success: true, captain: { id, name, phone, vehicle, isActive } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const phone = url.searchParams.get("phone");

    if (!id && !phone) {
      return NextResponse.json({ error: "ID or Phone is required" }, { status: 400 });
    }

    if (id) {
      await prisma.$executeRawUnsafe(`DELETE FROM choco."Captain" WHERE id = '${id.replace(/'/g, "''")}';`);
    } else if (phone) {
      await prisma.$executeRawUnsafe(`DELETE FROM choco."Captain" WHERE phone = '${phone.replace(/'/g, "''")}';`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, isActive, name, vehicle } = body;

    if (!id) {
      return NextResponse.json({ error: "Captain ID required" }, { status: 400 });
    }

    const updates: string[] = [];
    if (isActive !== undefined) updates.push(`"isActive" = ${isActive ? "true" : "false"}`);
    if (name) updates.push(`name = '${name.trim().replace(/'/g, "''")}'`);
    if (vehicle) updates.push(`vehicle = '${vehicle.trim().replace(/'/g, "''")}'`);

    if (updates.length > 0) {
      await prisma.$executeRawUnsafe(`
        UPDATE choco."Captain"
        SET ${updates.join(", ")}
        WHERE id = '${id.replace(/'/g, "''")}';
      `);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
