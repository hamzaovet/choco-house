import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

function sha256(str: string) {
  return createHash("sha256").update(str).digest("hex");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    /* ── New auth: username + password ── */
    if (body.username) {
      const { username, password } = body;
      if (!username || !password)
        return NextResponse.json({ error: "يرجى إدخال اسم المستخدم وكلمة المرور" }, { status: 400 });

      const pwHash = sha256(String(password));

      // Raw query because username/passwordHash columns were added via migration
      const rows = await prisma.$queryRaw<any[]>`
        SELECT id, name, phone, role, department, avatar
        FROM choco."User"
        WHERE username = ${username.trim()} AND "passwordHash" = ${pwHash}
        LIMIT 1
      `;

      if (!rows.length)
        return NextResponse.json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" }, { status: 401 });

      const user = rows[0];
      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role, department: user.department, avatar: user.avatar },
      });
    }

    /* ── Legacy auth: phone + pin (keep for compatibility) ── */
    if (body.phone) {
      const cleanPhone = String(body.phone).trim();
      const cleanPin   = body.pin ? String(body.pin).trim() : "";

      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: cleanPhone.replace(/^0/, "") },
            { phone: `0${cleanPhone}` },
          ],
        },
      });

      if (!user) return NextResponse.json({ error: "رقم الموبايل غير مسجل" }, { status: 401 });
      if (user.pin && cleanPin && user.pin !== cleanPin)
        return NextResponse.json({ error: "الرقم السري غير صحيح" }, { status: 401 });

      return NextResponse.json({
        success: true,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role, department: user.department, avatar: user.avatar },
      });
    }

    return NextResponse.json({ error: "بيانات الدخول غير مكتملة" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
