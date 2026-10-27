import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function sha256(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

/* ── GET /api/auth/users — list all users (includes username) ── */
export async function GET() {
  try {
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone, role, department, avatar, username
      FROM choco."User"
      ORDER BY "createdAt" ASC
    `;
    return NextResponse.json(users);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ── POST /api/auth/users — create new user ── */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, role, department, username, password } = body;

    if (!name || !role)
      return NextResponse.json({ error: "الاسم والدور مطلوبان" }, { status: 400 });

    const passwordHash = password ? sha256(String(password)) : null;
    const uname        = username?.trim() || null;
    const dept         = department || null;
    const ph           = phone || null;

    // The User table has: id, name, phone, pin, role, avatar, department, createdAt
    // Plus migration-added columns: username, passwordHash (no updatedAt)
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO choco."User" (id, name, phone, pin, role, department, username, "passwordHash", "createdAt")
      VALUES (
        gen_random_uuid(),
        ${name},
        ${ph ?? '00000000000'},
        ${'000000'},
        ${role},
        ${dept},
        ${uname},
        ${passwordHash},
        NOW()
      )
      RETURNING id, name, phone, role, department, avatar, username
    `;

    return NextResponse.json({ success: true, user: rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
