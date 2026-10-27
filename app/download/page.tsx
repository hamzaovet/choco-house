"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Download, 
  Smartphone, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  BellRing, 
  ChevronRight, 
  CheckCircle2, 
  ArrowLeft,
  Share2,
  ExternalLink,
  Sparkles
} from "lucide-react";

export default function DownloadAppPage() {
  const [downloading, setDownloading] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if auto download was requested
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("auto") === "1") {
        setAutoCountdown(3);
      }
    }
  }, []);

  useEffect(() => {
    if (autoCountdown === null) return;
    if (autoCountdown > 0) {
      const timer = setTimeout(() => setAutoCountdown(autoCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (autoCountdown === 0) {
      handleDownload();
      setAutoCountdown(null);
    }
  }, [autoCountdown]);

  function handleDownload() {
    setDownloading(true);
    const link = document.createElement("a");
    link.href = "/api/download/apk";
    link.setAttribute("download", "choco-house.apk");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: "تطبيق Choco House Desserts للأندرويد",
        text: "حمل تطبيق Choco House الرسمي للأندرويد واستمتع بأشهى الحلويات والوافل والبانكيك بأسرع تجربة طلب!",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div 
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at 50% 0%, #2a1508 0%, #0d0805 70%, #050302 100%)",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 64px",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background ambient lighting */}
      <div 
        style={{
          position: "absolute",
          top: "-120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "380px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(204, 160, 67, 0.15) 0%, rgba(0,0,0,0) 70%)",
          pointerEvents: "none",
          filter: "blur(40px)",
        }}
      />

      {/* Top Navbar */}
      <header 
        style={{
          width: "100%",
          maxWidth: "880px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "36px",
          zIndex: 10,
        }}
      >
        <Link 
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#e6c37a",
            textDecoration: "none",
            fontSize: "13.5px",
            fontWeight: 700,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "8px 16px",
            borderRadius: "100px",
            transition: "all 0.2s ease",
          }}
        >
          <ChevronRight size={17} />
          <span>الرجوع للمطعم والمنيو</span>
        </Link>

        <button
          onClick={handleShare}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            color: "#cca043",
            background: "rgba(204, 160, 67, 0.08)",
            border: "1px solid rgba(204, 160, 67, 0.2)",
            padding: "8px 14px",
            borderRadius: "100px",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Share2 size={15} />
          <span>{copied ? "تم نسخ الرابط! ✓" : "مشاركة التطبيق"}</span>
        </button>
      </header>

      {/* Hero Badge */}
      <div 
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(204, 160, 67, 0.12)",
          border: "1px solid rgba(204, 160, 67, 0.35)",
          padding: "6px 16px",
          borderRadius: "100px",
          color: "#cca043",
          fontSize: "12px",
          fontWeight: 800,
          marginBottom: "18px",
          zIndex: 10,
        }}
      >
        <Sparkles size={14} />
        <span>النسخة الأصلية الرسمية • Android APK v1.0.0</span>
      </div>

      {/* Main Title */}
      <h1 
        style={{
          fontSize: "clamp(26px, 5vw, 40px)",
          fontWeight: 900,
          textAlign: "center",
          marginBottom: "12px",
          background: "linear-gradient(135deg, #ffffff 40%, #e6c37a 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.25,
          zIndex: 10,
        }}
      >
        حمّل تطبيق Choco House الرسمي
      </h1>
      <p 
        style={{
          color: "#a8927e",
          fontSize: "clamp(14px, 2.5vw, 16px)",
          textAlign: "center",
          maxWidth: "540px",
          lineHeight: 1.6,
          marginBottom: "32px",
          zIndex: 10,
        }}
      >
        تجربة طلب فورية وسلسة لأشهى الحلويات والوافل، مع تنبيهات لحظية لمتابعة طلبك، وشات مباشر مع طاقم المطعم والكابتن.
      </p>

      {/* Auto Countdown Banner if triggered */}
      {autoCountdown !== null && (
        <div 
          style={{
            background: "rgba(204, 160, 67, 0.2)",
            border: "1px solid #cca043",
            borderRadius: "14px",
            padding: "12px 20px",
            marginBottom: "24px",
            color: "#e6c37a",
            fontSize: "14px",
            fontWeight: 700,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4ade80", animation: "pulse 1.2s infinite" }} />
          <span>سيبدأ تحميل التطبيق تلقائياً خلال {autoCountdown} ثانية...</span>
        </div>
      )}

      {/* Download Center Card */}
      <main
        style={{
          width: "100%",
          maxWidth: "880px",
          background: "linear-gradient(180deg, rgba(32, 19, 10, 0.7) 0%, rgba(18, 11, 6, 0.85) 100%)",
          border: "1px solid rgba(204, 160, 67, 0.25)",
          borderRadius: "28px",
          padding: "36px 28px",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: "36px",
          alignItems: "center",
          zIndex: 10,
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Left/Start Column: QR Code & Scan Instructions */}
        <div 
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "22px",
            padding: "24px 20px",
          }}
        >
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              color: "#cca043",
              fontSize: "13px",
              fontWeight: 800,
              marginBottom: "14px",
            }}
          >
            <QrCode size={18} />
            <span>امسح الكود بكاميرا الموبايل</span>
          </div>

          <div 
            style={{
              background: "#ffffff",
              padding: "14px",
              borderRadius: "18px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
              marginBottom: "16px",
            }}
          >
            <img 
              src="/apk-qr.png" 
              alt="QR Code لتحميل تطبيق Choco House"
              style={{
                width: "190px",
                height: "190px",
                display: "block",
                borderRadius: "10px",
              }}
            />
          </div>

          <p style={{ color: "#a8927e", fontSize: "12.5px", maxWidth: "230px", lineHeight: 1.5 }}>
            وجّه كاميرا هاتفك نحو الكود ليتم فتح صفحة التحميل وتحميل ملف التطبيق تلقائياً.
          </p>
        </div>

        {/* Right/End Column: Action Buttons & Install Guide */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <Smartphone size={24} style={{ color: "#cca043" }} />
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>
                نسخة الأندرويد المباشرة
              </h2>
            </div>
            <p style={{ color: "#8a7565", fontSize: "13px" }}>
              حجم الملف: <strong>~12 ميجابايت</strong> • متوافق مع كافة أجهزة Android 8.0 فما فوق
            </p>
          </div>

          {/* Big Download Button */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: downloading 
                ? "#4ade80" 
                : "linear-gradient(135deg, #cca043 0%, #b37f1b 50%, #8c5b0b 100%)",
              color: downloading ? "#062b11" : "#180e06",
              border: "none",
              borderRadius: "16px",
              padding: "18px 24px",
              fontSize: "16px",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 12px 30px rgba(204, 160, 67, 0.35)",
              transition: "all 0.25s ease",
              transform: downloading ? "scale(0.98)" : "scale(1)",
            }}
          >
            {downloading ? (
              <>
                <CheckCircle2 size={22} />
                <span>جاري بدء التحميل الآن...</span>
              </>
            ) : (
              <>
                <Download size={22} />
                <span>تحميل ملف التطبيق APK للأندرويد</span>
              </>
            )}
          </button>

          {/* Direct link fallback */}
          <div style={{ textAlign: "center" }}>
            <a 
              href="https://github.com/hamzaovet/choco-house/releases/download/v1.0.0/choco-house.apk"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#cca043",
                fontSize: "12.5px",
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>رابط تحميل احتياطي مباشر (GitHub Releases)</span>
              <ExternalLink size={13} />
            </a>
          </div>

          {/* Quick 3-Step Install Guide */}
          <div 
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "16px 18px",
            }}
          >
            <h3 style={{ fontSize: "13.5px", fontWeight: 800, color: "#e6c37a", marginBottom: "12px" }}>
              خطوات التثبيت السريعة (3 خطوات فقط):
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12.5px", color: "#d1c2b5" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ 
                  background: "#cca043", 
                  color: "#180e06", 
                  width: "20px", 
                  height: "20px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "11px", 
                  fontWeight: 900,
                  flexShrink: 0,
                  marginTop: "1px"
                }}>1</span>
                <span>اضغط على زر <strong>تحميل ملف التطبيق APK</strong> أعلاه أو امسح كود QR.</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ 
                  background: "#cca043", 
                  color: "#180e06", 
                  width: "20px", 
                  height: "20px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "11px", 
                  fontWeight: 900,
                  flexShrink: 0,
                  marginTop: "1px"
                }}>2</span>
                <span>افتح الملف من التنزيلات واضغط <strong>تثبيت (Install)</strong>. إذا طلب هاتفك السماح اختر "السماح بالتثبيت من هذا المصدر".</span>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                <span style={{ 
                  background: "#cca043", 
                  color: "#180e06", 
                  width: "20px", 
                  height: "20px", 
                  borderRadius: "50%", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: "11px", 
                  fontWeight: 900,
                  flexShrink: 0,
                  marginTop: "1px"
                }}>3</span>
                <span>افتح التطبيق واستمتع بأشهى وافل وحلويات وأسرع متابعة لأوردراتك! 🍫</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Highlights Grid */}
      <section
        style={{
          width: "100%",
          maxWidth: "880px",
          marginTop: "36px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          zIndex: 10,
        }}
      >
        <div 
          style={{
            background: "rgba(22, 13, 7, 0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "18px",
            padding: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div style={{ background: "rgba(204, 160, 67, 0.15)", padding: "10px", borderRadius: "12px", color: "#cca043" }}>
            <Zap size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>سرعة استجابة فائقة</h4>
            <p style={{ fontSize: "12px", color: "#8a7565", lineHeight: 1.5 }}>
              تصفح سلس للمنيو وأصناف الشوكولاتة بدون الحاجة لفتح المتصفح في كل مرة.
            </p>
          </div>
        </div>

        <div 
          style={{
            background: "rgba(22, 13, 7, 0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "18px",
            padding: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div style={{ background: "rgba(204, 160, 67, 0.15)", padding: "10px", borderRadius: "12px", color: "#cca043" }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>شات خاص وآمن</h4>
            <p style={{ fontSize: "12px", color: "#8a7565", lineHeight: 1.5 }}>
              محادثاتك مع المطعم معزولة تماماً وخاصة بك وحدك لمتابعة تفاصيل طلبك.
            </p>
          </div>
        </div>

        <div 
          style={{
            background: "rgba(22, 13, 7, 0.7)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "18px",
            padding: "20px",
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
          }}
        >
          <div style={{ background: "rgba(204, 160, 67, 0.15)", padding: "10px", borderRadius: "12px", color: "#cca043" }}>
            <BellRing size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff", marginBottom: "4px" }}>إشعارات لحظية</h4>
            <p style={{ fontSize: "12px", color: "#8a7565", lineHeight: 1.5 }}>
              متابعة حالة تحضير الطلب، خروج الكابتن، ووقت الوصول بدقة.
            </p>
          </div>
        </div>
      </section>

      {/* App Stores Roadmap */}
      <footer 
        style={{
          width: "100%",
          maxWidth: "880px",
          marginTop: "48px",
          textAlign: "center",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: "24px",
          color: "#8a7565",
          fontSize: "12.5px",
          zIndex: 10,
        }}
      >
        <p style={{ marginBottom: "8px" }}>
          🚀 جاري تجهيز وإصدار النسخة الرسمية على <strong>Google Play Store</strong> و <strong>Apple App Store</strong>.
        </p>
        <p style={{ color: "#cca043", fontWeight: 700 }}>
          جميع الحقوق محفوظة © Choco House Desserts {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
