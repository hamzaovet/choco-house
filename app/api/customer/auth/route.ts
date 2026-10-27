import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── 1. SEND OTP CODE ──
    if (action === "send_otp") {
      const { email, name, phone } = body;
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني صحيح" }, { status: 400 });
      }

      // Generate random 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const cleanPhone = phone ? String(phone).trim() : `temp_${Date.now()}`;
      const customerName = name?.trim() || "عميل Choco House";

      // Upsert customer record
      await prisma.$executeRawUnsafe(`
        INSERT INTO choco."Customer" (id, name, phone, email, "otpCode", "otpExpires", "isVerified", "updatedAt")
        VALUES (
          ${`'cust_${Date.now()}'`},
          ${`'${customerName.replace(/'/g, "''")}'`},
          ${`'${cleanPhone.replace(/'/g, "''")}'`},
          ${`'${email.trim().toLowerCase().replace(/'/g, "''")}'`},
          ${`'${code}'`},
          NOW() + INTERVAL '10 minutes',
          false,
          NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          "otpCode" = EXCLUDED."otpCode",
          "otpExpires" = EXCLUDED."otpExpires",
          "updatedAt" = NOW();
      `);

      // Send email via Gmail App Password
      await sendOtpEmail(email.trim().toLowerCase(), customerName, code);

      return NextResponse.json({
        success: true,
        message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        email: email.trim().toLowerCase(),
        // Also provide testCode in dev for convenience
        ...(process.env.NODE_ENV !== "production" ? { debugCode: code } : {}),
      });
    }

    // ── 2. VERIFY OTP CODE ──
    if (action === "verify_otp") {
      const { email, code, phone, name, address, zone } = body;
      if (!email || !code) {
        return NextResponse.json({ error: "البريد الإلكتروني والرمز مطلوبان" }, { status: 400 });
      }

      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM choco."Customer"
        WHERE email = '${email.trim().toLowerCase().replace(/'/g, "''")}'
        LIMIT 1;
      `);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "لم يتم العثور على حساب بهذا البريد" }, { status: 404 });
      }

      const cust = rows[0];

      // Verify code (or bypass if code === cust.otpCode or master code '123456')
      const isMatch = cust.otpCode === String(code).trim() || String(code).trim() === "123456";
      if (!isMatch) {
        return NextResponse.json({ error: "رمز التحقق غير صحيح، يرجى إعادة المحاولة" }, { status: 400 });
      }

      // Update customer verification and extra details
      await prisma.$executeRawUnsafe(`
        UPDATE choco."Customer"
        SET 
          "isVerified" = true,
          "otpCode" = NULL,
          "otpExpires" = NULL,
          name = COALESCE('${(name || cust.name || "").replace(/'/g, "''")}', name),
          phone = COALESCE('${(phone || cust.phone || "").replace(/'/g, "''")}', phone),
          address = COALESCE('${(address || cust.address || "").replace(/'/g, "''")}', address),
          zone = COALESCE('${(zone || cust.zone || "").replace(/'/g, "''")}', zone),
          "updatedAt" = NOW()
        WHERE id = '${cust.id}';
      `);

      const updatedRows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, name, phone, email, address, zone, "isVerified"
        FROM choco."Customer"
        WHERE id = '${cust.id}';
      `);

      return NextResponse.json({
        success: true,
        customer: updatedRows[0],
      });
    }

    // ── 3. QUICK LOGIN BY PHONE ──
    if (action === "quick_login") {
      const { phone } = body;
      if (!phone) {
        return NextResponse.json({ error: "رقم الموبايل مطلوب" }, { status: 400 });
      }

      const clean = String(phone).trim();
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT id, name, phone, email, address, zone, "isVerified"
        FROM choco."Customer"
        WHERE phone = '${clean.replace(/'/g, "''")}'
        LIMIT 1;
      `);

      if (!rows || rows.length === 0) {
        return NextResponse.json({ error: "رقم الهاتف غير مسجل" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        customer: rows[0],
      });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("Customer Auth Error:", err);
    return NextResponse.json({ error: err.message || "حدث خطأ في الخادم" }, { status: 500 });
  }
}
