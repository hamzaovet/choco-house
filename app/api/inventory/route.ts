import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_INGREDIENTS = [
  { name: "نوتيلا كبير", unit: "كيلو", quantity: 12, minStock: 5, costPerUnit: 450 },
  { name: "لوتس بيسكوف", unit: "كيلو", quantity: 3, minStock: 4, costPerUnit: 320 },
  { name: "دقيق وافل", unit: "كيلو", quantity: 25, minStock: 10, costPerUnit: 85 },
  { name: "بيض", unit: "طبق", quantity: 8, minStock: 5, costPerUnit: 120 },
  { name: "زبدة", unit: "كيلو", quantity: 6, minStock: 3, costPerUnit: 200 },
  { name: "حليب كامل", unit: "لتر", quantity: 15, minStock: 8, costPerUnit: 25 },
  { name: "كريمة باتيسيير", unit: "لتر", quantity: 4, minStock: 6, costPerUnit: 180 },
  { name: "آيس كريم فانيلا", unit: "لتر", quantity: 7, minStock: 4, costPerUnit: 145 },
  { name: "كيندر بوينو", unit: "صندوق", quantity: 2, minStock: 3, costPerUnit: 350 },
  { name: "توب بوبا", unit: "كيلو", quantity: 3.5, minStock: 2, costPerUnit: 280 },
  { name: "طحين تشيز كيك", unit: "كيلو", quantity: 9, minStock: 4, costPerUnit: 95 },
  { name: "جبنة كريمي", unit: "كيلو", quantity: 5, minStock: 3, costPerUnit: 380 },
];

export async function GET() {
  try {
    let items = await prisma.ingredient.findMany({
      orderBy: { createdAt: "asc" },
    });

    // Auto-seed if database table is empty
    if (items.length === 0) {
      await prisma.ingredient.createMany({
        data: DEFAULT_INGREDIENTS,
      });
      items = await prisma.ingredient.findMany({
        orderBy: { createdAt: "asc" },
      });
    }

    return NextResponse.json(items);
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, unit, quantity, minStock, costPerUnit } = body;

    if (!name) {
      return NextResponse.json({ error: "اسم الصنف مطلوب" }, { status: 400 });
    }

    const item = await prisma.ingredient.create({
      data: {
        name,
        unit: unit || "كيلو",
        quantity: parseFloat(quantity) || 0,
        minStock: parseFloat(minStock) || 1,
        costPerUnit: parseFloat(costPerUnit) || 0,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
