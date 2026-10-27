"use client";

import React, { useState, useEffect, useCallback } from "react";
import { playSound } from "@/lib/sounds";
import {
  X, User, Mail, Phone, MapPin, Package, CheckCircle2,
  Clock, Bike, ChefHat, LogOut, ArrowRight, ShieldCheck,
  Send, AlertCircle, RefreshCw, MessageCircle
} from "lucide-react";

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  zone?: string;
}

interface OrderItem {
  nameAr?: string;
  nameEn?: string;
  qty: number;
  unitPrice: number;
  extras?: string[];
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address?: string;
  zone?: string;
  status: "new" | "preparing" | "ready" | "delivering" | "delivered" | "cancelled";
  items: string; // JSON
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  captainName?: string;
  captainPhone?: string;
  createdAt: string;
}

interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "ar" | "en";
  onCustomerUpdated?: (cust: CustomerProfile | null) => void;
}

export default function CustomerAccountModal({
  isOpen,
  onClose,
  lang = "ar",
  onCustomerUpdated,
}: CustomerAccountModalProps) {
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");

  // Auth form states
  const [authMode, setAuthMode] = useState<"otp" | "quick">("otp");
  const [step, setStep] = useState<"enter_info" | "enter_code">("enter_info");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Orders state
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load customer profile from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("choco_customer");
      if (raw) {
        const parsed = JSON.parse(raw);
        setCustomer(parsed);
      }
    } catch {}
  }, [isOpen]);

  // Fetch customer orders when customer is logged in
  const fetchCustomerOrders = useCallback(async (cust: CustomerProfile) => {
    setOrdersLoading(true);
    try {
      const params = new URLSearchParams();
      if (cust.phone) params.set("phone", cust.phone);
      if (cust.email) params.set("email", cust.email);

      const res = await fetch(`/api/customer/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer && isOpen) {
      fetchCustomerOrders(customer);
    }
  }, [customer, isOpen, fetchCustomerOrders]);

  if (!isOpen) return null;

  // Handle Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !email.includes("@")) {
      setError(lang === "en" ? "Please enter a valid email address" : "يرجى كتابة بريد إلكتروني صحيح");
      return;
    }
    setLoading(true);
    playSound("click");
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(lang === "en" ? "Verification code sent to your Gmail!" : "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح ✉️");
        setStep("enter_code");
        playSound("success");
      } else {
        setError(data.error || "حدث خطأ أثناء إرسال الرمز");
      }
    } catch {
      setError("تعذر الاتصال بالخادم، تأكد من اتصال الإنترنت");
    } finally {
      setLoading(false);
    }
  }

  // Handle Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!otpCode.trim()) {
      setError(lang === "en" ? "Please enter the 6-digit code" : "يرجى كتابة رمز التحقق");
      return;
    }
    setLoading(true);
    playSound("click");
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          email: email.trim().toLowerCase(),
          code: otpCode.trim(),
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        setCustomer(data.customer);
        localStorage.setItem("choco_customer", JSON.stringify(data.customer));
        window.dispatchEvent(new CustomEvent("choco_customer_updated"));
        onCustomerUpdated?.(data.customer);
        playSound("success");
      } else {
        setError(data.error || "رمز التحقق غير صحيح");
      }
    } catch {
      setError("تعذر التحقق من الرمز");
    } finally {
      setLoading(false);
    }
  }

  // Handle Quick Login with Phone
  async function handleQuickLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!phone.trim()) {
      setError(lang === "en" ? "Please enter your phone number" : "يرجى كتابة رقم الموبايل");
      return;
    }
    setLoading(true);
    playSound("click");
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "quick_login",
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        setCustomer(data.customer);
        localStorage.setItem("choco_customer", JSON.stringify(data.customer));
        window.dispatchEvent(new CustomEvent("choco_customer_updated"));
        onCustomerUpdated?.(data.customer);
        playSound("success");
      } else {
        setError(data.error || "هذا الرقم غير مسجل لدينا، يرجى التسجيل بالبريد أولاً");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }

  // Log out
  function handleLogout() {
    playSound("click");
    localStorage.removeItem("choco_customer");
    setCustomer(null);
    setOrders([]);
    setStep("enter_info");
    window.dispatchEvent(new CustomEvent("choco_customer_updated"));
    onCustomerUpdated?.(null);
  }

  const parseItems = (raw: string): OrderItem[] => {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: customer ? "640px" : "440px",
          maxHeight: "90vh",
          background: "#160d05",
          border: "1px solid rgba(204, 160, 67, 0.35)",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          direction: lang === "ar" ? "rtl" : "ltr",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#1a0f07",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(204, 160, 67, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cca043",
              }}
            >
              <User size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: "#ffffff" }}>
                {customer
                  ? `${lang === "en" ? "Hello," : "أهلاً بك،"} ${customer.name}`
                  : lang === "en"
                  ? "Customer Account"
                  : "حساب العميل وتتبع الطلبات"}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#8a7565" }}>
                {customer
                  ? customer.phone || customer.email
                  : lang === "en"
                  ? "Track your orders live and enjoy fast checkout"
                  : "سجل حسابك لتتبع أوردراتك لايف والطلب بضغطة واحدة"}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playSound("click");
              onClose();
            }}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: "8px",
              padding: "6px",
              color: "#8a7565",
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* ─── CASE A: CUSTOMER LOGGED IN ─── */}
        {customer ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {/* Navigation Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <button
                onClick={() => {
                  setActiveTab("orders");
                  playSound("click");
                  fetchCustomerOrders(customer);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderBottom: activeTab === "orders" ? "2px solid #cca043" : "none",
                  background: activeTab === "orders" ? "rgba(204, 160, 67, 0.1)" : "transparent",
                  color: activeTab === "orders" ? "#cca043" : "#8a7565",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                }}
              >
                <Package size={16} />
                <span>{lang === "en" ? "My Orders" : "طلباتي ومتابعة الأوردر 📦"}</span>
                {orders.length > 0 && (
                  <span
                    style={{
                      background: "#cca043",
                      color: "#180e06",
                      fontSize: "11px",
                      borderRadius: "100px",
                      padding: "1px 7px",
                      fontWeight: 900,
                    }}
                  >
                    {orders.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setActiveTab("profile");
                  playSound("click");
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderBottom: activeTab === "profile" ? "2px solid #cca043" : "none",
                  background: activeTab === "profile" ? "rgba(204, 160, 67, 0.1)" : "transparent",
                  color: activeTab === "profile" ? "#cca043" : "#8a7565",
                  fontWeight: 800,
                  fontSize: "13.5px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "7px",
                }}
              >
                <MapPin size={16} />
                <span>{lang === "en" ? "Delivery Profile" : "بياناتي وعنوان التوصيل 📍"}</span>
              </button>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {activeTab === "orders" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "14px",
                    }}
                  >
                    <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>
                      {lang === "en" ? "Order History & Live Status" : "سجل الطلبات والتتبع اللحظي:"}
                    </span>
                    <button
                      onClick={() => fetchCustomerOrders(customer)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#cca043",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      <RefreshCw size={13} />
                      <span>تحديث الحالة</span>
                    </button>
                  </div>

                  {ordersLoading ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#cca043" }}>
                      جاري تحميل طلباتك... 🍫
                    </div>
                  ) : orders.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "50px 20px",
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: "16px",
                        border: "1px dashed rgba(204, 160, 67, 0.2)",
                      }}
                    >
                      <Package size={40} color="#cca043" style={{ margin: "0 auto 12px" }} />
                      <p style={{ margin: 0, fontWeight: 800, color: "#ffffff", fontSize: "15px" }}>
                        لم تقم بأي طلبات بعد
                      </p>
                      <p style={{ margin: "4px 0 0 0", color: "#8a7565", fontSize: "13px" }}>
                        تصفح المنيو واطلب أحلى وافل وبان كيك وسنوصلك في أسرع وقت!
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                      {orders.map((ord) => {
                        const items = parseItems(ord.items);
                        return (
                          <div
                            key={ord.id}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(204, 160, 67, 0.25)",
                              borderRadius: "16px",
                              padding: "16px",
                            }}
                          >
                            {/* Order Header */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "10px",
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    fontFamily: "monospace",
                                    color: "#cca043",
                                    fontWeight: 900,
                                    fontSize: "15px",
                                  }}
                                >
                                  {ord.orderNumber}
                                </span>
                                <span style={{ fontSize: "11.5px", color: "#8a7565", marginRight: "10px" }}>
                                  {new Date(ord.createdAt).toLocaleDateString("ar-EG", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  padding: "3px 10px",
                                  borderRadius: "100px",
                                  background:
                                    ord.status === "new"
                                      ? "rgba(234, 179, 8, 0.2)"
                                      : ord.status === "preparing"
                                      ? "rgba(249, 115, 22, 0.2)"
                                      : ord.status === "ready"
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : ord.status === "delivering"
                                      ? "rgba(168, 85, 247, 0.2)"
                                      : ord.status === "delivered"
                                      ? "rgba(34, 197, 94, 0.2)"
                                      : "rgba(239, 68, 68, 0.2)",
                                  color:
                                    ord.status === "new"
                                      ? "#facc15"
                                      : ord.status === "preparing"
                                      ? "#fb923c"
                                      : ord.status === "ready"
                                      ? "#34d399"
                                      : ord.status === "delivering"
                                      ? "#c084fc"
                                      : ord.status === "delivered"
                                      ? "#4ade80"
                                      : "#f87171",
                                }}
                              >
                                {ord.status === "new"
                                  ? "تم الاستلام 📋"
                                  : ord.status === "preparing"
                                  ? "قيد التحضير في المطبخ 👨‍🍳"
                                  : ord.status === "ready"
                                  ? "جاهز للتوصيل 🛵"
                                  : ord.status === "delivering"
                                  ? "مع الكابتن في الطريق 🚴"
                                  : ord.status === "delivered"
                                  ? "تم التسليم بنجاح 🎉"
                                  : "ملغي ❌"}
                              </span>
                            </div>

                            {/* Captain Notice (If Delivering) */}
                            {ord.captainName && (
                              <div
                                style={{
                                  background: "rgba(168, 85, 247, 0.15)",
                                  border: "1px dashed rgba(168, 85, 247, 0.4)",
                                  borderRadius: "10px",
                                  padding: "8px 12px",
                                  marginBottom: "10px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Bike size={16} color="#c084fc" />
                                  <span style={{ fontSize: "12px", color: "#e9d5ff", fontWeight: 700 }}>
                                    الكابتن: <strong>{ord.captainName}</strong>
                                    {ord.captainPhone && ` (${ord.captainPhone})`}
                                  </span>
                                </div>
                                {ord.captainPhone && (
                                  <a
                                    href={`tel:${ord.captainPhone}`}
                                    style={{
                                      background: "#9333ea",
                                      color: "#ffffff",
                                      textDecoration: "none",
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      padding: "3px 8px",
                                      borderRadius: "6px",
                                    }}
                                  >
                                    اتصال 📞
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Items Preview */}
                            <div style={{ fontSize: "12.5px", color: "#b0957e", marginBottom: "8px" }}>
                              {items.map((it, i) => (
                                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span>
                                    {it.qty} × {lang === "en" ? it.nameEn || it.nameAr : it.nameAr || it.nameEn}
                                  </span>
                                  <span style={{ color: "#cca043" }}>{it.unitPrice * it.qty} ج</span>
                                </div>
                              ))}
                            </div>

                            {/* Financial Total */}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderTop: "1px solid rgba(255,255,255,0.06)",
                                paddingTop: "8px",
                                fontSize: "13px",
                              }}
                            >
                              <span style={{ color: "#8a7565" }}>
                                الإجمالي (شامل التوصيل):
                              </span>
                              <span style={{ color: "#cca043", fontWeight: 900, fontSize: "15px" }}>
                                {ord.total} ج.م
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "profile" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                      الاسم بالكامل:
                    </label>
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#0d0805",
                        borderRadius: "10px",
                        color: "#ffffff",
                        fontWeight: 700,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {customer.name}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                      رقم الموبايل:
                    </label>
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#0d0805",
                        borderRadius: "10px",
                        color: "#ffffff",
                        fontWeight: 700,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      dir="ltr"
                    >
                      {customer.phone}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                      البريد الإلكتروني المفعّل:
                    </label>
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#0d0805",
                        borderRadius: "10px",
                        color: "#cca043",
                        fontWeight: 700,
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {customer.email || "غير مسجل"}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                      عنوان التوصيل المفضل:
                    </label>
                    <div
                      style={{
                        padding: "10px 14px",
                        background: "#0d0805",
                        borderRadius: "10px",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {customer.address || "مدينة 6 أكتوبر"} ({customer.zone || "الحي الثاني"})
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Logout */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                background: "#1a0f07",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                <LogOut size={14} />
                <span>تسجيل الخروج</span>
              </button>

              <button
                onClick={onClose}
                style={{
                  background: "#cca043",
                  color: "#180e06",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "10px",
                  fontWeight: 900,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        ) : (
          /* ─── CASE B: CUSTOMER LOGIN / REGISTER ─── */
          <div style={{ padding: "24px" }}>
            {/* Toggle Login Mode */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "20px",
                background: "rgba(0,0,0,0.3)",
                padding: "4px",
                borderRadius: "12px",
              }}
            >
              <button
                onClick={() => {
                  setAuthMode("otp");
                  setError("");
                  setMessage("");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: authMode === "otp" ? "#cca043" : "transparent",
                  color: authMode === "otp" ? "#180e06" : "#b0957e",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                تفعيل بالبريد الإلكتروني ✉️
              </button>
              <button
                onClick={() => {
                  setAuthMode("quick");
                  setError("");
                  setMessage("");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: "8px",
                  border: "none",
                  background: authMode === "quick" ? "#cca043" : "transparent",
                  color: authMode === "quick" ? "#180e06" : "#b0957e",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  cursor: "pointer",
                }}
              >
                دخول سريع برقم الهاتف 📱
              </button>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  color: "#4ade80",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "12.5px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <CheckCircle2 size={15} />
                <span>{message}</span>
              </div>
            )}

            {authMode === "otp" ? (
              step === "enter_info" ? (
                /* Step 1: Enter Info */
                <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                      البريد الإلكتروني (Gmail): *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.35)",
                        borderRadius: "10px",
                        padding: "0 12px",
                        color: "#ffffff",
                        fontSize: "13.5px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                      الاسم الكريم: *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد عبد الله"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.35)",
                        borderRadius: "10px",
                        padding: "0 12px",
                        color: "#ffffff",
                        fontSize: "13.5px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                      رقم الموبايل للتوصيل: *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="010XXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{
                        width: "100%",
                        height: "42px",
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.35)",
                        borderRadius: "10px",
                        padding: "0 12px",
                        color: "#ffffff",
                        fontSize: "13.5px",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      dir="ltr"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim() || !name.trim()}
                    style={{
                      height: "46px",
                      background: "linear-gradient(135deg, #cca043, #e8a020)",
                      color: "#180e06",
                      fontWeight: 900,
                      fontSize: "14px",
                      borderRadius: "12px",
                      border: "none",
                      cursor: "pointer",
                      marginTop: "6px",
                      boxShadow: "0 4px 14px rgba(204, 160, 67, 0.35)",
                    }}
                  >
                    {loading ? "جاري الإرسال عبر Gmail..." : "إرسال رمز التفعيل ✉️"}
                  </button>
                </form>
              ) : (
                /* Step 2: Enter OTP Code */
                <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#cca043", fontWeight: 700 }}>
                      أدخل رمز التحقق المكون من 6 أرقام
                    </p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#8a7565" }}>
                      تم إرسال الكود إلى: <strong>{email}</strong>
                    </p>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    required
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{
                      width: "100%",
                      height: "50px",
                      background: "#0d0805",
                      border: "2px solid #cca043",
                      borderRadius: "12px",
                      textAlign: "center",
                      fontFamily: "monospace",
                      fontSize: "24px",
                      letterSpacing: "6px",
                      color: "#ffffff",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="submit"
                      disabled={loading || otpCode.length < 4}
                      style={{
                        flex: 1,
                        height: "44px",
                        background: "#cca043",
                        color: "#180e06",
                        fontWeight: 900,
                        fontSize: "14px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {loading ? "جاري التحقق..." : "تأكيد وتسجيل الدخول ✅"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("enter_info")}
                      style={{
                        height: "44px",
                        padding: "0 14px",
                        background: "rgba(255,255,255,0.06)",
                        color: "#8a7565",
                        fontWeight: 700,
                        fontSize: "12px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      تغيير البريد
                    </button>
                  </div>
                </form>
              )
            ) : (
              /* Quick Login with Phone */
              <form onSubmit={handleQuickLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    رقم الموبايل المسجل:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="010XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{
                      width: "100%",
                      height: "42px",
                      background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.35)",
                      borderRadius: "10px",
                      padding: "0 12px",
                      color: "#ffffff",
                      fontSize: "14px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    dir="ltr"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  style={{
                    height: "46px",
                    background: "#cca043",
                    color: "#180e06",
                    fontWeight: 900,
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "جاري الدخول..." : "دخول مباشر برقم الهاتف 📱"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
