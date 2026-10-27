import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const isStaffView = searchParams.get("isStaffView") === "1";
    const customerPhone = searchParams.get("customerPhone")?.trim();
    const token = searchParams.get("token")?.trim();
    const orderId = searchParams.get("orderId")?.trim();

    // 1. Staff view in Dashboard: returns full inquiry board
    if (isStaffView) {
      const messages = await prisma.chatMessage.findMany({
        orderBy: { createdAt: "asc" },
        take: 200,
      });
      return NextResponse.json(messages);
    }

    // 2. Specific Order view
    if (orderId) {
      const messages = await prisma.chatMessage.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
        take: 100,
      });
      return NextResponse.json(messages);
    }

    // 3. Customer Private Chat: MUST have either phone or unique device token
    if (!customerPhone && !token) {
      // New visitor with no history yet -> strictly return empty array
      return NextResponse.json([]);
    }

    const orConditions: any[] = [];

    if (customerPhone) {
      const clean = customerPhone.replace(/[^0-9]/g, "");
      const alt1 = clean.startsWith("20") ? clean.slice(1) : (clean.startsWith("0") ? "2" + clean : clean);
      const alt2 = clean.startsWith("0") ? clean : "0" + clean;

      orConditions.push(
        { customerPhone: customerPhone },
        { customerPhone: clean },
        { customerPhone: alt1 },
        { customerPhone: alt2 }
      );
    }

    if (token) {
      orConditions.push({ senderId: token });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: orConditions,
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    });

    return NextResponse.json(messages);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { senderName, text, customerPhone, token, orderId, isStaff, senderRole } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    const cleanPhone = customerPhone ? String(customerPhone).trim() : null;
    const cleanToken = token ? String(token).trim() : null;

    const msg = await prisma.chatMessage.create({
      data: {
        senderName: senderName?.trim() || (isStaff ? "فريق Choco House" : "عميل"),
        text: text.trim(),
        senderId: cleanToken,
        customerPhone: cleanPhone,
        orderId: orderId?.trim() || null,
        isStaff: Boolean(isStaff),
        senderRole: senderRole?.trim() || (isStaff ? "staff" : "customer"),
      },
    });
    return NextResponse.json(msg, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
