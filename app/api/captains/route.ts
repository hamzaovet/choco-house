import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    const { name, phone, vehicle } = body;

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
        true,
        NOW()
      )
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        vehicle = EXCLUDED.vehicle,
        "isActive" = true;
    `);

    return NextResponse.json({ success: true, captain: { id, name, phone, vehicle } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
