import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  try {
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { orderNumber: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    if (!order) return NextResponse.json({ error: "لم يتم العثور على طلب" }, { status: 404 });
    return NextResponse.json({
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      total: order.total,
      createdAt: order.createdAt,
      timeline: JSON.parse(order.timeline || "[]"),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
