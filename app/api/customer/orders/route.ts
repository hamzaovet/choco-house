import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone")?.trim();
    const email = searchParams.get("email")?.trim();

    if (!phone && !email) {
      return NextResponse.json({ error: "رقم الموبايل أو الإيميل مطلوب" }, { status: 400 });
    }

    let condition = "";
    if (phone && email) {
      condition = `phone = '${phone.replace(/'/g, "''")}' OR "customerEmail" = '${email.replace(/'/g, "''")}'`;
    } else if (phone) {
      condition = `phone = '${phone.replace(/'/g, "''")}'`;
    } else {
      condition = `"customerEmail" = '${email!.replace(/'/g, "''")}'`;
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        id, "orderNumber", "customerName", phone, address, zone, status,
        items, subtotal, "deliveryFee", total, "paymentMethod", notes,
        "captainName", "captainPhone", "createdAt", "updatedAt"
      FROM choco."Order"
      WHERE ${condition}
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `);

    return NextResponse.json(rows || []);
  } catch (err: any) {
    console.error("Fetch Customer Orders Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
