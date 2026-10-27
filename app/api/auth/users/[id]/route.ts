import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function sha256(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

/* ── PATCH /api/auth/users/[id] — update user ── */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;  // params is a Promise in this Next.js version
    const body = await req.json();
    const { name, phone, role, department, username, password } = body;

    // Build dynamic SET clause
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined)       { updates.push(`name = $${idx++}`);           values.push(name); }
    if (phone !== undefined)      { updates.push(`phone = $${idx++}`);          values.push(phone); }
    if (role !== undefined)       { updates.push(`role = $${idx++}`);           values.push(role); }
    if (department !== undefined) { updates.push(`department = $${idx++}`);     values.push(department); }
    if (username !== undefined)   { updates.push(`username = $${idx++}`);       values.push(username.trim()); }
    if (password && password.length > 0) {
      updates.push(`"passwordHash" = $${idx++}`);
      values.push(sha256(String(password)));
    }

    if (!updates.length)
      return NextResponse.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });

    values.push(id); // last param for WHERE clause
    const setClause = updates.join(", ");
    const sql = `UPDATE choco."User" SET ${setClause} WHERE id = $${idx} RETURNING id, name, phone, role, department, avatar`;

    const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...values);
    if (!rows.length)
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── DELETE /api/auth/users/[id] — delete user ── */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;  // params is a Promise in this Next.js version
    const target = await prisma.$queryRaw<any[]>`SELECT role FROM choco."User" WHERE id = ${id}`;
    if (!target.length) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    if (target[0].role === "owner") return NextResponse.json({ error: "لا يمكن حذف حساب المالك" }, { status: 403 });

    await prisma.$executeRaw`DELETE FROM choco."User" WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
