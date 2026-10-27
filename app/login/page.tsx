"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStaff();
  const { lang, toggleLang, dir, t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showPwd, setShowPwd]   = useState(false);

  function getRouteForRole(role?: string) {
    if (role === "owner" || role === "manager") return "/dashboard";
    if (role === "chef") return "/kitchen";
    if (role === "accountant") return "/reports";
    return "/cashier";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t("يرجى إدخال اسم المستخدم وكلمة المرور", "Please enter username and password"));
      return;
    }
    setLoading(true);
    setError("");

    const res = await login(username.trim(), password, "username");
    setLoading(false);

    if (res.success && res.user) {
      playSound("success");
      router.push(getRouteForRole(res.user.role));
    } else {
      playSound("alert");
      setError(res.error || t("اسم المستخدم أو كلمة المرور غير صحيحة", "Invalid username or password"));
    }
  }

  async function handleOwnerQuickLogin() {
    setLoading(true);
    setError("");
    const res = await login("maestro", "Tha012157230@#$", "username");
    setLoading(false);

    if (res.success && res.user) {
      playSound("success");
      router.push("/dashboard");
    } else {
      playSound("alert");
      setError(res.error || t("تعذر تسجيل الدخول كمالك", "Could not log in as owner"));
    }
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "#cca043";
    e.target.style.boxShadow   = "0 0 0 3px rgba(204,160,67,0.18)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "#e5dac9";
    e.target.style.boxShadow   = "none";
  }

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      background: "#160d05",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      position: "relative",
      fontFamily: "var(--font-cairo), system-ui, -apple-system, Arial, sans-serif",
    }}>

      {/* Language Toggle Button */}
      <button
        type="button"
        onClick={() => { playSound("click"); toggleLang(); }}
        style={{
          position: "absolute",
          top: "20px",
          [dir === "rtl" ? "left" : "right"]: "24px",
          padding: "8px 16px",
          borderRadius: "100px",
          backgroundColor: "rgba(204, 160, 67, 0.12)",
          border: "1px solid rgba(204, 160, 67, 0.3)",
          color: "#cca043",
          fontWeight: 800,
          fontSize: "13px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          transition: "all 0.2s ease",
        }}
        title={t("تغيير لغة لوحة التحكم", "Switch Language")}
      >
        <span>{lang === "ar" ? "EN 🌐" : "ع 🌐"}</span>
      </button>

      {/* ── Brand — exact Whacka 1:1 replica ── */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <h1 style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#cca043",
          margin: "0 0 8px 0",
          fontFamily: "var(--font-playfair), Georgia, 'Times New Roman', serif",
          fontStyle: "normal",
          letterSpacing: "0.2px",
        }}>
          Choco House Desserts
        </h1>
        <p style={{
          fontSize: "13.5px",
          color: "#9c7a5e",
          margin: 0,
          fontWeight: 600,
        }}>
          {t("منصة الموظفين والإدارة", "Staff & Management Portal")}
        </p>
      </div>

      {/* ── White Login Card — Exact Whacka 1:1 ── */}
      <div style={{
        width: "100%",
        maxWidth: "410px",
        background: "#ffffff",
        borderRadius: "24px",
        padding: "36px 32px 32px",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        boxSizing: "border-box",
      }}>

        <h2 style={{
          fontSize: "20px",
          fontWeight: 900,
          color: "#180e06",
          margin: "0 0 6px 0",
          textAlign: "center",
        }}>
          {t("تسجيل الدخول إلى Choco House", "Log in to Choco House")}
        </h2>
        <p style={{
          fontSize: "13px",
          color: "#8a7565",
          margin: "0 0 26px 0",
          textAlign: "center",
        }}>
          {t("أدخل اسم المستخدم وكلمة المرور", "Enter your username and password")}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Username */}
          <div>
            <label style={{
              display: "block", fontSize: "13px", fontWeight: 700,
              color: "#3a2010", marginBottom: "7px",
            }}>
              {t("اسم المستخدم", "Username")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("اسم المستخدم", "Username")}
              autoComplete="username"
              autoFocus
              style={{
                width: "100%", height: "48px",
                background: "#faf8f5",
                border: "1.5px solid #e5dac9",
                borderRadius: "12px",
                padding: "0 16px",
                fontSize: "14px", color: "#180e06",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
                fontFamily: "var(--font-cairo), system-ui, sans-serif",
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: "block", fontSize: "13px", fontWeight: 700,
              color: "#3a2010", marginBottom: "7px",
            }}>
              {t("كلمة المرور", "Password")}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("كلمة المرور", "Password")}
                autoComplete="current-password"
                style={{
                  width: "100%", height: "48px",
                  background: "#faf8f5",
                  border: "1.5px solid #e5dac9",
                  borderRadius: "12px",
                  padding: dir === "rtl" ? "0 44px 0 16px" : "0 16px 0 44px",
                  fontSize: "14px",
                  color: "#180e06",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  fontFamily: showPwd ? "monospace" : "inherit",
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: "absolute",
                  [dir === "rtl" ? "left" : "right"]: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none",
                  cursor: "pointer", fontSize: "15px",
                  color: "#8a7565", padding: "4px",
                }}
                tabIndex={-1}
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: "10px", padding: "10px 14px",
              fontSize: "13px", color: "#dc2626", textAlign: "center",
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Submit button — solid gold button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", height: "48px",
              background: "#cca043",
              color: "#ffffff",
              fontWeight: 800, fontSize: "15.5px",
              borderRadius: "100px",
              border: "none", cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 3px 14px rgba(204,160,67,0.35)",
              transition: "all 0.2s ease",
              marginTop: "4px",
              fontFamily: "var(--font-cairo), system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#dfb252"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#cca043"; }}
          >
            {loading ? t("جاري التحقق...", "Verifying...") : t("تسجيل الدخول", "Log In")}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          margin: "24px 0 18px",
        }}>
          <div style={{ flex: 1, height: "1px", background: "#e8ded2" }} />
          <span style={{ fontSize: "12px", color: "#a58d79", fontWeight: 700 }}>
            {t("المالك", "Owner")}
          </span>
          <div style={{ flex: 1, height: "1px", background: "#e8ded2" }} />
        </div>

        {/* Owner quick-login button */}
        <button
          onClick={handleOwnerQuickLogin}
          disabled={loading}
          style={{
            width: "100%", height: "46px",
            background: "#ffffff",
            border: "1.5px solid #d4c4b0",
            borderRadius: "100px",
            color: "#180e06", fontWeight: 800, fontSize: "14.5px",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            fontFamily: "var(--font-cairo), system-ui, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#cca043";
            e.currentTarget.style.color = "#cca043";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#d4c4b0";
            e.currentTarget.style.color = "#180e06";
          }}
        >
          {t("تسجيل الدخول كمالك", "Log in as Owner")}
        </button>

        {/* Owner note */}
        <p style={{
          fontSize: "11px",
          color: "#9c8573",
          textAlign: "center",
          margin: "12px 0 0 0",
          lineHeight: 1.6,
        }}>
          {t("بحساب Whacka الذي تُبني به هذا التطبيق — لا توجد كلمة مرور منفصلة للمالك.", "Authorized via system administrator credentials — no separate password needed.")}
        </p>

        {/* Footer */}
        <p style={{
          marginTop: "22px",
          fontSize: "11.5px", color: "#a58d79",
          textAlign: "center", margin: "22px 0 0 0",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
        }}>
          {t("مُقدّم من Whacka", "Powered by Whacka")} <span style={{ color: "#cca043" }}>✻</span>
        </p>
      </div>
    </div>
  );
}
