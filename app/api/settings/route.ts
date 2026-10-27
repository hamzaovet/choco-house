import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    let settings = await prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          id: "default",
          restaurantName: "Choco House Desserts",
          phone: "01091413470",
          address: "الحي الثاني، قطعة 3، مبنى 3، السادس من أكتوبر",
          deliveryZones: JSON.stringify([
            { name: "الحي الثاني", fee: 15 },
            { name: "الحي الأول", fee: 20 },
            { name: "الحي المتميز", fee: 25 },
            { name: "الحصري", fee: 20 },
          ]),
          soundsEnabled: true,
          specialOffers: "open", // store status: open, busy, closed, disabled
        },
      });
    }

    return NextResponse.json(settings);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        restaurantName: body.restaurantName,
        phone: body.phone,
        address: body.address,
        soundsEnabled: body.soundsEnabled,
        specialOffers: body.specialOffers || body.status, // use for store status
        deliveryZones: typeof body.deliveryZones === "string" ? body.deliveryZones : JSON.stringify(body.deliveryZones || []),
      },
      create: {
        id: "default",
        restaurantName: body.restaurantName || "Choco House Desserts",
        phone: body.phone || "01091413470",
        address: body.address || "الحي الثاني، قطعة 3، مبنى 3، السادس من أكتوبر",
        soundsEnabled: body.soundsEnabled ?? true,
        specialOffers: body.specialOffers || body.status || "open",
        deliveryZones: typeof body.deliveryZones === "string" ? body.deliveryZones : JSON.stringify(body.deliveryZones || []),
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
