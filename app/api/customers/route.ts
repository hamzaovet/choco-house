import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();

    let searchFilter = "";
    if (q) {
      const clean = q.replace(/'/g, "''");
      searchFilter = `WHERE (c.name ILIKE '%${clean}%' OR c.phone ILIKE '%${clean}%' OR c.email ILIKE '%${clean}%' OR c.zone ILIKE '%${clean}%' OR c.address ILIKE '%${clean}%')`;
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.zone,
        c."isVerified",
        c."createdAt",
        c."updatedAt",
        COUNT(o.id)::int as "totalOrders",
        COALESCE(SUM(o.total), 0)::float as "totalSpent",
        MAX(o."createdAt") as "lastOrderDate"
      FROM choco."Customer" c
      LEFT JOIN choco."Order" o ON o.phone = c.phone
      ${searchFilter}
      GROUP BY c.id
      ORDER BY c."createdAt" DESC
      LIMIT 200;
    `);

    return NextResponse.json(rows || []);
  } catch (err: any) {
    console.error("Customers API GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, address, zone, isVerified } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "الاسم ورقم الهاتف مطلوبان" }, { status: 400 });
    }

    const cleanPhone = String(phone).trim();
    const cleanEmail = email ? String(email).trim().toLowerCase() : null;

    const id = `cust_${Date.now()}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO choco."Customer" (id, name, phone, email, address, zone, "isVerified", "updatedAt")
      VALUES (
        '${id}',
        '${name.trim().replace(/'/g, "''")}',
        '${cleanPhone.replace(/'/g, "''")}',
        ${cleanEmail ? `'${cleanEmail.replace(/'/g, "''")}'` : 'NULL'},
        ${address ? `'${address.trim().replace(/'/g, "''")}'` : 'NULL'},
        ${zone ? `'${zone.trim().replace(/'/g, "''")}'` : 'NULL'},
        ${Boolean(isVerified)},
        NOW()
      )
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = COALESCE(EXCLUDED.email, choco."Customer".email),
        address = COALESCE(EXCLUDED.address, choco."Customer".address),
        zone = COALESCE(EXCLUDED.zone, choco."Customer".zone),
        "isVerified" = EXCLUDED."isVerified",
        "updatedAt" = NOW();
    `);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Customers API POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "معرف العميل مطلوب" }, { status: 400 });

    await prisma.$executeRawUnsafe(`
      DELETE FROM choco."Customer" WHERE id = '${id.replace(/'/g, "''")}';
    `);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
