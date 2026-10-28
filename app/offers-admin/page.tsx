"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import {
  Sparkles, Save, ArrowRight, Loader2, PartyPopper,
  Bike, GraduationCap, Gift, Check, Flame, Star, Undo2
} from "lucide-react";
import Link from "next/link";
import ErpLayout from "@/components/ErpLayout";
import ImageUploader from "@/components/ImageUploader";

interface OfferCard {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface OfferData {
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
}

const DEFAULT_OFFERS: OfferData = {
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "44px",
  backgroundColor: "#FAF6EE",
  border: "1px solid #E8DAC8",
  borderRadius: "12px",
  padding: "0 14px",
  color: "#2B170E",
  fontSize: "13.5px",
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 800,
  color: "#7E5E49",
  marginBottom: "6px",
};

export default function OffersAdminPage() {
  const router = useRouter();
  const { isAuthenticated, permissions, loading: authLoading } = useStaff();
  const { lang, dir, t } = useLanguage();
  const [offers, setOffers] = useState<OfferData>(DEFAULT_OFFERS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      fetchOffers();
    }
  }, [authLoading, isAuthenticated, router]);

  async function fetchOffers() {
    try {
      setLoading(true);
      const res = await fetch("/api/public/offers", { cache: "no-store" });
      const data = await res.json();
      if (data) {
        setOffers({
          ...DEFAULT_OFFERS,
          ...data,
          enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
        });
      }
    } catch (e) {
      console.error("fetchOffers error:", e);
    } finally {
      setLoading(false);
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
      } else {
        alert(t("فشل حفظ التعديلات في السيرفر", "Failed to save settings on server"));
      }
    } catch (e) {
      console.error("Save error:", e);
      alert(t("فشل حفظ التعديلات", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  }

  function updateCard(idx: number, field: keyof OfferCard, value: string) {
    const nextCards = [...offers.cards];
    nextCards[idx] = { ...nextCards[idx], [field]: value };
    setOffers({ ...offers, cards: nextCards });
  }

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F8F4EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={40} color="#C6873E" />
      </div>
    );
  }

  return (
    <ErpLayout activeItem="menu">
      <div dir={dir} style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* ── Page Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "28px",
          paddingBottom: "20px",
          borderBottom: "1px solid rgba(217, 155, 86, 0.16)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link
              href="/menu-admin"
              onClick={() => playSound("click")}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "rgba(217, 155, 86, 0.12)",
                border: "1px solid rgba(217, 155, 86, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d99b56",
                textDecoration: "none",
              }}
              title={t("رجوع للمنيو", "Back to Menu")}
            >
              <ArrowRight size={20} style={{ transform: dir === "ltr" ? "rotate(180deg)" : "none" }} />
            </Link>
            <div>
              <h1 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: 900, color: "#2B170E" }}>
                {t("إدارة العروض الخاصة والبانر 🎁", "Manage Special Offers & Banner 🎁")}
              </h1>
              <p style={{ margin: 0, fontSize: "13px", color: "#7E5E49", fontWeight: 600 }}>
                {t("تعديل نصوص وكروت العروض والبانر الرئيسي على الموقع فوراً ولحظياً", "Customize promotional banners and special deals across the storefront")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => { playSound("click"); setOffers(DEFAULT_OFFERS); }}
              style={{
                padding: "10px 18px",
                borderRadius: "12px",
                border: "1px solid #E8DAC8",
                background: "#FFFFFF",
                color: "#7E5E49",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(43,23,14,0.03)",
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
                background: savedSuccess ? "#22c55e" : "#d99b56",
                color: "#180e06",
                fontSize: "13.5px",
                fontWeight: 900,
                cursor: saving ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 14px rgba(217, 155, 86, 0.3)",
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

        {/* ── Offers Enable/Disable Banner ── */}
        <div style={{
          backgroundColor: offers.enabled !== false ? "#F0FDF4" : "#FEF2F2",
          border: `2px solid ${offers.enabled !== false ? "#86EFAC" : "#FECACA"}`,
          borderRadius: "18px",
          padding: "18px 22px",
          marginBottom: "26px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              backgroundColor: offers.enabled !== false ? "#DCFCE7" : "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
            }}>
              {offers.enabled !== false ? "🎉" : "🚫"}
            </div>
            <div>
              <div style={{
                fontSize: "16px",
                fontWeight: 900,
                color: offers.enabled !== false ? "#166534" : "#991B1B",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span>{offers.enabled !== false ? t("قسم العروض مفعل ونشط على الموقع للعملاء", "Offers section is ACTIVE on the storefront") : t("قسم العروض معطل ومخفي تماماً من الموقع", "Offers section is DISABLED and HIDDEN from storefront")}</span>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: "100px",
                  fontSize: "11px",
                  fontWeight: 900,
                  backgroundColor: offers.enabled !== false ? "#16A34A" : "#DC2626",
                  color: "#FFFFFF",
                }}>
                  {offers.enabled !== false ? t("معروض للزوار", "Visible to visitors") : t("مخفي", "Hidden")}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: offers.enabled !== false ? "#15803D" : "#B91C1C", fontWeight: 600 }}>
                {offers.enabled !== false 
                  ? t("العملاء يرون قسم العروض والبانر في الصفحة الرئيسية.", "Customers can see the special offers and banner on the landing page.") 
                  : t("القسم مخفي بالكامل من الصفحة الرئيسية وشريط التنقل ولن يظهر لأي زائر.", "Section is completely hidden from the homepage and navigation bar.")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              playSound("click");
              const nextVal = !(offers.enabled !== false);
              const nextOffers = { ...offers, enabled: nextVal };
              setOffers(nextOffers);
              setSaving(true);
              try {
                const res = await fetch("/api/public/offers", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(nextOffers),
                });
                if (!res.ok) {
                  throw new Error("Server error " + res.status);
                }
                playSound("success");
                setSavedSuccess(true);
                setTimeout(() => setSavedSuccess(false), 3000);
              } catch (err) {
                console.error("Toggle error:", err);
                alert(t("تعذر حفظ حالة العروض، يرجى المحاولة مرة أخرى", "Failed to save offers status, please try again"));
              } finally {
                setSaving(false);
              }
            }}
            style={{
              padding: "10px 22px",
              borderRadius: "100px",
              border: "none",
              backgroundColor: offers.enabled !== false ? "#DC2626" : "#16A34A",
              color: "#FFFFFF",
              fontWeight: 900,
              fontSize: "13.5px",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>{offers.enabled !== false ? "🛑" : "✅"}</span>
            <span>{offers.enabled !== false ? t("تعطيل وإخفاء العروض", "Disable & Hide Offers") : t("تفعيل وإظهار العروض", "Enable & Show Offers")}</span>
          </button>
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
              background: "#FFFFFF",
              border: "1px solid #E8DAC8",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 2px 8px rgba(43,23,14,0.04)",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#2B170E",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Sparkles size={17} color="#C6873E" /> {t("نصوص عنوان سكشن العروض", "Offers Section Header & Titles")}
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
              background: "#FFFFFF",
              border: "1px solid #E8DAC8",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 2px 8px rgba(43,23,14,0.04)",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#2B170E",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Gift size={17} color="#C6873E" /> {t("كروت العروض الثلاثة", "The 3 Special Offer Cards")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {offers.cards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    style={{
                      background: "#FAF6EE",
                      border: "1px solid #E8DAC8",
                      borderRadius: "14px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "13px", fontWeight: 900, color: "#C6873E" }}>
                        {t(`عرض رقم ${idx + 1}`, `Offer Card #${idx + 1}`)}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#7E5E49" }}>{t("الأيقونة:", "Icon:")}</span>
                        <select
                          value={card.icon}
                          onChange={(e) => updateCard(idx, "icon", e.target.value)}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E8DAC8",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            color: "#2B170E",
                            fontSize: "12px",
                            outline: "none",
                          }}
                        >
                          <option value="party">{t("احتفال / كومبو (🎉)", "Celebration / Combo (🎉)")}</option>
                          <option value="delivery">{t("توصيل مجاني (🛵)", "Free Delivery (🛵)")}</option>
                          <option value="student">{t("خصم طلبة (🎓)", "Student Discount (🎓)")}</option>
                          <option value="fire">{t("عرض ناري (🔥)", "Hot Deal (🔥)")}</option>
                          <option value="star">{t("عرض ذهبي (⭐)", "Gold Deal (⭐)")}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>{t("عنوان العرض", "Card Title")}</label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => updateCard(idx, "title", e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>{t("تفاصيل العرض", "Card Details")}</label>
                      <textarea
                        rows={2}
                        value={card.desc}
                        onChange={(e) => updateCard(idx, "desc", e.target.value)}
                        style={{
                          ...inputStyle,
                          height: "auto",
                          padding: "10px 14px",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 3: Most Popular Banner */}
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #E8DAC8",
              borderRadius: "18px",
              padding: "22px",
              boxShadow: "0 2px 8px rgba(43,23,14,0.04)",
            }}>
              <h2 style={{
                margin: "0 0 16px 0",
                fontSize: "15px",
                fontWeight: 900,
                color: "#d99b56",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <Flame size={17} /> {t("بانر الصنف الأكثر طلباً", "Top Trending Item Banner")}
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>{t("شارة البانر (Badge)", "Banner Badge")}</label>
                  <input
                    type="text"
                    value={offers.banner.badge}
                    onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, badge: e.target.value } })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>{t("اسم الصنف المميز", "Featured Item Name")}</label>
                  <input
                    type="text"
                    value={offers.banner.title}
                    onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, title: e.target.value } })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={labelStyle}>{t("نص الزر", "Button Text")}</label>
                    <input
                      type="text"
                      value={offers.banner.linkText}
                      onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, linkText: e.target.value } })}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>{t("رابط التوجيه (Link)", "Target Link")}</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={offers.banner.linkHref}
                      onChange={(e) => setOffers({ ...offers, banner: { ...offers.banner, linkHref: e.target.value } })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Direct ImgBB Uploader for Banner */}
                <ImageUploader
                  label={t("صورة خلفية البانر (رفع مباشر عبر ImgBB)", "Banner Background Image (Direct ImgBB Upload)")}
                  value={offers.banner.image}
                  onChange={(url) => setOffers({ ...offers, banner: { ...offers.banner, image: url } })}
                />
              </div>
            </div>

          </div>

          {/* Live Preview Column (Sticky Left) */}
          <div style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              background: "#FFFFFF",
              border: "1px solid #E8DAC8",
              borderRadius: "20px",
              padding: "20px",
              boxShadow: "0 4px 16px rgba(43,23,14,0.06)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
                paddingBottom: "10px",
                borderBottom: "1px solid #E8DAC8",
              }}>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#2B170E" }}>
                  {t("معاينة حية لشكل العروض على الموقع", "Live Storefront Preview")}
                </span>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#22c55e", boxShadow: "0 0 10px #22c55e",
                }} />
              </div>

              {/* Header Preview */}
              <div style={{ marginBottom: "16px", textAlign: dir === "rtl" ? "right" : "left" }}>
                <span style={{ fontSize: "11px", fontWeight: 800, color: "#C6873E", display: "block", marginBottom: "2px" }}>
                  {offers.badge}
                </span>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", fontWeight: 900, color: "#2B170E" }}>
                  {offers.title}
                </h3>
                <p style={{ margin: 0, fontSize: "11px", color: "#7E5E49" }}>
                  {offers.subtitle}
                </p>
              </div>

              {/* Cards Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
                {offers.cards.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#FAF6EE",
                      border: "1px solid #E8DAC8",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 900, color: "#2B170E" }}>
                        {c.title}
                      </div>
                      <div style={{ fontSize: "11px", color: "#7E5E49", marginTop: "2px" }}>
                        {c.desc}
                      </div>
                    </div>
                    <span style={{ fontSize: "22px", marginLeft: dir === "rtl" ? "8px" : "0", marginRight: dir === "ltr" ? "8px" : "0" }}>
                      {c.icon === "delivery" ? "🛵" : c.icon === "student" ? "🎓" : c.icon === "fire" ? "🔥" : c.icon === "star" ? "⭐" : "🎉"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Banner Preview */}
              <div
                style={{
                  height: "110px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  position: "relative",
                  backgroundImage: `url(${offers.banner.image || "/whacka-offers-banner.jpg"})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: "1px solid rgba(217, 155, 86, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 18px",
                  textAlign: dir === "rtl" ? "right" : "left",
                }}
              >
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: dir === "rtl" 
                    ? "linear-gradient(to left, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)"
                    : "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
                }} />
                <div style={{ position: "relative", zIndex: 2 }}>
                  <span style={{ fontSize: "10.5px", fontWeight: 800, color: "#d99b56", display: "block" }}>
                    {offers.banner.badge}
                  </span>
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", marginTop: "2px" }}>
                    {offers.banner.title}
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: "#d99b56", marginTop: "4px", display: "inline-block" }}>
                    {offers.banner.linkText} {dir === "rtl" ? "←" : "→"}
                  </span>
                </div>
              </div>

              {/* Save Button in preview */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  padding: "12px",
                  borderRadius: "14px",
                  background: savedSuccess ? "#22c55e" : "#d99b56",
                  color: "#180e06",
                  fontWeight: 900,
                  fontSize: "13px",
                  border: "none",
                  cursor: saving ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 16px rgba(217, 155, 86, 0.25)",
                }}
              >
                {saving ? t("جاري الحفظ...", "Saving...") : savedSuccess ? t("✓ تم الحفظ بنجاح!", "✓ Saved Successfully!") : t("تطبيق وحفظ على الموقع الآن", "Apply & Save to Storefront")}
              </button>
            </div>
          </div>

        </div>
      </div>
    </ErpLayout>
  );
}
