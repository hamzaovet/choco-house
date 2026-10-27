"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import {
  ChefHat, UtensilsCrossed, Package, CircleDollarSign,
  Users, Store, LogOut, Shield, Settings, Bell, Globe, UserCheck,
  Menu, X
} from "lucide-react";
import SettingsModal from "@/components/SettingsModal";

interface ErpLayoutProps {
  children: React.ReactNode;
  activeItem?: "orders" | "menu" | "inventory" | "reports" | "users" | "customers";
}

export default function ErpLayout({ children, activeItem }: ErpLayoutProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { currentUser, logout, permissions } = useStaff();
  const { lang, toggleLang, dir, t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    function handleResize() {
      setIsMobile(window.innerWidth <= 1024);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Determine current active item from path if not explicitly provided
  const currentActive = activeItem || (
    pathname === "/dashboard" || pathname === "/kitchen" || pathname === "/cashier" ? "orders"
    : pathname === "/menu-admin" || pathname === "/offers-admin" ? "menu"
    : pathname === "/inventory" ? "inventory"
    : pathname === "/reports" || pathname === "/expenses" ? "reports"
    : pathname === "/customers" ? "customers"
    : pathname === "/users" ? "users"
    : "orders"
  );

  const isOwner = currentUser?.role === "owner";
  const isManager = currentUser?.role === "manager";

  function handleTestSound() {
    playSound("order");
  }

  function handleLogout() {
    playSound("click");
    logout();
    router.push("/login");
  }

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      backgroundColor: "#0d0805",
      color: "#f5ede4",
      display: "flex",
      fontFamily: "var(--font-cairo), system-ui, -apple-system, sans-serif",
    }}>

      {/* ══════════════════════════════════════════════════════════
          SIDEBAR — Whacka 1:1 Operations Hub
      ══════════════════════════════════════════════════════════ */}
      {/* Mobile Backdrop Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 998,
          }}
        />
      )}

      <aside style={{
        width: isMobile ? "270px" : "250px",
        maxWidth: "85vw",
        height: "100vh",
        position: isMobile ? "fixed" : "sticky",
        top: 0,
        bottom: 0,
        ...(isMobile ? (dir === "rtl" ? { right: 0 } : { left: 0 }) : {}),
        flexShrink: 0,
        backgroundColor: "#160d05",
        borderLeft: dir === "rtl" ? "1px solid rgba(204, 160, 67, 0.16)" : "none",
        borderRight: dir === "ltr" ? "1px solid rgba(204, 160, 67, 0.16)" : "none",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxSizing: "border-box",
        zIndex: isMobile ? 999 : 40,
        transform: isMobile
          ? mobileMenuOpen
            ? "translateX(0)"
            : dir === "rtl"
            ? "translateX(100%)"
            : "translateX(-100%)"
          : "none",
        transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: isMobile && mobileMenuOpen ? "0 0 40px rgba(0,0,0,0.9)" : "none",
      }}>
        {/* Top: Brand Header & Nav Links */}
        <div>
          {/* Logo & Brand + Mobile Close */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
            padding: "0 6px",
          }}>
            <Link
              href="/"
              onClick={() => { if (isMobile) setMobileMenuOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                textDecoration: "none",
              }}
            >
              <div style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: "#cca043",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#180e06",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                }}>
                  CH
                </span>
              </div>
              <div>
                <div style={{
                  fontSize: "17px",
                  fontWeight: 700,
                  color: "#f5ede4",
                  fontFamily: "var(--font-playfair), Georgia, serif",
                  lineHeight: 1.15,
                }}>
                  Choco House
                </div>
                <div style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#cca043",
                  marginTop: "2px",
                  letterSpacing: "1px",
                }}>
                  {t("لوحة التشغيل", "Operations Hub")}
                </div>
              </div>
            </Link>

            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#cca043",
                  borderRadius: "8px",
                  padding: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {[
              {
                id: "orders",
                href: "/dashboard",
                label: t("المطبخ والطلبات", "Kitchen & Orders"),
                icon: ChefHat,
              },
              {
                id: "menu",
                href: "/menu-admin",
                label: t("المنيو والأسعار", "Menu & Prices"),
                icon: UtensilsCrossed,
              },
              {
                id: "inventory",
                href: "/inventory",
                label: t("المخزن والتكاليف", "Inventory & Costs"),
                icon: Package,
              },
              {
                id: "reports",
                href: "/reports",
                label: t("الحسابات والأرباح", "Finances & Profits"),
                icon: CircleDollarSign,
              },
              {
                id: "customers",
                href: "/customers",
                label: t("قاعدة بيانات العملاء", "Customers CRM"),
                icon: UserCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = currentActive === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    playSound("click");
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "11px 14px",
                    borderRadius: "14px",
                    textDecoration: "none",
                    fontSize: "13.5px",
                    fontWeight: isActive ? 900 : 700,
                    transition: "all 0.15s ease",
                    background: isActive ? "#cca043" : "transparent",
                    color: isActive ? "#180e06" : "#b0957e",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                      e.currentTarget.style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#b0957e";
                    }
                  }}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.5 : 2} color={isActive ? "#180e06" : "#cca043"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Staff Management Button (Whacka Replica) */}
          <Link
            href="/users"
            onClick={() => {
              playSound("click");
              if (isMobile) setMobileMenuOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              background: currentActive === "users" ? "#cca043" : "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: currentActive === "users" ? "#180e06" : "#f5ede4",
              padding: "10px 14px",
              borderRadius: "14px",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 800,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (currentActive !== "users") {
                e.currentTarget.style.borderColor = "#cca043";
                e.currentTarget.style.color = "#cca043";
              }
            }}
            onMouseLeave={(e) => {
              if (currentActive !== "users") {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "#f5ede4";
              }
            }}
          >
            <Users size={15} />
            <span>{t("إدارة الموظفين", "Team Management")}</span>
          </Link>

          {/* Storefront Link */}
          <Link
            href="/"
            onClick={() => {
              playSound("click");
              if (isMobile) setMobileMenuOpen(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              color: "#8a7565",
              textDecoration: "none",
              fontSize: "13px",
              fontWeight: 700,
              borderRadius: "10px",
              transition: "color 0.15s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#cca043"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#8a7565"; }}
          >
            <Store size={15} />
            <span>{t("المتجر", "Storefront")}</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              background: "transparent",
              border: "none",
              color: "#ef4444",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              borderRadius: "10px",
              textAlign: dir === "rtl" ? "right" : "left",
            }}
          >
            <LogOut size={15} />
            <span>{t("خروج", "Logout")}</span>
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════
          MAIN AREA (Top Bar + Page Content + Bottom Note)
      ══════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>

        {/* ── Top Bar — Whacka 1:1 ── */}
        <header style={{
          minHeight: "64px",
          padding: isMobile ? "10px 14px" : "0 28px",
          borderBottom: "1px solid rgba(204, 160, 67, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#100904",
          gap: "10px",
          flexWrap: "wrap",
        }}>
          {/* Right: Hamburger button (on mobile) + User Role & Name Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isMobile && (
              <button
                onClick={() => {
                  playSound("click");
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                style={{
                  background: "rgba(204, 160, 67, 0.15)",
                  border: "1px solid rgba(204, 160, 67, 0.35)",
                  color: "#cca043",
                  borderRadius: "10px",
                  padding: "7px 10px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 800,
                }}
                aria-label="القائمة"
              >
                <Menu size={18} />
                <span>{t("القائمة", "Menu")}</span>
              </button>
            )}

            <div suppressHydrationWarning style={{
              width: "34px",
              height: "34px",
              borderRadius: "50%",
              background: mounted ? (isOwner ? "#ea580c" : isManager ? "#0284c7" : "#0369a1") : "#ea580c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
              flexShrink: 0,
            }}>
              <Shield size={16} strokeWidth={2.3} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span suppressHydrationWarning style={{ fontSize: "14px", fontWeight: 900, color: "#ffffff" }}>
                  {isOwner ? "Owner" : currentUser?.name || "Owner"}
                </span>
                <span style={{ fontSize: "11px", color: "#cca043", fontWeight: 700 }}>
                  🛡️
                </span>
              </div>
              <div suppressHydrationWarning style={{ fontSize: "11px", color: "#8a7565", fontWeight: 600 }}>
                {isOwner
                  ? t("الرتبة: مدير / Manager - مالك النظام", "Role: Manager - System Owner")
                  : isManager
                  ? t("الرتبة: مدير / Manager", "Role: Manager")
                  : currentUser
                  ? t(`الرتبة: ${permissions.label}`, `Role: ${currentUser.role}`)
                  : t("الرتبة: مدير / Manager - مالك النظام", "Role: Manager - System Owner")}
              </div>
            </div>
          </div>

          {/* Left: Action controls (Sound test, Settings, Lang) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Test Sound Button */}
            <button
              onClick={handleTestSound}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(204, 160, 67, 0.1)",
                border: "1px solid rgba(204, 160, 67, 0.35)",
                borderRadius: "100px",
                height: "36px",
                padding: isMobile ? "0 10px" : "0 14px",
                color: "#cca043",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(204, 160, 67, 0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(204, 160, 67, 0.1)"; }}
            >
              <Bell size={14} color="#cca043" />
              <span>{isMobile ? "صوت 🔔" : t("تجربة الصوت 🔔", "Test Audio 🔔")}</span>
            </button>

            {/* Settings button */}
            <button
              onClick={() => { playSound("click"); setShowSettings(true); }}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#b0957e",
                cursor: "pointer",
              }}
              title={t("إعدادات النظام والمتجر", "System & Store Settings")}
            >
              <Settings size={16} />
            </button>

            {/* Language button */}
            <button
              onClick={() => {
                playSound("click");
                toggleLang();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                height: "36px",
                padding: "0 10px",
                borderRadius: "10px",
                background: "transparent",
                border: "1px solid rgba(204, 160, 67, 0.35)",
                color: "#cca043",
                fontSize: "12px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Globe size={13} color="#cca043" />
              <span>{lang === "ar" ? "EN 🌐" : "ع 🌐"}</span>
            </button>
          </div>
        </header>

        {/* ── Main Page Content ── */}
        <main style={{
          flex: 1,
          padding: isMobile ? "14px 10px" : "28px",
          boxSizing: "border-box",
          minWidth: 0,
          width: "100%",
          overflowX: "hidden",
        }}>
          {children}
        </main>

        {/* ── Bottom Credit Note (Whacka Replica) ── */}
        <footer style={{
          padding: "16px 28px 24px",
          textAlign: "center",
          fontSize: "11.5px",
          color: "#7a5c3e",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        }}>
          {t(
            "تم تطوير النظام بواسطة شركة أوركا للحلول البرمجية والخدمات السحابية حفاظاً على حقوق ملكيتك الكاملة للفكرة والتطوير",
            "System developed by Orca Software Solutions & Cloud Services to protect your full intellectual property and development rights."
          )}
        </footer>
      </div>

      {/* System Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
