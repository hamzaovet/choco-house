import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint: get available products for customer storefront
// Cache for 60 seconds to avoid repeated DB round-trips
export const revalidate = 60;

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        category: true,
        basePrice: true,
        image: true,
        description: true,
        isAvailable: true,
      },
    });
    return NextResponse.json(products, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
