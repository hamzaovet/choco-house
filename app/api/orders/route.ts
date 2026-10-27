import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateOrderNumber() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `CH-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Date.now()).slice(-4)}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");
    
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { gte: start, lte: end };
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderNumber = generateOrderNumber();
    const total = (body.subtotal || 0) + (body.deliveryFee || 15);
    const remaining = total - (body.deposit || 0);
    const timeline = JSON.stringify([{ stage: "new", at: new Date().toISOString(), by: "customer" }]);

    const order = await prisma.order.create({
      data: {
        ...body,
        orderNumber,
        total,
        remaining,
        timeline,
        items: typeof body.items === "string" ? body.items : JSON.stringify(body.items),
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
