"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import {
  Sparkles, Save, ArrowRight, Loader2, PartyPopper,
  Bike, GraduationCap, Gift, Check, Flame, Star, Undo2,
  Power, Tag, Percent, CheckCircle2, Search, Sliders, Eye, EyeOff
} from "lucide-react";
import Link from "next/link";
import ErpLayout from "@/components/ErpLayout";
import ImageUploader from "@/components/ImageUploader";

export interface OfferCard {
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
  categoryName: string;
  productIds: string[];
}

export interface OfferData {
  enabled?: boolean;
  badge: string;
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

const DEFAULT_DISCOUNT: DiscountRule = {
  enabled: false,
  title: "خصم خاص 20% لفترة محدودة على جميع أنواع الوافل! 🧇🔥",
  type: "percentage",
  value: 20,
  scope: "all",
  categoryName: "وافل",
  productIds: [],
};

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
  discount: DEFAULT_DISCOUNT,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  backgroundColor: "#0d0805",
  border: "1px solid rgba(204, 160, 67, 0.25)",
  borderRadius: "12px",
  padding: "0 14px",
  color: "#ffffff",
  fontSize: "13.5px",
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  color: "#b0957e",
  marginBottom: "6px",
};

interface CategoryItem {
  id: string;
  nameAr: string;
  nameEn?: string;
}

interface ProductItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  basePrice: number;
  category: string;
  image?: string;
}

export default function OffersAdminPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useStaff();
  const { lang, dir, t } = useLanguage();
  const [offers, setOffers] = useState<OfferData>(DEFAULT_OFFERS);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingEnabled, setTogglingEnabled] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      loadInitialData();
    }
  }, [authLoading, isAuthenticated, router]);

  async function loadInitialData() {
    try {
      setLoading(true);
      const [offersRes, catRes, prodRes] = await Promise.all([
        fetch("/api/public/offers", { cache: "no-store" }),
        fetch("/api/categories", { cache: "no-store" }).catch(() => null),
        fetch("/api/products", { cache: "no-store" }).catch(() => null),
      ]);

      if (offersRes.ok) {
        const data = await offersRes.json();
        if (data && data.cards) {
          setOffers({
            ...DEFAULT_OFFERS,
            ...data,
            discount: {
              ...DEFAULT_DISCOUNT,
              ...(data.discount || {}),
            },
          });
        }
      }

      if (catRes && catRes.ok) {
        const catData = await catRes.json();
        if (Array.isArray(catData)) setCategories(catData);
      }

      if (prodRes && prodRes.ok) {
        const prodData = await prodRes.json();
        if (Array.isArray(prodData)) setProducts(prodData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // 1-Click Instant Offers Section Toggle
  async function handleToggleOffersEnabled() {
    const nextEnabled = offers.enabled === false ? true : false;
    playSound("click");
    setTogglingEnabled(true);
    const updated = {
      ...offers,
      enabled: nextEnabled,
    };
    setOffers(updated);

    try {
      const res = await fetch("/api/public/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        playSound("success");
      }
    } catch {}
    finally {
      setTogglingEnabled(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    playSound("click");
    try {
      const res = await fetch("/api/public/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(offers),
      });
      if (res.ok) {
        playSound("success");
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  function updateCard(idx: number, field: keyof OfferCard, value: string) {
    const nextCards = [...offers.cards];
    nextCards[idx] = { ...nextCards[idx], [field]: value };
    setOffers({ ...offers, cards: nextCards });
  }

  function updateDiscount<K extends keyof DiscountRule>(field: K, value: DiscountRule[K]) {
    setOffers((prev) => ({
      ...prev,
      discount: {
        ...(prev.discount || DEFAULT_DISCOUNT),
        [field]: value,
      },
    }));
  }

  function toggleProductInDiscount(productId: string) {
    const cur = offers.discount?.productIds || [];
    const next = cur.includes(productId) ? cur.filter((id) => id !== productId) : [...cur, productId];
    updateDiscount("productIds", next);
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0d0805", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={40} color="#cca043" />
      </div>
    );
  }

  const discount = offers.discount || DEFAULT_DISCOUNT;
  const isSectionEnabled = offers.enabled !== false;

  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.nameAr.toLowerCase().includes(q) || (p.nameEn && p.nameEn.toLowerCase().includes(q));
  });

  return (
    <ErpLayout activeItem="menu">
      <div dir={dir} style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "60px" }}>

        {/* ── Page Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
          paddingBottom: "18px",
          borderBottom: "1px solid rgba(204, 160, 67, 0.16)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/menu-admin"
              onClick={() => playSound("click")}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "rgba(204, 160, 67, 0.12)",
                border: "1px solid rgba(204, 160, 67, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cca043",
                textDecoration: "none",
              }}
              title={t("رجوع للمنيو", "Back to Menu")}
            >
              <ArrowRight size={20} style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }} />
            </Link>
            <div>
              <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: 900, color: "#ffffff" }}>
                {t("إدارة العروض الخاصة والبانر 🎁", "Manage Special Offers & Banner 🎁")}
              </h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#8a7565", fontWeight: 600 }}>
                {t("تعديل نصوص وكروت العروض، تفعيل/تعطيل القسم، وتطبيق الخصومات الذكية على الأصناف", "Manage banners, deals, section toggles, and live promotional discounts")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => { playSound("click"); setOffers(DEFAULT_OFFERS); }}
              style={{
                padding: "10px 18px",
                borderRadius: "12px",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                background: "transparent",
                color: "#b0957e",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Undo2 size={15} />
              <span>{t("استعادة الافتراضي", "Reset Defaults")}</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: "10px 24px",
                borderRadius: "12px",
                border: "none",
                background: savedSuccess ? "#22c55e" : "#cca043",
                color: "#180e06",
                fontSize: "13.5px",
                fontWeight: 900,
                cursor: saving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(204, 160, 67, 0.3)",
                transition: "all 0.15s ease",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t("جاري الحفظ...", "Saving...")}</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>{t("✓ تم الحفظ بنجاح!", "✓ Saved Successfully!")}</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>{t("حفظ وتطبيق على الموقع", "Save & Apply Changes")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════
            FEATURE 1: MASTER OFFERS SECTION ENABLE/DISABLE SWITCH
        ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: isSectionEnabled ? "rgba(34, 197, 94, 0.08)" : "rgba(239, 68, 68, 0.08)",
            border: isSectionEnabled ? "2px solid #22c55e" : "2px solid #ef4444",
            borderRadius: "18px",
            padding: "18px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: isSectionEnabled
              ? "0 8px 28px rgba(34, 197, 94, 0.15)"
              : "0 8px 28px rgba(239, 68, 68, 0.15)",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: isSectionEnabled ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                border: isSectionEnabled ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              {isSectionEnabled ? "🟢" : "🔴"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 900, color: "#ffffff" }}>
                  {isSectionEnabled
                    ? t("قسم العروض الخاصة مُفعّل حالياً ويظهر للعملاء في اللاندينج بيدج", "Offers Section is currently ACTIVE on Storefront")
                    : t("قسم العروض الخاصة مُعطّل حالياً ومخفي تماماً من الموقع", "Offers Section is currently DISABLED & HIDDEN from Storefront")}
                </h3>
                <span
                  style={{
                    background: isSectionEnabled ? "#22c55e" : "#ef4444",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "3px 10px",
                    borderRadius: "100px",
                    letterSpacing: "0.5px",
                  }}
                >
                  {isSectionEnabled ? "● شـغـال (ON)" : "● مـعـطـل (OFF)"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#a8927e" }}>
                {isSectionEnabled
                  ? t("يظهر سكشن العروض والكروت الترويجية في الصفحة الرئيسية. بنقرة واحدة يمكنك إخفاؤه فوراً.", "Visible to all visitors. Click the button to hide it immediately from the landing page.")
                  : t("القسم مخفي تماماً ولن يراه أي زائر. بنقرة واحدة يمكنك إعادته للظهور في أي وقت.", "Hidden completely from customers. Click the button to reactivate it instantly.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleOffersEnabled}
            disabled={togglingEnabled}
            style={{
              padding: "11px 22px",
              borderRadius: "12px",
              border: "none",
              background: isSectionEnabled ? "#ef4444" : "#22c55e",
              color: "#ffffff",
              fontSize: "13.5px",
              fontWeight: 900,
              cursor: togglingEnabled ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: isSectionEnabled ? "0 4px 14px rgba(239, 68, 68, 0.4)" : "0 4px 14px rgba(34, 197, 94, 0.4)",
              transition: "all 0.15s ease",
            }}
          >
            {isSectionEnabled ? (
              <>
                <EyeOff size={16} />
                <span>{togglingEnabled ? t("جاري التعديل...", "Updating...") : t("🔴 إيقاف وتعطيل قسم العروض الآن", "Disable & Hide Offers Section")}</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span>{togglingEnabled ? t("جاري التعديل...", "Updating...") : t("🟢 تفعيل وإظهار قسم العروض الآن", "Enable & Show Offers Section")}</span>
              </>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════
            FEATURE 2: LIVE DISCOUNT PROMOTIONAL ENGINE (خصومات الأصناف)
        ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            background: "rgba(24, 13, 7, 0.95)",
            border: discount.enabled ? "2px solid #cca043" : "1.5px solid rgba(204, 160, 67, 0.25)",
            borderRadius: "20px",
            padding: "22px 26px",
            marginBottom: "28px",
            boxShadow: discount.enabled
              ? "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(204, 160, 67, 0.2)"
              : "0 6px 20px rgba(0, 0, 0, 0.4)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header row with Title and On/Off Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              paddingBottom: "18px",
              borderBottom: "1px solid rgba(204, 160, 67, 0.18)",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: discount.enabled ? "rgba(239, 68, 68, 0.2)" : "rgba(204, 160, 67, 0.15)",
                  border: discount.enabled ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(204, 160, 67, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                  color: discount.enabled ? "#ef4444" : "#cca043",
                }}
              >
                🔥
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "17.5px", fontWeight: 900, color: "#ffffff" }}>
                    {t("ماكينة تطبيق الخصومات على المنيو والأقسام ⚡", "Live Menu Discount Engine ⚡")}
                  </h2>
                  <span
                    style={{
                      background: discount.enabled ? "rgba(34, 197, 94, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      border: discount.enabled ? "1px solid rgba(34, 197, 94, 0.4)" : "1px solid rgba(255, 255, 255, 0.15)",
                      color: discount.enabled ? "#4ade80" : "#a8927e",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "100px",
                    }}
                  >
                    {discount.enabled ? "نشط ومطبق حالياً 🔥" : "متوقف (غير نشط)"}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0 0", fontSize: "12.5px", color: "#a8927e" }}>
                  {t(
                    "تطبيق خصم تلقائي على كل المنتجات، أو على قسم بالتحديد، أو على منتجات معينة مع شطب السعر القديم وحساب الخصم في السلة",
                    "Apply real-time discount across all products, a specific category, or selected items with price strikethrough"
                  )}
                </p>
              </div>
            </div>

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => {
                playSound("click");
                updateDiscount("enabled", !discount.enabled);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 18px",
                borderRadius: "12px",
                border: "none",
                background: discount.enabled ? "#22c55e" : "rgba(255, 255, 255, 0.1)",
                color: discount.enabled ? "#ffffff" : "#a8927e",
                fontWeight: 900,
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: discount.enabled ? "0 4px 14px rgba(34, 197, 94, 0.4)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              <Power size={15} />
              <span>{discount.enabled ? t("🟢 الخصم مُفعّل (شغال)", "Discount ACTIVE") : t("⚪ تفعيل الخصم الآن", "Activate Discount")}</span>
            </button>
          </div>

          {/* Discount Settings Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginBottom: "20px" }}>
            
            {/* Setting 1: Discount Type & Value */}
            <div
              style={{
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.2)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <label style={labelStyle}>{t("1. نوع وقيمة الخصم:", "1. Discount Type & Value:")}</label>
              
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <button
                  type="button"
                  onClick={() => { playSound("click"); updateDiscount("type", "percentage"); }}
                  style={{
                    flex: 1,
                    height: "38px",
                    borderRadius: "10px",
                    border: discount.type === "percentage" ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    background: discount.type === "percentage" ? "rgba(204, 160, 67, 0.2)" : "#0d0805",
                    color: discount.type === "percentage" ? "#cca043" : "#a8927e",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Percent size={14} />
                  <span>{t("نسبة مئوية (%)", "Percentage (%)")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => { playSound("click"); updateDiscount("type", "fixed"); }}
                  style={{
                    flex: 1,
                    height: "38px",
                    borderRadius: "10px",
                    border: discount.type === "fixed" ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    background: discount.type === "fixed" ? "rgba(204, 160, 67, 0.2)" : "#0d0805",
                    color: discount.type === "fixed" ? "#cca043" : "#a8927e",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Tag size={14} />
                  <span>{t("مبلغ ثابت (ج.م)", "Fixed Amount (EGP)")}</span>
                </button>
              </div>

              {/* Value Input */}
              <div style={{ position: "relative", marginBottom: "10px" }}>
                <input
                  type="number"
                  min="1"
                  max={discount.type === "percentage" ? "99" : "1000"}
                  value={discount.value}
                  onChange={(e) => updateDiscount("value", Math.max(1, parseInt(e.target.value) || 0))}
                  style={{
                    ...inputStyle,
                    paddingRight: "14px",
                    paddingLeft: "45px",
                    fontSize: "16px",
                    fontWeight: 900,
                    color: "#cca043",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "12px",
                    color: "#a8927e",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {discount.type === "percentage" ? "%" : "ج.م"}
                </span>
              </div>

              {/* Quick Presets */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {[10, 15, 20, 25, 30].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { playSound("click"); updateDiscount("value", val); updateDiscount("type", "percentage"); }}
                    style={{
                      padding: "3px 9px",
                      borderRadius: "6px",
                      border: discount.value === val && discount.type === "percentage" ? "1px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                      background: discount.value === val && discount.type === "percentage" ? "#cca043" : "rgba(204, 160, 67, 0.08)",
                      color: discount.value === val && discount.type === "percentage" ? "#180e06" : "#cca043",
                      fontSize: "11px",
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {val}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { playSound("click"); updateDiscount("value", 50); updateDiscount("type", "fixed"); }}
                  style={{
                    padding: "3px 9px",
                    borderRadius: "6px",
                    border: discount.value === 50 && discount.type === "fixed" ? "1px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    background: discount.value === 50 && discount.type === "fixed" ? "#cca043" : "rgba(204, 160, 67, 0.08)",
                    color: discount.value === 50 && discount.type === "fixed" ? "#180e06" : "#cca043",
                    fontSize: "11px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  50 ج.م
                </button>
              </div>
            </div>

            {/* Setting 2: Scope Selector */}
            <div
              style={{
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.2)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <label style={labelStyle}>{t("2. نطاق تطبيق الخصم:", "2. Discount Scope:")}</label>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Scope 1: All */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: discount.scope === "all" ? "rgba(204, 160, 67, 0.18)" : "#0d0805",
                    border: discount.scope === "all" ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="discountScope"
                    checked={discount.scope === "all"}
                    onChange={() => updateDiscount("scope", "all")}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff" }}>
                      🌐 {t("على كل المنتجات والمنيو بالكامل", "All Products across the Menu")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a8927e" }}>
                      يطبق الخصم على جميع الأصناف بدون استثناء
                    </div>
                  </div>
                </label>

                {/* Scope 2: Category */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: discount.scope === "category" ? "rgba(204, 160, 67, 0.18)" : "#0d0805",
                    border: discount.scope === "category" ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="discountScope"
                    checked={discount.scope === "category"}
                    onChange={() => updateDiscount("scope", "category")}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff" }}>
                      📂 {t("على قسم بالتحديد فقط", "Specific Category Only")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a8927e" }}>
                      مثال: خصم على قسم الوافل فقط أو البانكيك
                    </div>
                  </div>
                </label>

                {/* Scope 3: Selected Products */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: discount.scope === "products" ? "rgba(204, 160, 67, 0.18)" : "#0d0805",
                    border: discount.scope === "products" ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.2)",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="discountScope"
                    checked={discount.scope === "products"}
                    onChange={() => updateDiscount("scope", "products")}
                  />
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 800, color: "#ffffff" }}>
                      🎯 {t("على منتجات معينة بالاسم", "Selected Products Only")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#a8927e" }}>
                      تحديد أصناف بالاسم ({discount.productIds.length} صنف محدد)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Setting 3: Scope Details (Category dropdown or Product selector) */}
            <div
              style={{
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.2)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <label style={labelStyle}>{t("3. تحديد الهدف والعنوان:", "3. Target Selection & Title:")}</label>
              
              {discount.scope === "category" && (
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "11px", color: "#a8927e", display: "block", marginBottom: "4px" }}>
                    اختر القسم المطبق عليه الخصم:
                  </label>
                  <select
                    value={discount.categoryName}
                    onChange={(e) => updateDiscount("categoryName", e.target.value)}
                    style={{
                      ...inputStyle,
                      background: "#0d0805",
                      cursor: "pointer",
                    }}
                  >
                    {(categories.length > 0 ? categories.map((c) => c.nameAr) : [
                      "وافل", "بان كيك", "مولتن كيك", "تشيز كيك", "كيك غربي",
                      "كريب حلو", "سموزي فريش", "ميلك شيك", "مشروبات ساخنة", "بوبا تي"
                    ]).map((catName) => (
                      <option key={catName} value={catName}>
                        🏷️ {catName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title Input */}
              <div>
                <label style={{ fontSize: "11px", color: "#a8927e", display: "block", marginBottom: "4px" }}>
                  عنوان وبانر الخصم التسويقي:
                </label>
                <input
                  type="text"
                  value={discount.title}
                  onChange={(e) => updateDiscount("title", e.target.value)}
                  placeholder="مثال: خصم 20% لفترة محدودة على جميع أنواع الوافل! 🧇🔥"
                  style={inputStyle}
                />
              </div>

              {/* Live Price Impact Preview */}
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  background: "rgba(34, 197, 94, 0.1)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  fontSize: "12px",
                  color: "#4ade80",
                }}
              >
                💡 <strong>معاينة الحسبة:</strong> صنف بسعر <strong>120 ج.م</strong> يصبح بـ{" "}
                <span style={{ fontWeight: 900, textDecoration: "underline" }}>
                  {discount.type === "percentage"
                    ? Math.max(1, Math.round(120 * (1 - discount.value / 100)))
                    : Math.max(1, 120 - discount.value)}{" "}
                  ج.م
                </span>{" "}
                (وفرت{" "}
                {discount.type === "percentage"
                  ? Math.round((120 * discount.value) / 100)
                  : discount.value}{" "}
                ج.م!)
              </div>
            </div>
          </div>

          {/* If Scope is 'products': Render Interactive Product Picker Grid */}
          {discount.scope === "products" && (
            <div
              style={{
                marginTop: "10px",
                padding: "16px",
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.25)",
                borderRadius: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#ffffff" }}>
                    🎯 حدد الأصناف المطبق عليها الخصم:
                  </span>
                  <span
                    style={{
                      background: "#cca043",
                      color: "#180e06",
                      fontSize: "11px",
                      fontWeight: 900,
                      padding: "1px 8px",
                      borderRadius: "100px",
                    }}
                  >
                    {discount.productIds.length} صنف محدد
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => updateDiscount("productIds", products.map((p) => p.id))}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(204, 160, 67, 0.15)",
                      border: "1px solid rgba(204, 160, 67, 0.3)",
                      color: "#cca043",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    تحديد الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDiscount("productIds", [])}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#a8927e",
                      fontSize: "11.5px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              {/* Product Search Bar */}
              <div style={{ position: "relative", marginBottom: "12px" }}>
                <input
                  type="text"
                  placeholder="ابحث عن صنف بالاسم لتحديده..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{
                    ...inputStyle,
                    height: "38px",
                    paddingRight: "36px",
                    fontSize: "12.5px",
                  }}
                />
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "11px",
                    color: "#a8927e",
                  }}
                />
              </div>

              {/* Scrollable Products Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "10px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {filteredProducts.map((p) => {
                  const isSelected = discount.productIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProductInDiscount(p.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "10px",
                        background: isSelected ? "rgba(204, 160, 67, 0.2)" : "#0d0805",
                        border: isSelected ? "1.5px solid #cca043" : "1px solid rgba(204, 160, 67, 0.15)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        style={{ cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "12.5px",
                            fontWeight: 800,
                            color: isSelected ? "#cca043" : "#ffffff",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {p.nameAr}
                        </div>
                        <div style={{ fontSize: "11px", color: "#a8927e" }}>
                          {p.category} • {p.basePrice} ج.م
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Main 2-Column Content: Form (Right) + Live Preview (Left) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "28px",
          alignItems: "start",
        }}>

          {/* Form Settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

            {/* Box 1: Section Header Texts */}
            <div style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "22px",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#cca043",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Sparkles size={17} /> {t("نصوص عنوان سكشن العروض", "Offers Section Header & Titles")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>{t("الشارة العلوية (Badge)", "Top Badge")}</label>
                  <input
                    type="text"
                    value={offers.badge}
                    onChange={(e) => setOffers({ ...offers, badge: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("العنوان الرئيسي (Title)", "Main Title")}</label>
                  <input
                    type="text"
                    value={offers.title}
                    onChange={(e) => setOffers({ ...offers, title: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("الوصف التوضيحي (Subtitle)", "Description / Subtitle")}</label>
                  <input
                    type="text"
                    value={offers.subtitle}
                    onChange={(e) => setOffers({ ...offers, subtitle: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Box 2: The 3 Offer Cards */}
            <div style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "22px",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#cca043",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Gift size={17} /> {t("كروت العروض الثلاثة", "The 3 Special Offer Cards")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {offers.cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    style={{
                      background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.18)",
                      borderRadius: "14px",
                      padding: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: "#cca043" }}>
                        {t(`كارت رقم #${idx + 1}`, `Card #${idx + 1}`)}
                      </span>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {["party", "delivery", "student", "gift", "flame"].map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => updateCard(idx, "icon", ic)}
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "6px",
                              border: card.icon === ic ? "1.5px solid #cca043" : "1px solid rgba(255,255,255,0.08)",
                              background: card.icon === ic ? "rgba(204, 160, 67, 0.25)" : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "13px",
                            }}
                          >
                            {ic === "party" ? "🎉" : ic === "delivery" ? "🛵" : ic === "student" ? "🎓" : ic === "gift" ? "🎁" : "🔥"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <input
                        type="text"
                        placeholder="عنوان الكارت (مثال: كومبو الشلة)"
                        value={card.title}
                        onChange={(e) => updateCard(idx, "title", e.target.value)}
                        style={inputStyle}
                      />
                      <textarea
                        rows={2}
                        placeholder="تفاصيل العرض (مثال: وافل + ميلك شيك بسعر 299 ج)..."
                        value={card.desc}
                        onChange={(e) => updateCard(idx, "desc", e.target.value)}
                        style={{
                          ...inputStyle,
                          height: "auto",
                          padding: "10px 14px",
                          fontFamily: "inherit",
                          resize: "none",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 3: Main Showcase Banner */}
            <div style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "22px",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#cca043",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Flame size={17} /> {t("بانر الصنف المميز (Showcase Banner)", "Featured Product Banner")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>{t("الشارة (Badge)", "Badge")}</label>
                  <input
                    type="text"
                    value={offers.banner.badge}
                    onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, badge: e.target.value } })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("اسم الصنف المميز (Title)", "Product Title")}</label>
                  <input
                    type="text"
                    value={offers.banner.title}
                    onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, title: e.target.value } })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("نص الزر (Button Text)", "Button Text")}</label>
                  <input
                    type="text"
                    value={offers.banner.linkText}
                    onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, linkText: e.target.value } })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("صورة البانر (Banner Image)", "Banner Image")}</label>
                  <ImageUploader
                    value={offers.banner.image}
                    onChange={(url: string) => setOffers({ ...offers, banner: { ...offers.banner, image: url } })}
                    label={t("صورة البانر", "Banner Image")}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Left Column: Live Preview of Storefront Offers Section */}
          <div style={{ position: "sticky", top: "20px" }}>
            <div style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.25)",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                paddingBottom: "12px",
                borderBottom: "1px solid rgba(204, 160, 67, 0.15)",
              }}>
                <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#cca043" }}>
                  {t("معاينة حية لشكل العروض على الموقع", "Live Storefront Preview")}
                </span>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "100px",
                  background: isSectionEnabled ? "rgba(34, 197, 94, 0.18)" : "rgba(239, 68, 68, 0.18)",
                  color: isSectionEnabled ? "#4ade80" : "#f87171",
                }}>
                  {isSectionEnabled ? "● ظاهر بالموقع" : "● مخفي من الموقع"}
                </span>
              </div>

              {!isSectionEnabled ? (
                <div style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  background: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "14px",
                  border: "1px dashed rgba(239, 68, 68, 0.3)",
                  color: "#a8927e",
                }}>
                  <div style={{ fontSize: "32px", marginBottom: "8px" }}>👁️‍🗨️</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                    قسم العروض معطل ومخفي حالياً
                  </div>
                  <div style={{ fontSize: "12px", marginTop: "4px" }}>
                    لن يظهر أي جزء من هذا السكشن للعملاء حتى تقوم بإعادة تفعيله.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Preview Header */}
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#cca043",
                      background: "rgba(204, 160, 67, 0.15)",
                      padding: "3px 12px",
                      borderRadius: "100px",
                    }}>
                      {offers.badge}
                    </span>
                    <h3 style={{ margin: "8px 0 4px 0", fontSize: "20px", fontWeight: 900, color: "#ffffff" }}>
                      {offers.title}
                    </h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#a8927e" }}>
                      {offers.subtitle}
                    </p>
                  </div>

                  {/* Preview 3 Cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {offers.cards.map((c, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.2)",
                          borderRadius: "12px",
                          padding: "12px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span style={{ fontSize: "22px" }}>
                          {c.icon === "party" ? "🎉" : c.icon === "delivery" ? "🛵" : c.icon === "student" ? "🎓" : c.icon === "gift" ? "🎁" : "🔥"}
                        </span>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 900, color: "#ffffff" }}>
                            {c.title}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#a8927e", marginTop: "2px" }}>
                            {c.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Preview Banner */}
                  <div
                    style={{
                      background: "linear-gradient(135deg, rgba(34, 19, 10, 0.95) 0%, rgba(18, 10, 4, 0.98) 100%)",
                      border: "1px solid rgba(204, 160, 67, 0.3)",
                      borderRadius: "14px",
                      padding: "16px",
                      textAlign: "center",
                      marginTop: "6px",
                    }}
                  >
                    <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#cca043" }}>
                      {offers.banner.badge}
                    </span>
                    <h4 style={{ margin: "4px 0 10px 0", fontSize: "16px", fontWeight: 900, color: "#ffffff" }}>
                      {offers.banner.title}
                    </h4>
                    <span
                      style={{
                        display: "inline-block",
                        background: "#cca043",
                        color: "#180e06",
                        padding: "6px 16px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: 900,
                      }}
                    >
                      {offers.banner.linkText}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </ErpLayout>
  );
}
