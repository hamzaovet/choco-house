import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    let order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      order = await prisma.order.findUnique({ where: { orderNumber: id } });
    }
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
    let timeline: any[] = [];
    try { timeline = JSON.parse(existing.timeline || "[]"); } catch {}
    if (body.status && body.status !== existing.status) {
      timeline.push({ stage: body.status, at: new Date().toISOString(), by: body._updatedBy || "system" });
    }

    if (body.items !== undefined || body.total !== undefined || body.isEdited) {
      timeline.push({ 
        stage: "edited", 
        at: new Date().toISOString(), 
        by: body._updatedBy || "staff",
        note: body.editNote || "تم تعديل أصناف أو حسابات الأوردر"
      });
    }

    const { 
      status, captainName, captainPhone, notes, assignedChef, customerEmail, customerId,
      items, subtotal, deliveryFee, total, deposit, remaining, address, phone, customerName, zone
    } = body;

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

    // Full order items & financials editing
    if (items !== undefined) {
      updateData.items = typeof items === "string" ? items : JSON.stringify(items);
    }
    if (subtotal !== undefined) updateData.subtotal = Number(subtotal);
    if (deliveryFee !== undefined) updateData.deliveryFee = Number(deliveryFee);
    if (total !== undefined) updateData.total = Number(total);
    if (deposit !== undefined) updateData.deposit = Number(deposit);
    if (remaining !== undefined) updateData.remaining = Number(remaining);
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (customerName !== undefined) updateData.customerName = customerName;
    if (zone !== undefined) updateData.zone = zone;

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
