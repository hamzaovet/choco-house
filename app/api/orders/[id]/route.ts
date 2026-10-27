import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    return NextResponse.json(order);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });

    // Append to timeline
    let timeline = [];
    try { timeline = JSON.parse(existing.timeline || "[]"); } catch {}
    if (body.status && body.status !== existing.status) {
      timeline.push({ stage: body.status, at: new Date().toISOString(), by: body._updatedBy || "system" });
    }

    const { status, captainName, captainPhone, notes, assignedChef, customerEmail, customerId } = body;
    const updateData: Record<string, any> = {
      timeline: JSON.stringify(timeline),
    };
    if (status !== undefined) updateData.status = status;
    if (captainName !== undefined) updateData.captainName = captainName;
    if (captainPhone !== undefined) updateData.captainPhone = captainPhone;
    if (notes !== undefined) updateData.notes = notes;
    if (assignedChef !== undefined) updateData.assignedChef = assignedChef;
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail;
    if (customerId !== undefined) updateData.customerId = customerId;

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
