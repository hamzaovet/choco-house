import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_OFFERS = {
  enabled: true,
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
  discount: {
    enabled: false,
    title: "خصم خاص لفترة محدودة 🔥",
    type: "percentage",
    value: 15,
    scope: "all",
    categoryName: "",
    productIds: [],
  },
};

export async function GET() {
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { id: "default" },
      select: { specialOffers: true, offersEnabled: true },
    });

    let data: any = { ...DEFAULT_OFFERS };
    if (setting?.specialOffers) {
      try {
        const parsed = JSON.parse(setting.specialOffers);
        data = { ...DEFAULT_OFFERS, ...parsed };
      } catch {
        // Fallback to default
      }
    }

    if (setting && typeof setting.offersEnabled === "boolean") {
      data.enabled = setting.offersEnabled;
    } else if (data.enabled === undefined) {
      data.enabled = true;
    }

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (err) {
    console.error("Error fetching offers:", err);
    return new NextResponse(JSON.stringify(DEFAULT_OFFERS), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
}

async function handleSaveOffers(req: Request) {
  try {
    const body = await req.json();
    const isEnabled = body.enabled !== undefined ? Boolean(body.enabled) : true;
    body.enabled = isEnabled;
    const jsonStr = JSON.stringify(body);

    const updated = await prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        specialOffers: jsonStr,
        offersEnabled: isEnabled,
      },
      create: {
        id: "default",
        specialOffers: jsonStr,
        offersEnabled: isEnabled,
      },
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        offers: body,
        offersEnabled: updated.offersEnabled,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    console.error("Error saving offers:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleSaveOffers(req);
}

export async function PUT(req: Request) {
  return handleSaveOffers(req);
}
