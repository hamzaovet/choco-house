import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nameAr, nameEn, image, sortOrder } = body;

    if (!nameAr || !nameAr.trim()) {
      return NextResponse.json({ error: "اسم القسم مطلوب بالعربية" }, { status: 400 });
    }

    const trimmedAr = nameAr.trim();
    const existing = await prisma.category.findUnique({
      where: { nameAr: trimmedAr },
    });

    if (existing) {
      return NextResponse.json({ error: "هذا القسم موجود بالفعل" }, { status: 400 });
    }

    const count = await prisma.category.count();
    const created = await prisma.category.create({
      data: {
        nameAr: trimmedAr,
        nameEn: nameEn?.trim() || "",
        image: image || null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : count + 1,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 });
    }

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
