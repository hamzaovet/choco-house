import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerPhone = searchParams.get("customerPhone")?.trim();
    const orderId = searchParams.get("orderId")?.trim();

    const where: any = {};
    if (customerPhone) {
      where.customerPhone = customerPhone;
    } else if (orderId) {
      where.orderId = orderId;
    }

    const messages = await prisma.chatMessage.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
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
    const { senderName, text, customerPhone, orderId, isStaff, senderRole } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    const msg = await prisma.chatMessage.create({
      data: {
        senderName: senderName?.trim() || (isStaff ? "فريق Choco House" : "عميل"),
        text: text.trim(),
        customerPhone: customerPhone?.trim() || null,
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
