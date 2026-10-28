"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { playSound } from "@/lib/sounds";
import CustomerAccountModal from "@/components/CustomerAccountModal";
import CustomerChatWidget from "@/components/CustomerChatWidget";
import { ALL_DELIVERY_ZONES, DEFAULT_ZONE, findZone } from "@/lib/zones";
import {
  ShoppingCart, X, Plus, Minus, Search,
  MapPin, Phone, Clock, CheckCircle2, Loader2,
  Star, Bike, CreditCard, ChefHat, ChevronDown,
  Truck, Sparkles, Wallet, BadgeCheck,
  PartyPopper, GraduationCap, Flame, Gift,
  Heart, Home, Package, User,
} from "lucide-react";

interface OfferCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface DiscountRule {
  enabled: boolean;
  title: string;
  type: "percentage" | "fixed";
  value: number;
  scope: "all" | "category" | "products";
  categoryName?: string;
  productIds?: string[];
}

interface OfferData {
  enabled?: boolean;
  badge?: string;
  title: string;
  subtitle: string;
  cards: OfferCard[];
  banner: {
    badge: string;
    title: string;
    linkText: string;
    linkHref: string;
    image: string;
  };
  discount?: DiscountRule;
}

const DEFAULT_OFFERS: OfferData = {
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
};

function renderOfferIcon(icon: string) {
  switch (icon) {
    case "party":
      return <PartyPopper size={24} color="#cca043" strokeWidth={1.8} />;
    case "delivery":
      return <Bike size={24} color="#cca043" strokeWidth={1.8} />;
    case "student":
      return <GraduationCap size={24} color="#cca043" strokeWidth={1.8} />;
    case "fire":
      return <Flame size={24} color="#cca043" strokeWidth={1.8} />;
    default:
      return <Gift size={24} color="#cca043" strokeWidth={1.8} />;
  }
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  basePrice: number;
  image?: string | null;
  description?: string | null;
  isAvailable: boolean;
  sortOrder?: number;
}

interface CartItem {
  product: Product;
  qty: number;
  extras: string[];
  unitPrice: number;
}

/* ─── constants ───────────────────────────────────────────── */
const C = {
  dark:    "#0d0805",
  card:    "#1a0f07",
  card2:   "#221108",
  border:  "#3d1f0a",
  gold:    "#c8860a",
  goldL:   "#e8a020",
  cream:   "#f5ede4",
  muted:   "#9c7a5e",
  muted2:  "#7a5c3e",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "الكل": "🍫",
  "وافل": "🧇",
  "تشيز كيك": "🍰",
  "بان كيك": "🥞",
  "ميلك شيك": "🥤",
  "سموزي": "🍹",
  "بوبا": "🧋",
  "All": "🍫",
  "Waffles": "🧇",
  "Cheesecakes": "🍰",
  "Mini Pancakes": "🥞",
  "Milkshakes": "🥤",
  "Smoothies": "🍹",
  "Boba Drinks": "🧋",
};

const ORDERED_CATEGORIES = ["الكل", "وافل", "تشيز كيك", "بان كيك", "ميلك شيك", "سموزي", "بوبا"];

const CATEGORY_PRIORITY: Record<string, number> = {
  "وافل": 1,
  "تشيز كيك": 2,
  "بان كيك": 3,
  "ميلك شيك": 4,
  "سموزي": 5,
  "بوبا": 6,
};

const CATEGORY_NAMES_EN: Record<string, string> = {
  "الكل": "All",
  "وافل": "Waffles",
  "تشيز كيك": "Cheesecakes",
  "بان كيك": "Mini Pancakes",
  "ميلك شيك": "Milkshakes",
  "سموزي": "Smoothies",
  "بوبا": "Boba Drinks",
};

/* ─── 1:1 Product Names in English (Whacka Replica) ─── */
const PRODUCT_NAMES_EN: Record<string, string> = {
  // Waffles
  "وافل نوتيلا بيضاء مشكل": "Mixed White Nutella Waffle",
  "وافل نوتيلا": "Classic Nutella Waffle",
  "وافل لوتس": "Original Lotus Waffle",
  "وافل نوتيلا بالاوريو": "Oreo Nutella Waffle",
  "وافل كراميل": "Caramel Waffle",
  "وافل كيندر": "Kinder Chocolate Waffle",
  "وافل شوكولاتة بيضاء فراولة": "White Chocolate Strawberry Waffle",

  // Cheesecakes
  "تشيز كيك بالتوت الأزرق": "Blueberry Cheesecake",
  "تشيز كيك لوتس": "Lotus Cheesecake",
  "تشيز كيك فراولة": "Strawberry Cheesecake",
  "تشيز كيك نوتيلا": "Nutella Cheesecake",

  // Mini Pancakes
  "ميني بان كيك نوتيلا بيضاء": "White Nutella Mini Pancakes",
  "ميني بان كيك نوتيلا": "Nutella Mini Pancakes",
  "ميني بان كيك لوتس": "Lotus Mini Pancakes",
  "ميني بان كيك بيضاء": "White Mini Pancakes",

  // Milkshakes
  "ميلك شيك نوتيلا": "Nutella Milkshake",
  "ميلك شيك أوريو": "Oreo Milkshake",
  "ميلك شيك لوتس": "Lotus Milkshake",
  "ميلك شيك فراولة": "Strawberry Milkshake",
  "ميلك شيك توت أزرق": "Blueberry Milkshake",

  // Smoothies
  "سموزي بالتوت الأزرق": "Blueberry Smoothie",
  "سموزي فراولة": "Strawberry Smoothie",
  "سموزي خوخ": "Peach Smoothie",
  "سموزي مانجو": "Mango Smoothie",

  // Boba Drinks
  "سموزي توت أزرق بوبا": "Boba Blueberry Smoothie",
  "سموزي فراولة بوبا": "Boba Strawberry Smoothie",
  "ميلك شيك توت أزرق بوبا": "Boba Blueberry Milkshake",
  "ميلك شيك خوخ بوبا": "Boba Peach Milkshake",
};

/* ─── Gourmet Arabic Descriptions ─── */
const PRODUCT_DESCRIPTIONS_AR: Record<string, string> = {
  "وافل نوتيلا بيضاء مشكل": "وافل مقرمش من الخارج وطري من الداخل مع نوتيلا بيضاء وشوكولاتة مشكلة.",
  "وافل نوتيلا": "كلاسيك شوكو هاوس: نوتيلا أصلية غزيرة على وافل سخن وطازة.",
  "وافل لوتس": "صوص لوتس أصلي مع قطع بسكويت لوتس مقرمشة وطعم لا يقاوم.",
  "وافل نوتيلا بالاوريو": "مزيج النوتيلا الغنية مع قطع بسكويت الأوريو المقرمش.",
  "وافل كراميل": "وافل ذهبي مغطى بصوص الكراميل الغني والحلو الفاخر.",
  "وافل كيندر": "شوكولاتة كيندر أصلية تذوب فوق الوافل الساخن الفاخر.",
  "وافل شوكولاتة بيضاء فراولة": "شوكولاتة بيضاء ناعمة مع قطع فراولة طازجة ولذيذة.",
  "تشيز كيك بالتوت الأزرق": "تشيز كيك كريمي فاخر مغطى بصوص التوت الأزرق المركز.",
  "تشيز كيك لوتس": "طبقة تشيز كيك كريمية غنية بطعم بسكويت اللوتس الأصلي.",
  "تشيز كيك فراولة": "تشيز كيك ناعم مزين بصوص الفراولة الطازجة الشهية.",
  "تشيز كيك نوتيلا": "تشيز كيك مخملي مغطى بطبقة كثيفة من النوتيلا الأصلية.",
  "ميني بان كيك نوتيلا بيضاء": "قطع ميني بان كيك هشة وغارقة في النوتيلا البيضاء الفاخرة.",
  "ميني بان كيك نوتيلا": "ميني بان كيك طازج مغطى بنوتيلا أصلية غنية وسخنة.",
  "ميني بان كيك لوتس": "ميني بان كيك هش مع زبدة وصوص اللوتس المقرمش اللذيذ.",
  "ميني بان كيك بيضاء": "ميني بان كيك بنكهة الشوكولاتة البيضاء الناعمة الفاخرة.",
  "ميلك شيك نوتيلا": "ميلك شيك مثلج وغني بنوتيلا أصلية مع كريمة مخفوقة.",
  "ميلك شيك أوريو": "ميلك شيك بارد ولذيذ مطحون بقطع بسكويت الأوريو المقرمشة.",
  "ميلك شيك لوتس": "ميلك شيك كريمي بطعم اللوتس الفاخر ورشة بسكويت مقرمش.",
  "ميلك شيك فراولة": "ميلك شيك منعش بالفراولة الطبيعية والحليب الطازج.",
  "ميلك شيك توت أزرق": "ميلك شيك بارد بنكهة التوت الأزرق الغنية والمنعشة.",
  "سموزي بالتوت الأزرق": "سموزي طبيعي مثلج ومحضر من حبات التوت الأزرق الطازج.",
  "سموزي فراولة": "سموزي فراولة طازج ومنعش 100% بدون أي مواد صناعية.",
  "سموزي خوخ": "سموزي خوخ طبيعي منعش بطعم الصيف اللذيذ.",
  "سموزي مانجو": "سموزي مانجو طبيعي مثلج ومحضر من مانجو فاخرة بيوريه.",
  "سموزي توت أزرق بوبا": "سموزي توت أزرق مثلج مع كرات البوبا اللذيذة المنعشة.",
  "سموزي فراولة بوبا": "سموزي فراولة طبيعي مثلج مع لآلئ البوبا الممتعة.",
  "ميلك شيك توت أزرق بوبا": "ميلك شيك توت أزرق كريمي مثلج مع حبيبات البوبا الأصلية.",
  "ميلك شيك خوخ بوبا": "ميلك شيك خوخ بارد ومنعش مع لآلئ بوبا طبيعية ولذيذة.",
};

/* ─── Gourmet English Descriptions (Whacka 1:1 Replica) ─── */
const PRODUCT_DESCRIPTIONS_EN: Record<string, string> = {
  // Waffles (Exact Whacka descriptions from reference)
  "وافل نوتيلا بيضاء مشكل": "Crisp outside, fluffy inside waffle with white Nutella and mixed chocolate.",
  "وافل نوتيلا": "The Choco House classic: generous original Nutella over a hot waffle.",
  "وافل لوتس": "Authentic Lotus spread topped with crunchy Lotus biscuit pieces.",
  "وافل نوتيلا بالاوريو": "Nutella plus crunchy Oreo chunks and a cream layer.",
  "وافل كراميل": "Balanced salted caramel sauce with a hint of sea salt.",
  "وافل كيندر": "Kinder Bueno pieces with a creamy milk filling.",
  "وافل شوكولاتة بيضاء فراولة": "Silky white chocolate topped with fresh ripe strawberry slices.",

  // Cheesecakes
  "تشيز كيك بالتوت الأزرق": "Rich creamy cheesecake topped with concentrated wild blueberry compote.",
  "تشيز كيك لوتس": "Creamy cheesecake infused with authentic Lotus biscuit crunch.",
  "تشيز كيك فراولة": "Smooth silky cheesecake glazed with fresh strawberry sauce.",
  "تشيز كيك نوتيلا": "Velvety New York style cheesecake loaded with rich original Nutella.",

  // Mini Pancakes
  "ميني بان كيك نوتيلا بيضاء": "Fluffy bite-sized pancakes drenched in premium warm white Nutella.",
  "ميني بان كيك نوتيلا": "Fresh mini pancakes loaded with generous original hot Nutella.",
  "ميني بان كيك لوتس": "Golden mini pancakes smothered in rich crunchy Lotus spread.",
  "ميني بان كيك بيضاء": "Mini pancake bites drizzled with velvety melted white chocolate.",

  // Milkshakes
  "ميلك شيك نوتيلا": "Chilled thick shake blended with genuine Nutella and whipped cream.",
  "ميلك شيك أوريو": "Thick frosty shake loaded with crushed crispy Oreo cookies.",
  "ميلك شيك لوتس": "Creamy Lotus spread blended shake topped with crunchy biscuit crumble.",
  "ميلك شيك فراولة": "Refreshing milkshake prepared with natural strawberries and fresh milk.",
  "ميلك شيك توت أزرق": "Cold creamy milkshake bursting with sweet wild blueberry flavour.",

  // Smoothies
  "سموزي بالتوت الأزرق": "100% natural iced smoothie crafted from crushed wild blueberries.",
  "سموزي فراولة": "Refreshing all-natural strawberry smoothie with pure fruit pulp.",
  "سموزي خوخ": "Frosty natural peach smoothie bursting with sun-ripened summer flavour.",
  "سموزي مانجو": "Iced tropical smoothie made from luscious premium mango puree.",

  // Boba Drinks
  "سموزي توت أزرق بوبا": "Frosty wild blueberry smoothie paired with chewy sweet boba pearls.",
  "سموزي فراولة بوبا": "Natural iced strawberry smoothie served with fun popping boba.",
  "ميلك شيك توت أزرق بوبا": "Creamy blueberry milkshake loaded with authentic chewy boba pearls.",
  "ميلك شيك خوخ بوبا": "Cold peach-infused milkshake complete with delicious signature boba pearls.",
};

const CATEGORY_ICONS: Record<string, string> = {
  "الكل": "/categories/waffle.jpg",
  "وافل": "/categories/waffle.jpg",
  "تشيز كيك": "/categories/cheesecake.jpg",
  "بان كيك": "/categories/pancake.jpg",
  "ميلك شيك": "/categories/milkshake.jpg",
  "سموزي": "/categories/smoothie.jpg",
  "بوبا": "/categories/boba.jpg",
  "كيك وحلويات": "/categories/cake.jpg",
  "مشروبات": "/categories/drinks.jpg",
  "عروض خاصة": "/categories/offers.jpg",
  "مولتن كيك": "/categories/molten.jpg",
};

const CATEGORY_SUBTITLES: Record<string, string> = {
  "وافل": "وافل بلجيكي أصلي مقرمش وخفيف محضر لحظة الطلب مع أجود أنواع الشوكولاتة الفاخرة",
  "تشيز كيك": "قطع تشيز كيك كريمية فاخرة بنكهات الفراولة واللوتس والتوت الأزرق والنوتيلا",
  "بان كيك": "ميني بان كيك هش ولذيذ يذوب في الفم مع صوصات النوتيلا واللوتس والكراميل الغنية",
  "ميلك شيك": "ميلك شيك كريمي مثلج ومحضر من آيس كريم فاخر وبسكويت الأوريو واللوتس والنوتيلا",
  "سموزي": "عصائر وسموزي طبيعية 100% مثلجة ومنعشة ومحضرة من فواكه طبيعية طازجة",
  "بوبا": "مشروبات البوبا التريند المثلجة مع لآلئ التابيوكا الطبيعية ونكهات الفواكه المنعشة",
  "كيك وحلويات": "تشكيلة حلويات غربية وكيكات فاخرة محضرة بعناية لتناسب جميع المناسبات",
  "مشروبات": "مشروبات ساخنة وباردة منعشة محضرة بأجود المكونات",
  "عروض خاصة": "باقات وكومبوهات حصرية بأسعار مميزة توفر لك ولشلتك تجربة استثنائية",
};

/* Fallback images per category when product has no image */
const CATEGORY_FALLBACK: Record<string, string> = {
  "وافل": "/categories/waffle.jpg",
  "تشيز كيك": "/categories/cheesecake.jpg",
  "بان كيك": "/categories/pancake.jpg",
  "ميلك شيك": "/categories/milkshake.jpg",
  "سموزي": "/categories/smoothie.jpg",
  "بوبا": "/categories/boba.jpg",
  "كيك وحلويات": "/categories/cake.jpg",
  "مشروبات": "/categories/drinks.jpg",
  "عروض خاصة": "/categories/offers.jpg",
  "مولتن كيك": "/categories/molten.jpg",
};

const EXTRAS_AR = [
  { label: "نوتيلا إضافية",  price: 25 },
  { label: "لوتس إضافي",    price: 25 },
  { label: "كيندر إضافي",   price: 35 },
  { label: "بوبا إضافي",    price: 30 },
  { label: "آيس كريم",      price: 25 },
  { label: "مكسرات",        price: 20 },
];

const EXTRAS_EN = [
  { label: "Extra Nutella", price: 25 },
  { label: "Extra Lotus",   price: 25 },
  { label: "Extra Kinder",  price: 35 },
  { label: "Extra Boba",    price: 30 },
  { label: "Ice Cream",     price: 25 },
  { label: "Nuts",          price: 20 },
];

const ZONES_AR = ALL_DELIVERY_ZONES.map((z) => ({
  name: z.nameAr,
  fee: z.fee,
  timeMinutes: z.timeMinutes,
  code: z.code,
}));

const ZONES_EN = ALL_DELIVERY_ZONES.map((z) => ({
  name: z.nameEn,
  fee: z.fee,
  timeMinutes: z.timeMinutes,
  code: z.code,
}));

const ORDER_STATUSES_AR: Record<string, { label: string; color: string }> = {
  new:       { label: "قيد الاستلام 📋",          color: "#3b82f6" },
  preparing: { label: "جاري التحضير 👨‍🍳",         color: "#f97316" },
  ready:     { label: "جاهز — في الطريق إليك 🛵", color: "#10b981" },
  delivered: { label: "تم التسليم بنجاح 🎉",       color: "#22c55e" },
  cancelled: { label: "ملغي ❌",                   color: "#ef4444" },
};

const ORDER_STATUSES_EN: Record<string, { label: string; color: string }> = {
  new:       { label: "Order Received 📋",        color: "#3b82f6" },
  preparing: { label: "Preparing 👨‍🍳",            color: "#f97316" },
  ready:     { label: "Out for Delivery 🛵",      color: "#10b981" },
  delivered: { label: "Delivered 🎉",             color: "#22c55e" },
  cancelled: { label: "Cancelled ❌",             color: "#ef4444" },
};

/* Hero background — real food photos (waffle/chocolate) */
const HERO_IMAGES = [
  // Real waffle photo from elmenus (same as Whacka reference)
  "https://s3-eu-west-1.amazonaws.com/elmenusv5-stg/Normal/e82d47ee-9ef8-4cef-b175-d8d258d58856.jpg",
  // Chocolate dessert
  "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1600&q=85&fit=crop",
  // Pancake stack
  "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=1600&q=85&fit=crop",
];

/* ─── main component ──────────────────────────────────────── */
export default function HomePage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [offers, setOffers]         = useState<OfferData>(DEFAULT_OFFERS);
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [dbCategories, setDbCategories]     = useState<any[]>([]);

  const categories = ["الكل", ...Array.from(new Set([
    ...dbCategories.map(c => c.nameAr),
    ...ORDERED_CATEGORIES.filter(c => c !== "الكل"),
    ...products.map(p => p.category).filter(Boolean)
  ]))];

  function getCategoryIcon(cat: string) {
    const found = dbCategories.find(c => c.nameAr === cat);
    if (found?.image) return found.image;
    return CATEGORY_ICONS[cat] || null;
  }
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]     = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedExtras, setSelectedExtras]   = useState<string[]>([]);
  const [lang, setLang]             = useState<"ar" | "en">("ar");
  const [heroImg, setHeroImg]       = useState(0);

  // Sync language with Navbar & localStorage (supports ?lang=en / ?lang=ar)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get("lang") as "ar" | "en" | null;
      if (urlLang === "ar" || urlLang === "en") {
        setLang(urlLang);
        localStorage.setItem("choco_lang", urlLang);
        window.dispatchEvent(new CustomEvent("choco_lang_change", { detail: urlLang }));
      } else {
        const savedLang = localStorage.getItem("choco_lang") as "ar" | "en";
        if (savedLang === "ar" || savedLang === "en") setLang(savedLang);
      }
    } catch {}

    const onLangChange = (e: any) => {
      const l = e.detail?.lang || e.detail;
      if (l === "ar" || l === "en") setLang(l);
    };
    window.addEventListener("choco_lang_change", onLangChange);
    return () => window.removeEventListener("choco_lang_change", onLangChange);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    setOrderForm((prev) => {
      if (lang === "en") {
        const idxAr = ZONES_AR.findIndex((z) => z.name === prev.zone);
        if (idxAr !== -1) return { ...prev, zone: ZONES_EN[idxAr].name };
      } else {
        const idxEn = ZONES_EN.findIndex((z) => z.name === prev.zone);
        if (idxEn !== -1) return { ...prev, zone: ZONES_AR[idxEn].name };
      }
      return prev;
    });
  }, [lang]);

  const currentZones  = lang === "en" ? ZONES_EN : ZONES_AR;
  const currentExtras = lang === "en" ? EXTRAS_EN : EXTRAS_AR;

  // Customer Account & Modal
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerProfile, setCustomerProfile]     = useState<any>(null);

  // Checkout
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    customerName: "", phone: "", address: "",
    zone: ZONES_AR[0].name, paymentMethod: "cash", notes: "",
  });
  const [placing, setPlacing]     = useState(false);
  const [orderResult, setOrderResult] = useState<{ orderNumber: string } | null>(null);

  // Track
  const [trackQuery, setTrackQuery]   = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError]   = useState("");

  useEffect(() => {
    // Load customer profile from storage if available
    try {
      const rawCust = localStorage.getItem("choco_customer");
      if (rawCust) {
        const cust = JSON.parse(rawCust);
        setCustomerProfile(cust);
        setOrderForm((prev) => ({
          ...prev,
          customerName: prev.customerName || cust.name || "",
          phone: prev.phone || cust.phone || "",
          address: prev.address || cust.address || "",
          zone: cust.zone || prev.zone,
        }));
      }
    } catch {}

    fetch("/api/public/menu")
      .then((r) => r.json())
      .then((d) => { setProducts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d) && d.length > 0) setDbCategories(d); })
      .catch(() => {});

    fetch("/api/public/offers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d && d.cards) setOffers(d); })
      .catch(() => {});
    // rotate hero image every 5s
    const iv = setInterval(() => setHeroImg((n) => (n + 1) % HERO_IMAGES.length), 5000);

    // Listen to navbar cart-open event
    const onOpen = () => setCartOpen(true);
    window.addEventListener("choco_open_cart", onOpen);

    // Listen to navbar customer account event
    const onOpenCustomer = () => setCustomerModalOpen(true);
    window.addEventListener("choco_open_customer", onOpenCustomer);

    return () => {
      clearInterval(iv);
      window.removeEventListener("choco_open_cart", onOpen);
      window.removeEventListener("choco_open_customer", onOpenCustomer);
    };
  }, []);

  const filtered = activeCategory === "الكل"
    ? [...products].sort((a, b) => (CATEGORY_PRIORITY[a.category] || 99) - (CATEGORY_PRIORITY[b.category] || 99))
    : products.filter((p) => p.category === activeCategory);
  const cartTotal  = cart.reduce((s, i) => s + i.unitPrice * i.qty, 0);
  const cartCount  = cart.reduce((s, i) => s + i.qty, 0);

  // Favorites Heart toggle state
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("choco_favorites");
      if (saved) setFavorites(JSON.parse(saved));
    } catch {}
  }, []);

  const toggleFavorite = (productId: string) => {
    playSound("click");
    setFavorites((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem("choco_favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Delivery zone fee lookup
  const zoneIndex  = Math.max(0, currentZones.findIndex((z) => z.name === orderForm.zone));
  const currentZone = currentZones[zoneIndex] || currentZones[0];
  const grandTotal = cartTotal + currentZone.fee;

  // Sync cart count to localStorage so Navbar can read it
  useEffect(() => {
    try {
      localStorage.setItem("choco_cart_count", String(cartCount));
      window.dispatchEvent(new CustomEvent("choco_cart_update"));
    } catch { /* ignore */ }
  }, [cartCount]);

  // Helper to calculate promotional discount on any product
  const getProductPricing = (p: Product) => {
    const d = offers.discount;
    if (offers.enabled === false || !d || !d.enabled || !d.value || d.value <= 0) {
      return { originalPrice: p.basePrice, finalPrice: p.basePrice, hasDiscount: false, badgeText: "" };
    }

    let applies = false;
    if (d.scope === "all") {
      applies = true;
    } else if (d.scope === "category" && d.categoryName) {
      applies = p.category === d.categoryName;
    } else if (d.scope === "products" && d.productIds) {
      applies = d.productIds.includes(p.id);
    }

    if (!applies) {
      return { originalPrice: p.basePrice, finalPrice: p.basePrice, hasDiscount: false, badgeText: "" };
    }

    const discountAmount = d.type === "percentage"
      ? Math.round((p.basePrice * d.value) / 100)
      : d.value;

    const finalPrice = Math.max(1, p.basePrice - discountAmount);
    const badgeText = d.type === "percentage" ? `-${d.value}% 🔥` : `-${d.value} ج 🔥`;

    return {
      originalPrice: p.basePrice,
      finalPrice,
      hasDiscount: true,
      badgeText,
    };
  };

  function addToCart(product: Product, extras: string[]) {
    const pricing = getProductPricing(product);
    const extraPrice = extras.reduce((s, e) => {
      const match = EXTRAS_AR.find((x) => x.label === e) || EXTRAS_EN.find((x) => x.label === e);
      return s + (match?.price || 0);
    }, 0);
    const unitPrice  = pricing.finalPrice + extraPrice;
    setCart((prev) => {
      const key = product.id + extras.sort().join(",");
      const ex  = prev.find((i) => i.product.id + i.extras.sort().join(",") === key);
      if (ex) return prev.map((i) => i.product.id + i.extras.sort().join(",") === key ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1, extras, unitPrice }];
    });
    setSelectedProduct(null);
    setSelectedExtras([]);
    playSound("click");
  }

  function updateQty(idx: number, delta: number) {
    setCart((prev) => {
      const next = prev.map((it, i) => i === idx ? { ...it, qty: it.qty + delta } : it);
      return next.filter((i) => i.qty > 0);
    });
    playSound("click");
  }

  async function placeOrder() {
    if (!orderForm.customerName || !orderForm.phone) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orderForm,
          customerEmail: customerProfile?.email || null,
          items: cart.map((i) => ({ productId: i.product.id, nameAr: i.product.nameAr, nameEn: i.product.nameEn, qty: i.qty, unitPrice: i.unitPrice, extras: i.extras })),
          subtotal: cartTotal,
          deliveryFee: currentZone.fee,
        }),
      });
      const data = await res.json();
      if (res.ok && data.orderNumber) {
        setOrderResult(data);
        // Save customer profile locally for 1-click future orders
        try {
          const profile = {
            id: data.customerId || customerProfile?.id || `cust_${Date.now()}`,
            name: orderForm.customerName,
            phone: orderForm.phone,
            address: orderForm.address,
            zone: orderForm.zone,
            email: customerProfile?.email || null,
          };
          localStorage.setItem("choco_customer", JSON.stringify(profile));
          setCustomerProfile(profile);
          window.dispatchEvent(new CustomEvent("choco_customer_updated"));
        } catch {}
        setCart([]);
        setCheckoutOpen(false);
        setCartOpen(false);
        playSound("success");
      }
    } finally { setPlacing(false); }
  }

  async function trackOrder() {
    if (!trackQuery.trim()) return;
    setTrackLoading(true); setTrackError(""); setTrackResult(null);
    try {
      const res  = await fetch(`/api/public/track?q=${encodeURIComponent(trackQuery.trim())}`);
      const data = await res.json();
      if (res.ok) setTrackResult(data);
      else setTrackError(data.error || (lang === "en" ? "No order found" : "لم يتم العثور على طلب"));
    } finally { setTrackLoading(false); }
  }

  /* ─── INPUT STYLE ─── */
  const inputStyle: React.CSSProperties = {
    width: "100%", height: "44px", background: "#0d0805",
    border: "1px solid #3d1f0a", borderRadius: "12px",
    padding: "0 14px", color: "#ffffff", fontSize: "14px",
    outline: "none", boxSizing: "border-box",
  };

  /* ──────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────── */
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} style={{ minHeight: "100vh", backgroundColor: C.dark, color: C.cream, fontFamily: "var(--font-cairo), system-ui, -apple-system, Arial, sans-serif" }}>
      <style jsx global>{`
        @media (min-width: 769px) {
          .choco-mobile-nav {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          body {
            padding-bottom: 74px !important;
          }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
          HERO — Exact Whacka 1:1 Pixel-Perfect Replica
      ══════════════════════════════════════════════════════════ */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#140b04",
        padding: "44px 0 40px 0",
      }}>
        {/* Exact Whacka Chocolate Waffle Background */}
        <div style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/whacka-hero-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: lang === "ar" ? "left center" : "right center",
          backgroundRepeat: "no-repeat",
          transform: lang === "en" ? "scaleX(-1)" : "none",
        }} />

        {/* Dynamic Gradient Overlay tailored for text visibility */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: lang === "ar"
            ? "linear-gradient(to left, rgba(20, 11, 4, 0.94) 0%, rgba(20, 11, 4, 0.72) 48%, rgba(20, 11, 4, 0.15) 100%)"
            : "linear-gradient(to right, rgba(20, 11, 4, 0.94) 0%, rgba(20, 11, 4, 0.72) 48%, rgba(20, 11, 4, 0.15) 100%)",
          pointerEvents: "none",
        }} />

        {/* ── Hero Content (Compact & Symmetrical) ── */}
        <div style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "0 20px",
          width: "100%",
          boxSizing: "border-box",
        }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "rgba(204, 160, 67, 0.12)",
            border: "1px solid rgba(204, 160, 67, 0.35)",
            borderRadius: "100px",
            padding: "6px 16px",
            fontSize: "13px",
            color: "#cca043",
            fontWeight: 700,
            marginBottom: "16px",
            backdropFilter: "blur(8px)",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            <Sparkles size={13} color="#cca043" />
            <span>{lang === "en" ? "✦ Luxury desserts, made to order ✦" : "حلويات فاخرة تُحضَّر لحظة الطلب"}</span>
          </div>

          {/* Heading — Exact Whacka Letters, Colors & Proportions */}
          <h1 style={{
            margin: "0 0 16px 0",
            lineHeight: 1.22,
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            <span style={{
              color: "#ffffff",
              display: "block",
              fontWeight: 900,
              fontSize: "clamp(36px, 5.4vw, 58px)",
              letterSpacing: lang === "en" ? "-0.2px" : "-0.5px",
              textShadow: "0 2px 14px rgba(0,0,0,0.6)",
            }}>
              {lang === "en" ? "The richest Nutella & Lotus waffle" : "أشهى وافل بنوتيلا ولوتس"}
            </span>
            <span style={{
              color: "#cca043",
              display: "block",
              fontWeight: 900,
              fontSize: "clamp(36px, 5.4vw, 58px)",
              letterSpacing: lang === "en" ? "-0.2px" : "-0.5px",
              marginTop: "4px",
              textShadow: "0 2px 14px rgba(204, 160, 67, 0.3)",
              fontFamily: lang === "en" ? "var(--font-playfair), Georgia, 'Times New Roman', serif" : "var(--font-cairo), system-ui, sans-serif",
            }}>
              {lang === "en" ? "in 6th of October" : "في 6 أكتوبر"}
            </span>
          </h1>

          {/* Subtitle — Exact Whacka Characters & Punctuation */}
          <p style={{
            fontSize: "clamp(14px, 1.5vw, 16.5px)",
            color: "#d0bead",
            marginBottom: "26px",
            fontWeight: 500,
            lineHeight: 1.7,
            maxWidth: "560px",
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            {lang === "en"
              ? "Order delivery and get it hot and fresh in 35 minutes. Original ingredients, premium packaging, a taste that brings you back."
              : "اطلب دليفري يوصلك سخن وطازة في 35 دقيقة، مكونات أصلية، تغليف فخم، وطعم يخليك تطلب تاني."
            }
          </p>

          {/* CTA Buttons — Exact Whacka Styling */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "32px" }}>
            {/* Order Button */}
            <a
              href="#menu"
              style={{
                background: "#cca043",
                color: "#180e06",
                fontWeight: 800,
                padding: "11px 26px",
                borderRadius: "11px",
                textDecoration: "none",
                fontSize: "14.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 16px rgba(204, 160, 67, 0.35)",
                fontFamily: "var(--font-cairo), system-ui, sans-serif",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span>{lang === "en" ? "Order now" : "اطلب الآن"}</span>
              <span style={{ fontSize: "16px", fontWeight: 900 }}>{lang === "en" ? "→" : "←"}</span>
            </a>

            {/* Track Button */}
            <a
              href="#track"
              style={{
                background: "rgba(32, 20, 10, 0.75)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontWeight: 700,
                padding: "11px 22px",
                borderRadius: "11px",
                textDecoration: "none",
                fontSize: "14.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--font-cairo), system-ui, sans-serif",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.5)";
                e.currentTarget.style.color = "#cca043";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.color = "#ffffff";
              }}
            >
              <Truck size={16} color="#e5dcd3" />
              <span>{lang === "en" ? "Track your order" : "تتبع طلبك"}</span>
            </a>
          </div>

          {/* ── Feature Cards (Exact 4 Cards from Whacka: Gold Outline Icons, Compact & Integrated) ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "12px",
          }}>
            {(lang === "en" ? [
              { icon: Truck, text: "Delivery in 35 min" },
              { icon: Star, text: "5-star rated" },
              { icon: Wallet, text: "Cash or InstaPay" },
              { icon: BadgeCheck, text: "Certified kitchen" },
            ] : [
              { icon: Truck, text: "توصيل خلال 35 دقيقة" },
              { icon: Star, text: "تقييم 5 نجوم" },
              { icon: Wallet, text: "كاش أو إنستاباي" },
              { icon: BadgeCheck, text: "كيتشن معتمد" },
            ]).map((b, i) => {
              const IconComp = b.icon;
              return (
                <div
                  key={i}
                  style={{
                    background: "rgba(20, 11, 5, 0.72)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(204, 160, 67, 0.22)",
                    borderRadius: "12px",
                    padding: "11px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <IconComp size={16} color="#cca043" strokeWidth={1.8} style={{ flexShrink: 0 }} />
                  <span style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#e5dcd3",
                    fontFamily: "var(--font-cairo), system-ui, sans-serif",
                    whiteSpace: "nowrap",
                  }}>
                    {b.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SPECIAL OFFERS SECTION — 1:1 Whacka Exact Replica
      ══════════════════════════════════════════════════════════ */}
      {offers.enabled !== false && (
<section id="offers" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "40px 20px 16px 20px",
        boxSizing: "border-box",
      }}>
        {/* Header */}
        <div style={{ marginBottom: "26px" }}>
          <div style={{
            fontSize: "12.5px",
            fontWeight: 800,
            color: "#cca043",
            letterSpacing: "1.2px",
            marginBottom: "5px",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            {lang === "en" ? "LIMITED OFFERS" : (offers.badge || "عروض محدودة")}
          </div>
          <h2 style={{
            fontSize: "clamp(28px, 3.4vw, 38px)",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 6px 0",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
            letterSpacing: "-0.5px",
            lineHeight: 1.25,
          }}>
            {lang === "en" ? "Special Offers" : (offers.title || "العروض الخاصة")}
          </h2>
          <p style={{
            fontSize: "13.5px",
            color: "#a8927e",
            margin: 0,
            fontWeight: 500,
            lineHeight: 1.6,
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            {lang === "en"
              ? "Renewed weekly deals — ask the cashier about today's special"
              : (offers.subtitle || "عروض متجددة كل أسبوع — اسأل الكاشير عن عرض اليوم")}
          </p>
        </div>

        {/* 3 Offer Cards Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}>
          {(lang === "en" ? [
            { id: "combo", title: "Squad Combo", desc: "Waffle + Milkshake + Cheesecake for 299 EGP instead of 320 EGP", icon: "party" },
            { id: "delivery", title: "Free Delivery", desc: "Order above 350 EGP and delivery is on us within 6th of October", icon: "delivery" },
            { id: "student", title: "Student Discount", desc: "10% off the entire menu with your student ID", icon: "student" },
          ] : offers.cards).map((c, i) => (
            <div
              key={c.id || i}
              style={{
                background: "rgba(24, 13, 7, 0.82)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(204, 160, 67, 0.2)",
                borderRadius: "16px",
                padding: "18px 22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.55)";
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.2)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {/* Content */}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: "16px",
                  fontWeight: 800,
                  color: "#cca043",
                  margin: "0 0 5px 0",
                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                }}>
                  {c.title}
                </h3>
                <p style={{
                  fontSize: "12px",
                  color: "#cbbba8",
                  margin: 0,
                  lineHeight: 1.5,
                  fontWeight: 500,
                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                }}>
                  {c.desc}
                </p>
              </div>

              {/* Watermark Icon */}
              <div style={{
                flexShrink: 0,
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "rgba(204, 160, 67, 0.08)",
                border: "1px solid rgba(204, 160, 67, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {renderOfferIcon(c.icon)}
              </div>
            </div>
          ))}
        </div>

        {/* Featured Big Banner */}
        <a
          href={offers.banner?.linkHref || "#menu"}
          style={{
            display: "block",
            textDecoration: "none",
            position: "relative",
            minHeight: "160px",
            borderRadius: "18px",
            overflow: "hidden",
            border: "1px solid rgba(204, 160, 67, 0.25)",
            background: "#160c05",
            transition: "all 0.25s ease",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.6)";
            e.currentTarget.style.transform = "scale(1.008)";
            e.currentTarget.style.boxShadow = "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(204, 160, 67, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(204, 160, 67, 0.25)";
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {/* Banner Photo Background */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/whacka-offers-banner.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />

          {/* Dark Gradient Overlay tailored to text direction */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: lang === "ar"
              ? "linear-gradient(to left, rgba(16, 8, 3, 0.75) 0%, rgba(16, 8, 3, 0.45) 40%, rgba(16, 8, 3, 0.1) 100%)"
              : "linear-gradient(to right, rgba(16, 8, 3, 0.75) 0%, rgba(16, 8, 3, 0.45) 40%, rgba(16, 8, 3, 0.1) 100%)",
          }} />

          {/* Overlay Text positioned on Start side */}
          <div style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            minHeight: "160px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "24px 36px",
            maxWidth: "600px",
          }}>
            <div style={{
              fontSize: "12px",
              fontWeight: 800,
              color: "#cca043",
              marginBottom: "4px",
              fontFamily: "var(--font-cairo), system-ui, sans-serif",
              letterSpacing: "0.5px",
            }}>
              {lang === "en" ? "MOST POPULAR THIS WEEK" : (offers.banner?.badge || "الأكثر طلباً هذا الأسبوع")}
            </div>
            <div style={{
              fontSize: "clamp(22px, 2.8vw, 32px)",
              fontWeight: 900,
              color: "#ffffff",
              marginBottom: "8px",
              lineHeight: 1.2,
              fontFamily: "var(--font-cairo), system-ui, sans-serif",
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.8)",
            }}>
              {lang === "en" ? "Nutella Mini Pancakes" : (offers.banner?.title || "ميني بان كيك نوتيلا")}
            </div>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "#cca043",
              fontWeight: 800,
              fontSize: "13.5px",
              fontFamily: "var(--font-cairo), system-ui, sans-serif",
            }}>
              <span>{lang === "en" ? "See in menu" : (offers.banner?.linkText || "شـوفـه فـي الـمـنـيـو")}</span>
              <span style={{ fontSize: "16px", fontWeight: 900 }}>{lang === "en" ? "→" : "←"}</span>
            </div>
          </div>
        </a>
      </section>
      )}

            {/* ═══════════════════════════════════════════════════════
          MENU SECTION — Dark Luxury Horizontal Cards Layout (Mockup Image 2)
      ══════════════════════════════════════════════════════════ */}
      <section id="menu" style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "44px 20px 64px 20px",
        boxSizing: "border-box",
      }}>
        {/* Header — Clean, Luxurious Typography matching Choco House */}
        <div style={{ marginBottom: "26px" }}>
          <h2 style={{
            fontSize: "clamp(28px, 3.4vw, 38px)",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 6px 0",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
            letterSpacing: "-0.5px",
          }}>
            {lang === "en" ? "Full Menu" : "المنيو الكامل"}
          </h2>
          <p style={{
            fontSize: "13.5px",
            color: "#a8927e",
            margin: 0,
            fontWeight: 500,
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}>
            {lang === "en"
              ? (products.length > 0 ? `${categories.length - 1} categories & ${products.length} items — each crafted to order` : "6 categories & 28 items — each crafted to order")
              : (products.length > 0 ? `${categories.length - 1} أقسام و${products.length} صنفاً — كل صنف يُحضَّر لحظة الطلب` : "6 أقسام و28 صنفاً — كل صنف يُحضَّر لحظة الطلب")
            }
          </p>
        </div>

        {/* ── Active Promotional Discount Banner (Live Discount Engine) ── */}
        {offers.enabled !== false && offers.discount?.enabled && offers.discount.title && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(204, 160, 67, 0.18) 50%, rgba(239, 68, 68, 0.15) 100%)",
              border: "1.5px solid rgba(204, 160, 67, 0.4)",
              borderRadius: "16px",
              padding: "12px 20px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 6px 24px rgba(0, 0, 0, 0.4), 0 0 16px rgba(204, 160, 67, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px" }}>🔥</span>
              <div>
                <div style={{ fontSize: "14.5px", fontWeight: 900, color: "#ffffff" }}>
                  {offers.discount.title}
                </div>
                <div style={{ fontSize: "12px", color: "#a8927e" }}>
                  {offers.discount.scope === "all"
                    ? "يطبق الخصم تلقائياً على جميع أصناف المنيو الآن!"
                    : offers.discount.scope === "category"
                    ? `يطبق الخصم على جميع أصناف قسم (${offers.discount.categoryName})!`
                    : "يطبق الخصم على الأصناف المحددة بالشارة الحمراء 🔥!"}
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#cca043",
                color: "#180e06",
                fontSize: "12.5px",
                fontWeight: 900,
                padding: "4px 14px",
                borderRadius: "100px",
                boxShadow: "0 2px 8px rgba(204, 160, 67, 0.4)",
              }}
            >
              {offers.discount.type === "percentage" ? `خصم ${offers.discount.value}%` : `وفر ${offers.discount.value} ج.م`}
            </div>
          </div>
        )}

        {/* Category Navigation Bar — Visual Circular Carousel matching Image 2 */}
        <div style={{
          display: "flex",
          gap: "14px",
          overflowX: "auto",
          padding: "4px 4px 18px 4px",
          marginBottom: "20px",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const catLabel = lang === "en" ? (CATEGORY_NAMES_EN[cat] || cat) : cat;
            const imgSrc = getCategoryIcon(cat);
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); playSound("click"); }}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px 6px",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Circular image badge in dark chocolate with gold border */}
                <div style={{
                  width: "66px",
                  height: "66px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  backgroundColor: "rgba(36, 22, 12, 0.85)",
                  border: isActive ? "3px solid #cca043" : "1.5px solid rgba(204, 160, 67, 0.25)",
                  boxShadow: isActive ? "0 4px 18px rgba(204, 160, 67, 0.45)" : "0 2px 8px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={catLabel}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fb = e.currentTarget.parentElement?.querySelector(".cat-emoji-fb") as HTMLElement | null;
                        if (fb) fb.style.display = "flex";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : null}
                  <span
                    className="cat-emoji-fb"
                    style={{
                      fontSize: "26px",
                      display: imgSrc ? "none" : "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {CATEGORY_EMOJI[cat] || "🍫"}
                  </span>
                </div>

                {/* Category Label Pill */}
                <span style={{
                  fontSize: "13px",
                  fontWeight: isActive ? 900 : 700,
                  color: isActive ? "#180e06" : "#e5dcd3",
                  backgroundColor: isActive ? "#cca043" : "rgba(36, 22, 12, 0.72)",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  border: isActive ? "1px solid #cca043" : "1px solid rgba(204, 160, 67, 0.18)",
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? "0 3px 12px rgba(204, 160, 67, 0.35)" : "none",
                }}>
                  {catLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Products Listing — Horizontal Row Cards Layout matching Image 2 */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#a8927e" }}>
            <div style={{ fontSize: "40px", marginBottom: "16px" }}>🍫</div>
            <p style={{ fontSize: "16px", fontFamily: "var(--font-cairo), sans-serif" }}>
              {lang === "en" ? "Loading menu..." : "جاري تحميل المنيو..."}
            </p>
          </div>
        ) : (
          <div>
            {(activeCategory === "الكل"
              ? categories.filter(c => c !== "الكل" && products.some(p => p.category === c))
              : [activeCategory]
            ).map((catName) => {
              const catProducts = products.filter(p => p.category === catName);
              if (catProducts.length === 0) return null;

              return (
                <div key={catName} style={{ marginBottom: "40px" }}>
                  {/* Category Ornamental Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "14px",
                    margin: "24px 0 20px",
                    textAlign: "center",
                  }}>
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, rgba(204, 160, 67, 0.4))" }} />
                    <div>
                      <div style={{
                        fontSize: "22px",
                        fontWeight: 900,
                        color: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        justifyContent: "center",
                        fontFamily: "var(--font-cairo), system-ui, sans-serif",
                      }}>
                        <span style={{ fontSize: "24px" }}>{CATEGORY_EMOJI[catName] || "🍫"}</span>
                        <span>{lang === "en" ? (CATEGORY_NAMES_EN[catName] || catName) : catName}</span>
                      </div>
                      <div style={{
                        fontSize: "12.5px",
                        color: "#a8927e",
                        fontWeight: 600,
                        marginTop: "2px",
                        fontFamily: "var(--font-cairo), system-ui, sans-serif",
                      }}>
                        {CATEGORY_SUBTITLES[catName] || (lang === "en" ? "Crafted fresh with authentic luxury chocolate" : "مُحضّر طازجاً بأجود أنواع الشوكولاتة البلجيكية والمكونات الفاخرة")}
                      </div>
                    </div>
                    <div style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, rgba(204, 160, 67, 0.4))" }} />
                  </div>

                  {/* Horizontal Cards Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                    gap: "16px",
                  }}>
                    {catProducts.map((p) => {
                      const productName = lang === "en" ? (PRODUCT_NAMES_EN[p.nameAr] || p.nameEn || p.nameAr) : p.nameAr;
                      const description = lang === "en"
                        ? (PRODUCT_DESCRIPTIONS_EN[p.nameAr] || PRODUCT_DESCRIPTIONS_EN[p.nameEn] || "Original luxury ingredients prepared fresh to order.")
                        : (PRODUCT_DESCRIPTIONS_AR[p.nameAr] || p.description || "مكونات أصلية فاخرة تُحضّر خصيصاً ولحظة الطلب.");
                      const imgSrc = p.image || CATEGORY_FALLBACK[p.category];
                      const inCartQty = cart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
                      const isFav = favorites.includes(p.id);
                      const pricing = getProductPricing(p);

                      return (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedProduct(p); setSelectedExtras([]); playSound("click"); }}
                          style={{
                            backgroundColor: "rgba(24, 13, 7, 0.88)",
                            border: "1px solid rgba(204, 160, 67, 0.18)",
                            borderRadius: "20px",
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: "16px",
                            cursor: "pointer",
                            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                            transition: "all 0.2s ease",
                            position: "relative",
                            overflow: "hidden",
                          }}
                          onMouseEnter={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.borderColor = "rgba(204, 160, 67, 0.55)";
                            el.style.transform = "translateY(-3px)";
                            el.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(204, 160, 67, 0.2)";
                          }}
                          onMouseLeave={(e) => {
                            const el = e.currentTarget as HTMLDivElement;
                            el.style.borderColor = "rgba(204, 160, 67, 0.18)";
                            el.style.transform = "translateY(0)";
                            el.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.4)";
                          }}
                        >
                          {/* Food Photo Container (Rendered first: Right in RTL, Left in LTR) */}
                          <div style={{
                            width: "115px",
                            height: "115px",
                            flexShrink: 0,
                            borderRadius: "16px",
                            overflow: "hidden",
                            backgroundColor: "rgba(36, 22, 12, 0.72)",
                            border: "1px solid rgba(204, 160, 67, 0.25)",
                            boxShadow: "0 3px 12px rgba(0, 0, 0, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                          }}>
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={productName}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  transition: "transform 0.3s ease",
                                }}
                                loading="lazy"
                                onError={(e) => {
                                  const img = e.currentTarget;
                                  const fallback = CATEGORY_FALLBACK[p.category];
                                  if (fallback && !img.dataset.triedFallback) {
                                    img.dataset.triedFallback = "true";
                                    img.src = fallback;
                                  } else {
                                    img.style.display = "none";
                                    const fb = img.parentElement?.querySelector(".prod-emoji-fb") as HTMLElement | null;
                                    if (fb) fb.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <span
                              className="prod-emoji-fb"
                              style={{
                                fontSize: "38px",
                                display: imgSrc ? "none" : "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {CATEGORY_EMOJI[p.category] || "🍫"}
                            </span>
                          </div>

                          {/* Details (Left in RTL, Right in LTR) */}
                          <div style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            minHeight: "105px",
                          }}>
                            <div>
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "6px",
                                marginBottom: "4px",
                              }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  <span style={{
                                    fontSize: "16.5px",
                                    fontWeight: 900,
                                    color: "#ffffff",
                                    lineHeight: 1.3,
                                    fontFamily: "var(--font-cairo), system-ui, sans-serif",
                                  }}>
                                    {productName}
                                  </span>
                                  {(p.basePrice >= 120 || p.sortOrder === 1) && (
                                    <span title="الأكثر طلباً" style={{ fontSize: "14px" }}>👑</span>
                                  )}
                                  {pricing.hasDiscount && (
                                    <span
                                      style={{
                                        background: "rgba(239, 68, 68, 0.18)",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        color: "#f87171",
                                        fontSize: "10.5px",
                                        fontWeight: 900,
                                        padding: "1px 6px",
                                        borderRadius: "6px",
                                      }}
                                    >
                                      {pricing.badgeText}
                                    </span>
                                  )}
                                </div>

                                {/* Favorite Heart Toggle */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(p.id);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: isFav ? "#ef4444" : "rgba(204, 160, 67, 0.45)",
                                    cursor: "pointer",
                                    padding: "2px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "transform 0.15s ease",
                                  }}
                                  title={isFav ? "إزالة من المفضلة" : "إضافة للمفضلة"}
                                >
                                  <Heart size={18} fill={isFav ? "#ef4444" : "none"} />
                                </button>
                              </div>

                              <p style={{
                                margin: 0,
                                fontSize: "12.5px",
                                color: "#a8927e",
                                lineHeight: 1.45,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                fontFamily: "var(--font-cairo), system-ui, sans-serif",
                              }}>
                                {description}
                              </p>
                            </div>

                            {/* Bottom row: Price + Add Button */}
                            <div style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              marginTop: "10px",
                              paddingTop: "6px",
                              borderTop: "1px dashed rgba(204, 160, 67, 0.2)",
                            }}>
                              <div style={{
                                fontSize: "17px",
                                fontWeight: 900,
                                color: "#cca043",
                                display: "flex",
                                alignItems: "baseline",
                                gap: "6px",
                                fontFamily: "var(--font-cairo), system-ui, sans-serif",
                              }}>
                                {pricing.hasDiscount ? (
                                  <>
                                    <del style={{ fontSize: "12px", color: "#a8927e", textDecoration: "line-through" }}>
                                      {p.basePrice}
                                    </del>
                                    <span style={{ fontSize: "17.5px", fontWeight: 900, color: "#22c55e" }}>
                                      {pricing.finalPrice}
                                    </span>
                                    <span style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700 }}>
                                      {lang === "en" ? "EGP" : "ج.م"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>{p.basePrice}</span>
                                    <span style={{ fontSize: "12px", color: "#a8927e", fontWeight: 700 }}>
                                      {lang === "en" ? "EGP" : "ج.م"}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Quick Add Pill Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(p, []);
                                }}
                                style={{
                                  backgroundColor: inCartQty > 0 ? "#dfb252" : "#cca043",
                                  color: "#180e06",
                                  border: "none",
                                  borderRadius: "100px",
                                  padding: "6px 16px",
                                  fontSize: "12.5px",
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  boxShadow: inCartQty > 0 ? "0 2px 10px rgba(204,160,67,0.5)" : "0 2px 8px rgba(0,0,0,0.3)",
                                  transition: "all 0.15s ease",
                                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = "#dfb252";
                                  e.currentTarget.style.transform = "scale(1.05)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = inCartQty > 0 ? "#dfb252" : "#cca043";
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                              >
                                <span>{inCartQty > 0 ? `✓ (${inCartQty})` : (lang === "en" ? "+ Add" : "+ أضف")}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
            {/* ── Promo Banner: "كل لقمة حكاية لذة ♡" (Mockup Image 2) ── */}
            <div
              style={{
                marginTop: "48px",
                background: "linear-gradient(135deg, rgba(34, 19, 10, 0.95) 0%, rgba(20, 11, 5, 0.98) 100%)",
                border: "1.5px solid rgba(204, 160, 67, 0.35)",
                borderRadius: "24px",
                padding: "28px 32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "24px",
                flexWrap: "wrap",
                boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(204, 160, 67, 0.12)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  right: "-50px",
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(204, 160, 67, 0.25) 0%, transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              <div style={{ flex: "1 1 320px", zIndex: 1 }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(204, 160, 67, 0.15)",
                    border: "1px solid rgba(204, 160, 67, 0.3)",
                    padding: "4px 14px",
                    borderRadius: "100px",
                    color: "#cca043",
                    fontSize: "12px",
                    fontWeight: 800,
                    marginBottom: "12px",
                  }}
                >
                  <Sparkles size={14} />
                  <span>{lang === "en" ? "Choco House Signature" : "شوكو هاوس — حكاية المذاق الأصيل"}</span>
                </div>

                <h3
                  style={{
                    fontSize: "24px",
                    fontWeight: 900,
                    color: "#ffffff",
                    margin: "0 0 8px 0",
                    lineHeight: 1.3,
                    fontFamily: "var(--font-cairo), system-ui, sans-serif",
                  }}
                >
                  {lang === "en" ? "Every bite is a story of bliss ♡" : "كل لقمة حكاية لذة ♡"}
                </h3>

                <p
                  style={{
                    fontSize: "13.5px",
                    color: "#a8927e",
                    lineHeight: 1.6,
                    margin: "0 0 20px 0",
                    maxWidth: "460px",
                    fontFamily: "var(--font-cairo), system-ui, sans-serif",
                  }}
                >
                  {lang === "en"
                    ? "Freshly baked waffles, rich Belgian chocolate, and decadent desserts made to elevate your moments."
                    : "وافل ساخن يخبز أمامك لحظة بلحظة، مغطى بأفخر أنواع الشوكولاتة البلجيكية الغنية وحلويات تُعد بكل شغف لتُسعد كل حواسك."}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    const menuEl = document.getElementById("menu");
                    if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
                    playSound("click");
                  }}
                  style={{
                    background: "#cca043",
                    color: "#180e06",
                    border: "none",
                    borderRadius: "12px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(204, 160, 67, 0.4)",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dfb252")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#cca043")}
                >
                  <span>{lang === "en" ? "Order Now ›" : "اطلب الآن ›"}</span>
                </button>
              </div>

              <div
                style={{
                  width: "180px",
                  height: "180px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "2px solid rgba(204, 160, 67, 0.35)",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <img
                  src="/categories/waffle.jpg"
                  alt="Choco House Signature Dessert"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          TRACK ORDER SECTION
      ══════════════════════════════════════════════════════════ */}
      <section id="track" style={{
        background: "linear-gradient(135deg, #120a04 0%, #1a0d05 100%)",
        borderTop: `1px solid ${C.border}`,
        padding: "64px 20px",
      }}>
        <div style={{ maxWidth: "540px", margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.gold, letterSpacing: "2px", marginBottom: "8px" }}>● TRACK</div>
          <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", marginBottom: "8px" }}>
            {lang === "en" ? "Track your order 📦" : "تتبع طلبك 📦"}
          </h2>
          <p style={{ fontSize: "14px", color: C.muted, marginBottom: "28px" }}>
            {lang === "en" ? "Enter order number or your phone number" : "أدخل رقم الطلب أو رقم موبايلك"}
          </p>

          <div style={{ display: "flex", gap: "10px" }}>
            <input
              value={trackQuery}
              onChange={(e) => setTrackQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && trackOrder()}
              placeholder={lang === "en" ? "CH-20261027-1234 or 01091413470" : "CH-20261027-1234 أو 01091413470"}
              style={{
                flex: 1, height: "52px", background: C.dark,
                border: `1px solid ${C.border}`, borderRadius: "14px",
                padding: "0 18px", color: "#ffffff", fontSize: "13px",
                outline: "none", fontFamily: "monospace",
              }}
            />
            <button onClick={trackOrder} disabled={trackLoading} style={{
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
              color: C.dark, fontWeight: 900, padding: "0 24px", height: "52px",
              borderRadius: "14px", border: "none", cursor: "pointer",
              fontSize: "14px", display: "flex", alignItems: "center", gap: "6px",
              minWidth: "100px",
            }}>
              {trackLoading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><Search size={16} /> {lang === "en" ? "Search" : "بحث"}</>}
            </button>
          </div>

          {trackError && <p style={{ marginTop: "14px", color: "#ef4444", fontSize: "14px" }}>{trackError}</p>}

          {trackResult && (
            <div style={{
              marginTop: "24px", background: C.dark,
              border: `1px solid ${C.border}`, borderRadius: "20px",
              padding: "24px", textAlign: lang === "ar" ? "right" : "left",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "center" }}>
                <span style={{ fontFamily: "monospace", color: C.gold, fontWeight: 900, fontSize: "15px" }}>
                  {trackResult.orderNumber}
                </span>
                <span style={{
                  fontWeight: 700, fontSize: "13px",
                  color: (lang === "en" ? ORDER_STATUSES_EN : ORDER_STATUSES_AR)[trackResult.status]?.color || "#ffffff",
                  background: `${(lang === "en" ? ORDER_STATUSES_EN : ORDER_STATUSES_AR)[trackResult.status]?.color || "#ffffff"}20`,
                  padding: "4px 12px", borderRadius: "100px",
                }}>
                  {(lang === "en" ? ORDER_STATUSES_EN : ORDER_STATUSES_AR)[trackResult.status]?.label || trackResult.status}
                </span>
              </div>
              <p style={{ fontSize: "13px", color: C.muted }}>
                {trackResult.customerName} — {lang === "en" ? "Total: " : "إجمالي: "}
                <strong style={{ color: C.gold }}>
                  {lang === "en" ? `EGP ${trackResult.total}` : `${trackResult.total} ج`}
                </strong>
              </p>
              {(trackResult.timeline || []).length > 0 && (
                <div style={{ marginTop: "16px", borderTop: `1px solid ${C.border}`, paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(trackResult.timeline || []).map((t: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: C.muted }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.gold, flexShrink: 0 }} />
                      <span>{(lang === "en" ? ORDER_STATUSES_EN : ORDER_STATUSES_AR)[t.stage]?.label || t.stage}</span>
                      <span style={{ marginInlineStart: "auto", color: C.muted2, fontSize: "11px" }}>
                        {new Date(t.at).toLocaleTimeString(lang === "en" ? "en-US" : "ar-EG")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          INFO SECTION — location, hours, contact
      ══════════════════════════════════════════════════════════ */}
      <section id="about" style={{ maxWidth: "1000px", margin: "0 auto", padding: "64px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.gold, letterSpacing: "2px", marginBottom: "8px" }}>● ABOUT</div>
          <h2 style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff", margin: 0 }}>
            {lang === "en" ? "About Choco House" : "عن Choco House"}
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "20px" }}>
          {(lang === "en" ? [
            {
              icon: <MapPin size={28} color={C.gold} />,
              title: "Our Location",
              body: "District 2, Block 3, Building 3\n6th of October — Delivery only",
            },
            {
              icon: <Clock size={28} color={C.gold} />,
              title: "Opening Hours",
              body: "Midnight to 2 AM\n& 4 PM to Midnight\nDaily",
            },
            {
              icon: <Phone size={28} color={C.gold} />,
              title: "Contact Us",
              body: "01091413470\nCash | InstaPay | Wallet | Card",
            },
          ] : [
            {
              icon: <MapPin size={28} color={C.gold} />,
              title: "موقعنا",
              body: "الحي الثاني، قطعة 3، مبنى 3\nالسادس من أكتوبر — توصيل فقط",
            },
            {
              icon: <Clock size={28} color={C.gold} />,
              title: "مواعيد الفتح",
              body: "منتصف الليل لـ 2 ص\nو 4 م لـ منتصف الليل\nيومياً",
            },
            {
              icon: <Phone size={28} color={C.gold} />,
              title: "تواصل معنا",
              body: "01091413470\nكاش | إنستاباي | محفظة | كارت",
            },
          ]).map((c, i) => (
            <div key={i} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: "20px", padding: "28px 24px", textAlign: "center",
              transition: "border-color 0.2s",
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.gold; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "14px" }}>{c.icon}</div>
              <h3 style={{ fontWeight: 800, color: "#ffffff", marginBottom: "10px", fontSize: "16px" }}>{c.title}</h3>
              <p style={{ fontSize: "14px", color: C.muted, whiteSpace: "pre-line", lineHeight: 1.8 }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: "1px solid rgba(204, 160, 67, 0.15)",
        padding: "36px 20px 48px",
        textAlign: "center",
        background: "rgba(13, 8, 5, 0.95)",
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              background: "#cca043", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{
                fontSize: "13px", fontWeight: 700, color: "#180e06",
                fontFamily: "var(--font-playfair), Georgia, serif",
              }}>CH</span>
            </div>
            <span style={{
              fontFamily: "var(--font-playfair), Georgia, serif",
              fontSize: "17px", fontWeight: 700, color: "#f5ede4",
            }}>
              Choco House <span style={{ color: "#cca043", fontSize: "11px", letterSpacing: "2px" }}>{lang === "en" ? "DESSERTS" : "ديسرتس"}</span>
            </span>
          </div>

          {/* Android App Download Banner */}
          <Link
            href="/download"
            onClick={() => playSound("click")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(204, 160, 67, 0.1)",
              border: "1px solid rgba(204, 160, 67, 0.3)",
              padding: "7px 18px",
              borderRadius: "100px",
              color: "#e6c37a",
              textDecoration: "none",
              fontSize: "12.5px",
              fontWeight: 800,
              transition: "all 0.2s ease",
            }}
          >
            <span>📱 {lang === "en" ? "Download Android App (APK)" : "تحميل تطبيق الأندرويد الرسمي (APK) والـ QR"}</span>
            <span style={{ color: "#4ade80", fontSize: "11px" }}>● v1.0.0</span>
          </Link>

          <p style={{ fontSize: "13px", color: C.muted, margin: 0 }}>
            {lang === "en"
              ? "© 2026 Choco House Desserts. Luxury desserts made to order in 6th of October."
              : "© 2026 شوكو هاوس ديسرتس. حلويات فاخرة تُحضّر طازجة لحظة الطلب في 6 أكتوبر."}
          </p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════
          FLOATING CART BUTTON
      ══════════════════════════════════════════════════════════ */}
      {cartCount > 0 && !cartOpen && (
        <button onClick={() => { setCartOpen(true); playSound("click"); }} style={{
          position: "fixed", bottom: "24px",
          ...(lang === "ar" ? { right: "20px" } : { left: "20px" }),
          zIndex: 40,
          background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
          color: C.dark, fontWeight: 900, padding: "14px 22px",
          borderRadius: "20px", border: "none", cursor: "pointer",
          fontSize: "14px", display: "flex", alignItems: "center", gap: "10px",
          boxShadow: "0 6px 28px rgba(200,134,10,0.55)",
          animation: "pulse-glow 2s infinite",
        }}>
          <ShoppingCart size={18} />
          <span>{lang === "en" ? `${cartCount} ${cartCount === 1 ? "item" : "items"}` : `${cartCount} صنف`}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>{lang === "en" ? `EGP ${cartTotal}` : `${cartTotal} ج`}</span>
        </button>
      )}

      {/* ═══════════════════════════════════════════════════════
          CART DRAWER
      ══════════════════════════════════════════════════════════ */}
      {cartOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, display: "flex",
          justifyContent: lang === "ar" ? "flex-end" : "flex-start",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} onClick={() => setCartOpen(false)} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "420px",
            background: "#120a04",
            borderLeft: lang === "ar" ? `1px solid ${C.border}` : "none",
            borderRight: lang === "en" ? `1px solid ${C.border}` : "none",
            height: "100%", display: "flex", flexDirection: "column",
            boxShadow: lang === "ar" ? "-8px 0 40px rgba(0,0,0,0.6)" : "8px 0 40px rgba(0,0,0,0.6)",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "18px 20px", borderBottom: `1px solid ${C.border}`,
            }}>
              <h2 style={{ fontWeight: 900, color: "#ffffff", fontSize: "18px", margin: 0 }}>
                🛒 {lang === "en" ? "Cart" : "السلة"} ({cartCount})
              </h2>
              <button onClick={() => setCartOpen(false)} style={{
                background: "rgba(255,255,255,0.08)", border: "none",
                cursor: "pointer", color: C.muted, padding: "8px",
                borderRadius: "10px",
              }}>
                <X size={20} />
              </button>
            </div>

            {cart.length === 0 ? (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", color: C.muted, gap: "14px",
              }}>
                <span style={{ fontSize: "56px" }}>🛒</span>
                <p style={{ fontSize: "16px" }}>{lang === "en" ? "Cart is empty" : "السلة فارغة"}</p>
              </div>
            ) : (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  {cart.map((item, idx) => {
                    const itemName = lang === "en" ? (PRODUCT_NAMES_EN[item.product.nameAr] || item.product.nameEn || item.product.nameAr) : item.product.nameAr;
                    return (
                      <div key={idx} style={{
                        background: C.card, border: `1px solid ${C.border}`,
                        borderRadius: "16px", padding: "12px", display: "flex", gap: "12px",
                      }}>
                        <div style={{
                          width: "60px", height: "60px", borderRadius: "12px",
                          background: C.card2, overflow: "hidden", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {item.product.image
                            ? <img src={item.product.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            : <span style={{ fontSize: "28px" }}>{CATEGORY_EMOJI[item.product.category] || "🍫"}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: "#ffffff", fontSize: "14px", margin: 0 }}>{itemName}</p>
                          {item.extras.length > 0 && (
                            <p style={{ fontSize: "11px", color: C.muted, marginTop: "3px" }}>{item.extras.join(" + ")}</p>
                          )}
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px" }}>
                            <span style={{ fontWeight: 900, color: C.gold, fontSize: "15px" }}>
                              {lang === "en" ? `EGP ${item.unitPrice * item.qty}` : `${item.unitPrice * item.qty} ج`}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <button onClick={() => updateQty(idx, -1)} style={{
                                width: "30px", height: "30px", borderRadius: "8px",
                                background: "#3d1f0a", border: "none", color: "#fff",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Minus size={14} />
                              </button>
                              <span style={{ fontWeight: 900, color: "#fff", width: "22px", textAlign: "center", fontSize: "15px" }}>
                                {item.qty}
                              </span>
                              <button onClick={() => updateQty(idx, 1)} style={{
                                width: "30px", height: "30px", borderRadius: "8px",
                                background: "#3d1f0a", border: "none", color: "#fff",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: "18px 20px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                      <span>{lang === "en" ? "Products" : "المنتجات"}</span>
                      <span>{lang === "en" ? `EGP ${cartTotal}` : `${cartTotal} ج`}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                      <span>{lang === "en" ? "Delivery" : "توصيل"}</span>
                      <span>{lang === "en" ? `EGP ${currentZone.fee}` : `${currentZone.fee} ج`}</span>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      color: "#ffffff", fontWeight: 900, fontSize: "17px",
                      borderTop: `1px solid ${C.border}`, paddingTop: "10px", marginTop: "4px",
                    }}>
                      <span>{lang === "en" ? "Total" : "الإجمالي"}</span>
                      <span style={{ color: C.gold }}>{lang === "en" ? `EGP ${grandTotal}` : `${grandTotal} ج`}</span>
                    </div>
                  </div>
                  <button onClick={() => { setCheckoutOpen(true); setCartOpen(false); playSound("click"); }} style={{
                    width: "100%",
                    background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                    color: C.dark, fontWeight: 900, padding: "15px",
                    borderRadius: "14px", border: "none", cursor: "pointer", fontSize: "16px",
                    boxShadow: "0 4px 20px rgba(200,134,10,0.4)",
                  }}>
                    {lang === "en" ? "Proceed to Checkout 🛵" : "إتمام الطلب 🛵"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          PRODUCT DETAIL MODAL
      ══════════════════════════════════════════════════════════ */}
      {selectedProduct && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} onClick={() => setSelectedProduct(null)} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "460px",
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: "28px 28px 0 0", padding: "24px",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.5)",
            maxHeight: "92vh", overflowY: "auto",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            <button onClick={() => setSelectedProduct(null)} style={{
              position: "absolute", top: "16px", [lang === "en" ? "right" : "left"]: "16px",
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: "10px", padding: "7px", cursor: "pointer", color: C.muted,
            }}>
              <X size={20} />
            </button>

            <div style={{
              width: "100%", height: "220px", borderRadius: "18px",
              background: C.card2, overflow: "hidden", marginBottom: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {(selectedProduct.image || CATEGORY_FALLBACK[selectedProduct.category]) ? (
                <img
                  src={selectedProduct.image || CATEGORY_FALLBACK[selectedProduct.category]}
                  alt={lang === "en" ? (PRODUCT_NAMES_EN[selectedProduct.nameAr] || selectedProduct.nameEn) : selectedProduct.nameAr}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (CATEGORY_FALLBACK[selectedProduct.category] && img.src !== CATEGORY_FALLBACK[selectedProduct.category]) {
                      img.src = CATEGORY_FALLBACK[selectedProduct.category];
                    } else {
                      img.style.display = "none";
                    }
                  }}
                />
              ) : (
                <span style={{ fontSize: "72px" }}>{CATEGORY_EMOJI[selectedProduct.category] || "🍫"}</span>
              )}
            </div>

            <h3 style={{ fontWeight: 900, color: "#ffffff", fontSize: "22px", margin: 0 }}>
              {lang === "en" ? (PRODUCT_NAMES_EN[selectedProduct.nameAr] || selectedProduct.nameEn) : selectedProduct.nameAr}
            </h3>
            <p style={{ fontSize: "13px", color: C.muted, marginTop: "6px", lineHeight: "1.6" }}>
              {lang === "en"
                ? (PRODUCT_DESCRIPTIONS_EN[selectedProduct.nameAr] || selectedProduct.nameEn)
                : (PRODUCT_DESCRIPTIONS_AR[selectedProduct.nameAr] || selectedProduct.description || "")}
            </p>
            {getProductPricing(selectedProduct).hasDiscount ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "12px" }}>
                <del style={{ color: "#a8927e", fontSize: "16px", textDecoration: "line-through" }}>
                  {selectedProduct.basePrice}
                </del>
                <p style={{ color: "#22c55e", fontWeight: 900, fontSize: "26px", margin: 0 }}>
                  {lang === "en"
                    ? `EGP ${getProductPricing(selectedProduct).finalPrice + selectedExtras.reduce((s, e) => s + (currentExtras.find((x) => x.label === e)?.price || 0), 0)}`
                    : `${getProductPricing(selectedProduct).finalPrice + selectedExtras.reduce((s, e) => s + (currentExtras.find((x) => x.label === e)?.price || 0), 0)} ج.م`}
                </p>
              </div>
            ) : (
              <p style={{ color: C.gold, fontWeight: 900, fontSize: "24px", marginTop: "12px" }}>
                {lang === "en"
                  ? `EGP ${selectedProduct.basePrice + selectedExtras.reduce((s, e) => s + (currentExtras.find((x) => x.label === e)?.price || 0), 0)}`
                  : `${selectedProduct.basePrice + selectedExtras.reduce((s, e) => s + (currentExtras.find((x) => x.label === e)?.price || 0), 0)} ج`}
              </p>
            )}

            <div style={{ marginTop: "18px" }}>
              <p style={{ fontSize: "13px", fontWeight: 700, color: C.muted, marginBottom: "12px" }}>
                {lang === "en" ? "Add-ons (optional):" : "إضافات (اختياري):"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {currentExtras.map((ex) => {
                  const isSelected = selectedExtras.includes(ex.label);
                  return (
                    <button key={ex.label}
                      onClick={() => {
                        setSelectedExtras((p) => p.includes(ex.label) ? p.filter((e) => e !== ex.label) : [...p, ex.label]);
                        playSound("click");
                      }}
                      style={{
                        padding: "11px 14px", borderRadius: "12px", fontSize: "13px", fontWeight: 700,
                        cursor: "pointer", border: "1px solid",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "all 0.15s",
                        background: isSelected ? C.gold : C.card2,
                        borderColor: isSelected ? C.gold : C.border,
                        color: isSelected ? C.dark : C.muted,
                      }}
                    >
                      <span>{ex.label}</span>
                      <span style={{ opacity: 0.7, fontSize: "11px" }}>+{ex.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={() => addToCart(selectedProduct, selectedExtras)} style={{
              width: "100%", marginTop: "22px",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
              color: C.dark, fontWeight: 900, padding: "15px",
              borderRadius: "14px", border: "none", cursor: "pointer",
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              boxShadow: "0 4px 20px rgba(200,134,10,0.4)",
            }}>
              <ShoppingCart size={18} /> {lang === "en" ? "Add to Cart" : "أضف للسلة"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          CHECKOUT MODAL
      ══════════════════════════════════════════════════════════ */}
      {checkoutOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)" }} onClick={() => setCheckoutOpen(false)} />
          <div style={{
            position: "relative", width: "100%", maxWidth: "460px",
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: "24px", padding: "28px",
            boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            maxHeight: "92vh", overflowY: "auto",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            <button onClick={() => setCheckoutOpen(false)} style={{
              position: "absolute", top: "18px", [lang === "en" ? "right" : "left"]: "18px",
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: "10px", padding: "7px", cursor: "pointer", color: C.muted,
            }}>
              <X size={20} />
            </button>
            <h3 style={{ fontWeight: 900, color: "#ffffff", fontSize: "22px", margin: "0 0 24px 0" }}>
              {lang === "en" ? "Confirm Order 🛵" : "تأكيد الطلب 🛵"}
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <input type="text"
                placeholder={lang === "en" ? "Your name here *" : "اسمك هنا *"}
                value={orderForm.customerName}
                onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                style={inputStyle}
              />
              <input type="tel" dir="ltr"
                placeholder="01xxxxxxxxx *"
                value={orderForm.phone}
                onChange={(e) => setOrderForm({ ...orderForm, phone: e.target.value })}
                style={inputStyle}
              />
              <input type="text"
                placeholder={lang === "en" ? "Building / Floor / Apartment" : "القطعة / المبنى / الدور / الشقة"}
                value={orderForm.address}
                onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                style={inputStyle}
              />

              <select value={orderForm.zone} onChange={(e) => setOrderForm({ ...orderForm, zone: e.target.value })}
                style={{ ...inputStyle, height: "46px" }}>
                {currentZones.map((z) => (
                  <option key={z.name} value={z.name}>
                    {z.name} — {lang === "en" ? `${z.fee} EGP delivery` : `${z.fee} ج توصيل`}
                  </option>
                ))}
              </select>

              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: C.muted, marginBottom: "10px" }}>
                  {lang === "en" ? "Payment Method" : "طريقة الدفع"}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  {[
                    { val: "cash",     label: lang === "en" ? "💵 Cash" : "💵 كاش" },
                    { val: "instapay", label: lang === "en" ? "InstaPay" : "إنستاباي" },
                    { val: "card",     label: lang === "en" ? "💳 Card" : "💳 كارت" },
                  ].map((pm) => (
                    <button key={pm.val} onClick={() => setOrderForm({ ...orderForm, paymentMethod: pm.val })} style={{
                      padding: "11px 8px", borderRadius: "12px", fontSize: "13px", fontWeight: 700,
                      cursor: "pointer", border: "1px solid", transition: "all 0.15s",
                      background: orderForm.paymentMethod === pm.val ? C.gold : C.card2,
                      borderColor: orderForm.paymentMethod === pm.val ? C.gold : C.border,
                      color: orderForm.paymentMethod === pm.val ? C.dark : C.muted,
                    }}>
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                placeholder={lang === "en" ? "Special notes..." : "ملاحظات خاصة..."} rows={2}
                style={{
                  width: "100%", background: C.dark, border: `1px solid ${C.border}`,
                  borderRadius: "12px", padding: "12px 14px", color: "#ffffff", fontSize: "14px",
                  outline: "none", resize: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Order Summary */}
            <div style={{
              background: C.dark, borderRadius: "16px",
              padding: "18px", margin: "20px 0",
              display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                <span>{lang === "en" ? "Products" : "المنتجات"}</span>
                <span>{lang === "en" ? `EGP ${cartTotal}` : `${cartTotal} ج`}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.muted }}>
                <span>{lang === "en" ? `Delivery (${currentZone.name})` : `توصيل (${currentZone.name})`}</span>
                <span>{lang === "en" ? `EGP ${currentZone.fee}` : `${currentZone.fee} ج`}</span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                color: "#ffffff", fontWeight: 900, fontSize: "17px",
                borderTop: `1px solid ${C.border}`, paddingTop: "10px", marginTop: "4px",
              }}>
                <span>{lang === "en" ? "Total" : "الإجمالي"}</span>
                <span style={{ color: C.gold }}>{lang === "en" ? `EGP ${grandTotal}` : `${grandTotal} ج`}</span>
              </div>
            </div>

            <button onClick={placeOrder}
              disabled={placing || !orderForm.customerName || !orderForm.phone}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                color: C.dark, fontWeight: 900, padding: "16px",
                borderRadius: "14px", border: "none", cursor: "pointer",
                fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                opacity: (placing || !orderForm.customerName || !orderForm.phone) ? 0.5 : 1,
                boxShadow: "0 4px 20px rgba(200,134,10,0.4)",
              }}>
              {placing
                ? (lang === "en" ? "Sending order..." : "جاري إرسال الطلب...")
                : <><CheckCircle2 size={18} /> {lang === "en" ? "Confirm Order 🍫" : "أكد الطلب 🍫"}</>}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          ORDER SUCCESS MODAL
      ══════════════════════════════════════════════════════════ */}
      {orderResult && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.9)" }} />
          <div style={{
            position: "relative", background: C.card,
            border: `1px solid rgba(200,134,10,0.5)`,
            borderRadius: "28px", padding: "40px 28px",
            textAlign: "center", maxWidth: "360px", width: "100%",
            boxShadow: "0 12px 64px rgba(200,134,10,0.25)",
            direction: lang === "ar" ? "rtl" : "ltr",
          }}>
            <div style={{ fontSize: "72px", marginBottom: "20px" }}>🎉</div>
            <h3 style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff", marginBottom: "10px" }}>
              {lang === "en" ? "Order Received!" : "تم استلام طلبك!"}
            </h3>
            <p style={{ color: C.muted, fontSize: "15px", marginBottom: "24px" }}>
              {lang === "en"
                ? "We will start preparing right away and deliver fresh to you ⚡"
                : "سنبدأ التحضير فوراً ونوصل لك في أقرب وقت ⚡"}
            </p>
            <div style={{
              background: C.dark, borderRadius: "16px",
              padding: "20px", marginBottom: "24px",
              border: `1px solid ${C.border}`,
            }}>
              <p style={{ fontSize: "13px", color: C.muted, marginBottom: "6px" }}>
                {lang === "en" ? "Your Order Number" : "رقم طلبك"}
              </p>
              <p style={{ fontFamily: "monospace", color: C.gold, fontWeight: 900, fontSize: "22px" }}>
                {orderResult.orderNumber}
              </p>
            </div>
            {/* WhatsApp 100% Free Confirmation Button */}
            <a
              href={`https://wa.me/201091413470?text=${encodeURIComponent(
                `مرحباً بيت الشوكولاتة Choco House 🍫\nأنا العميل: ${orderForm.customerName}\nقمت بطلب أوردر جديد رقم: #${orderResult.orderNumber}\nالمطلوب تحصيله: ${grandTotal} ج.م\nالعنوان: ${orderForm.address || ""} (${orderForm.zone})\nبرجاء التأكيد والتجهيز طازج!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playSound("click")}
              style={{
                width: "100%",
                background: "#22c55e",
                color: "#ffffff",
                fontWeight: 900,
                padding: "13px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                fontSize: "14.5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                textDecoration: "none",
                marginBottom: "10px",
                boxShadow: "0 4px 14px rgba(34, 197, 94, 0.35)",
                boxSizing: "border-box",
              }}
            >
              <span>تأكيد واستلام الفاتورة عبر واتساب 💬</span>
            </a>

            {/* Track Live in Customer Account Modal */}
            <button
              onClick={() => {
                setOrderResult(null);
                setCustomerModalOpen(true);
                playSound("click");
              }}
              style={{
                width: "100%",
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldL})`,
                color: C.dark,
                fontWeight: 900,
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              {lang === "en" ? "Awesome! Track order live 📍" : "ممتاز! تتبع طلبك لايف 📍"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          FLOATING MOBILE BOTTOM NAVIGATION BAR (Image 2 Mockup)
      ══════════════════════════════════════════════════════════ */}
      <nav
        className="choco-mobile-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: "rgba(18, 10, 4, 0.96)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(204, 160, 67, 0.25)",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.6)",
          padding: "8px 16px 12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
        }}
      >
        {/* Tab 1: Home / الرئيسية */}
        <button
          type="button"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            playSound("click");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#cca043",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          <Home size={20} />
          <span>{lang === "en" ? "Home" : "الرئيسية"}</span>
        </button>

        {/* Tab 2: Orders / طلباتي */}
        <button
          type="button"
          onClick={() => {
            const trackEl = document.getElementById("track");
            if (trackEl) trackEl.scrollIntoView({ behavior: "smooth" });
            else setCustomerModalOpen(true);
            playSound("click");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#a8927e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          <Package size={20} />
          <span>{lang === "en" ? "My Orders" : "طلباتي"}</span>
        </button>

        {/* Tab 3: Cart / سلة المشتريات */}
        <button
          type="button"
          onClick={() => {
            setCartOpen(true);
            playSound("click");
          }}
          style={{
            background: "none",
            border: "none",
            color: cartCount > 0 ? "#cca043" : "#a8927e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            padding: "4px 8px",
            position: "relative",
          }}
        >
          <div style={{ position: "relative" }}>
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-10px",
                  background: "#cca043",
                  color: "#180e06",
                  fontSize: "10px",
                  fontWeight: 900,
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <span>{lang === "en" ? "Cart" : "السلة"}</span>
        </button>

        {/* Tab 4: Account / حسابي */}
        <button
          type="button"
          onClick={() => {
            setCustomerModalOpen(true);
            playSound("click");
          }}
          style={{
            background: "none",
            border: "none",
            color: "#a8927e",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
            fontSize: "11px",
            fontWeight: 800,
            cursor: "pointer",
            padding: "4px 8px",
          }}
        >
          <User size={20} />
          <span>{lang === "en" ? "Account" : "حسابي"}</span>
        </button>
      </nav>

      {/* ── Customer Account & Orders Modal ── */}
      <CustomerAccountModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        lang={lang}
        onCustomerUpdated={(c) => {
          setCustomerProfile(c);
          if (c) {
            setOrderForm((prev) => ({
              ...prev,
              customerName: c.name || prev.customerName,
              phone: c.phone || prev.phone,
              address: c.address || prev.address,
              zone: c.zone || prev.zone,
            }));
          }
        }}
      />

      {/* ── Customer Live Chat Widget ── */}
      <CustomerChatWidget lang={lang} />
    </div>
  );
}
