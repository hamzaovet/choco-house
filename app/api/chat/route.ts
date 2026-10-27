import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerPhone = searchParams.get("customerPhone")?.trim();
    const orderId = searchParams.get("orderId")?.trim();

    let where: any = undefined;

    if (customerPhone) {
      const clean = customerPhone.replace(/[^0-9]/g, "");
      const alt1 = clean.startsWith("20") ? clean.slice(1) : (clean.startsWith("0") ? "2" + clean : clean);
      const alt2 = clean.startsWith("0") ? clean : "0" + clean;

      where = {
        OR: [
          { customerPhone: customerPhone },
          { customerPhone: clean },
          { customerPhone: alt1 },
          { customerPhone: alt2 },
          // Include general staff broadcast messages
          { isStaff: true, customerPhone: null },
        ],
      };
    } else if (orderId) {
      where = { orderId };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
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

    const cleanPhone = customerPhone ? String(customerPhone).trim() : null;

    const msg = await prisma.chatMessage.create({
      data: {
        senderName: senderName?.trim() || (isStaff ? "فريق Choco House" : "عميل"),
        text: text.trim(),
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
