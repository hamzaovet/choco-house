import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_OFFERS = {
  badge: "عروض محدودة",
  title: "العروض الخاصة",
  subtitle: "عروض متجددة كل أسبوع — اسأل الكاشير عن عرض اليوم",
  cards: [
    {
      id: "combo",
      title: "كومبو الشلة",
      desc: "وافل + ميلك شيك + تشيز كيك بسعر 299 ج م بدل 320 ج م",
      icon: "party",
    },
    {
      id: "delivery",
      title: "توصيل مجاني",
      desc: "اطلب بأكثر من 350 ج م والتوصيل علينا داخل 6 أكتوبر",
      icon: "delivery",
    },
    {
      id: "student",
      title: "خصم الطلبة",
      desc: "10% خصم على المنيو كله بكارنيه الطالب",
      icon: "student",
    },
  ],
  banner: {
    badge: "الأكثر طلباً هذا الأسبوع",
    title: "ميني بان كيك نوتيلا",
    linkText: "شـوفـه فـي الـمـنـيـو",
    linkHref: "#menu",
    image: "/whacka-offers-banner.jpg",
  },
};

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "specialOffers" FROM choco."SystemSettings" WHERE id = 'default' LIMIT 1`
    );

    if (rows && rows.length > 0 && rows[0]?.specialOffers) {
      try {
        const parsed = JSON.parse(rows[0].specialOffers);
        return NextResponse.json(parsed);
      } catch {
        // Fallback to default
      }
    }

    return NextResponse.json(DEFAULT_OFFERS);
  } catch {
    return NextResponse.json(DEFAULT_OFFERS);
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const jsonStr = JSON.stringify(body);

    await prisma.$executeRawUnsafe(
      `UPDATE choco."SystemSettings" SET "specialOffers" = $1, "updatedAt" = NOW() WHERE id = 'default'`,
      jsonStr
    );

    return NextResponse.json({ success: true, offers: body });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
