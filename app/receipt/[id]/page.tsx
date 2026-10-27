"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, MapPin, Phone, Bike, ChefHat,
  Printer, ArrowRight, MessageCircle, AlertCircle, RefreshCw, ShieldCheck
} from "lucide-react";
import { printThermalReceipt } from "@/components/ThermalReceipt";

interface OrderItem {
  nameAr?: string;
  nameEn?: string;
  qty: number;
  unitPrice: number;
  extras?: string[];
}

interface Order {
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
  captainName?: string | null;
  captainPhone?: string | null;
  createdAt: string;
}

export default function DigitalReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError("لم يتم العثور على الفاتورة المطلوبة");
      }
    } catch {
      setError("حدث خطأ أثناء تحميل الفاتورة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 6000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function handleMarkDelivered() {
    if (!order) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "delivered",
          _updatedBy: "captain_digital_scan",
        }),
      });
      if (res.ok) {
        fetchOrder();
      }
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0d0805", color: "#cca043", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-cairo), sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🍫</div>
          <p style={{ fontWeight: 800, fontSize: "16px" }}>جاري تحميل الفاتورة الذكية...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", background: "#0d0805", color: "#f5ede4", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "var(--font-cairo), sans-serif" }}>
        <div style={{ maxWidth: "400px", width: "100%", background: "#160d05", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "20px", padding: "28px", textAlign: "center" }}>
          <AlertCircle size={44} color="#ef4444" style={{ margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px" }}>تعذر فتح الفاتورة</h2>
          <p style={{ color: "#8a7565", fontSize: "13px", marginBottom: "20px" }}>{error || "تأكد من صحة رمز الـ QR أو رقم الأوردر"}</p>
          <Link href="/" style={{ display: "inline-block", background: "#cca043", color: "#180e06", padding: "10px 20px", borderRadius: "10px", fontWeight: 800, textDecoration: "none" }}>
            العودة للموقع الرئيسي
          </Link>
        </div>
      </div>
    );
  }

  const items: OrderItem[] = (() => {
    try {
      return JSON.parse(order.items);
    } catch {
      return [];
    }
  })();

  const cleanCustomerPhone = order.phone.replace(/[^0-9]/g, "");
  const customerWaPhone = cleanCustomerPhone.startsWith("0") ? "2" + cleanCustomerPhone : cleanCustomerPhone;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "#0d0805", color: "#f5ede4", padding: "20px 14px", fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <div style={{ maxWidth: "460px", margin: "0 auto" }}>
        {/* Top Back Nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#cca043", textDecoration: "none", fontSize: "13px", fontWeight: 800 }}>
            <ArrowRight size={16} />
            <span>Choco House Desserts</span>
          </Link>

          <button
            onClick={() => fetchOrder()}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#cca043", padding: "6px 10px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <RefreshCw size={12} />
            <span>تحديث</span>
          </button>
        </div>

        {/* Digital Receipt Card */}
        <div style={{ background: "#ffffff", color: "#180e06", borderRadius: "22px", padding: "24px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>
          {/* Logo & Header */}
          <div style={{ textAlign: "center", marginBottom: "14px" }}>
            <img src="/choco-logo.png" alt="Choco House" style={{ width: "170px", height: "auto", margin: "0 auto 6px", display: "block" }} />
            <div style={{ fontSize: "11.5px", color: "#444", fontWeight: 700 }}>6 أكتوبر — الحي الثاني / المحور المركزي</div>
            <div style={{ fontSize: "12.5px", fontWeight: 800, marginTop: "2px" }}>هاتف المتجر: 01091413470</div>
          </div>

          <div style={{ borderTop: "1.5px dashed #444", margin: "12px 0" }} />

          {/* Order Number & Live Status Badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div>
              <span style={{ fontSize: "12px", color: "#666", display: "block" }}>رقم الأوردر:</span>
              <span style={{ fontFamily: "monospace", fontSize: "17px", fontWeight: 900, color: "#92400e" }}>
                {order.orderNumber}
              </span>
            </div>

            {/* Status Pill */}
            <span
              style={{
                fontSize: "12px",
                fontWeight: 900,
                padding: "4px 12px",
                borderRadius: "100px",
                background:
                  order.status === "new" ? "#fef3c7"
                  : order.status === "preparing" ? "#ffedd5"
                  : order.status === "ready" ? "#d1fae5"
                  : order.status === "delivering" ? "#f3e8ff"
                  : order.status === "delivered" ? "#dcfce7"
                  : "#fee2e2",
                color:
                  order.status === "new" ? "#b45309"
                  : order.status === "preparing" ? "#c2410c"
                  : order.status === "ready" ? "#047857"
                  : order.status === "delivering" ? "#7e22ce"
                  : order.status === "delivered" ? "#15803d"
                  : "#b91c1c",
              }}
            >
              {order.status === "new" ? "تم الاستلام 📋"
               : order.status === "preparing" ? "قيد التحضير 👨‍🍳"
               : order.status === "ready" ? "جاهز للتسليم 🛵"
               : order.status === "delivering" ? "مع الكابتن 🚴"
               : order.status === "delivered" ? "تم التسليم بنجاح 🎉"
               : "ملغي ❌"}
            </span>
          </div>

          <div style={{ fontSize: "12px", color: "#666", display: "flex", justifyContent: "space-between" }}>
            <span>التاريخ: {new Date(order.createdAt).toLocaleDateString("ar-EG")}</span>
            <span>الساعة: {new Date(order.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>

          <div style={{ borderTop: "1px dashed #666", margin: "12px 0" }} />

          {/* Customer Details */}
          <div style={{ fontSize: "13px", lineHeight: 1.6 }}>
            <div><strong>العميل:</strong> {order.customerName}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div><strong>الموبايل:</strong> <span dir="ltr">{order.phone}</span></div>
              <div style={{ display: "flex", gap: "6px" }}>
                <a href={`tel:${order.phone}`} style={{ background: "#f3f4f6", color: "#180e06", padding: "2px 8px", borderRadius: "6px", textDecoration: "none", fontSize: "11px", fontWeight: 800 }}>
                  اتصال 📞
                </a>
                <a href={`https://wa.me/${customerWaPhone}`} target="_blank" rel="noopener noreferrer" style={{ background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "6px", textDecoration: "none", fontSize: "11px", fontWeight: 800 }}>
                  واتساب 💬
                </a>
              </div>
            </div>
            <div><strong>المنطقة:</strong> {order.zone || "الحي الثاني"}</div>
            {order.address && <div><strong>العنوان:</strong> {order.address}</div>}
            {order.notes && <div style={{ color: "#b45309", background: "#fef3c7", padding: "4px 8px", borderRadius: "6px", marginTop: "4px" }}><strong>ملاحظات:</strong> {order.notes}</div>}
          </div>

          {/* Captain Details Box */}
          {order.captainName && (
            <div style={{ marginTop: "10px", padding: "8px 12px", background: "#f3e8ff", border: "1px dashed #c084fc", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#7e22ce", fontWeight: 800 }}>كابتن التوصيل:</div>
                <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#180e06" }}>{order.captainName}</div>
                {order.captainPhone && <div style={{ fontSize: "11.5px", color: "#581c87" }} dir="ltr">{order.captainPhone}</div>}
              </div>
              {order.captainPhone && (
                <a href={`tel:${order.captainPhone}`} style={{ background: "#9333ea", color: "#ffffff", padding: "4px 10px", borderRadius: "8px", textDecoration: "none", fontSize: "11.5px", fontWeight: 800 }}>
                  اتصال بالطيار 📞
                </a>
              )}
            </div>
          )}

          <div style={{ borderTop: "2px solid #180e06", margin: "14px 0 10px" }} />

          {/* Items Table */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: "12.5px", borderBottom: "1px solid #180e06", paddingBottom: "4px", marginBottom: "6px" }}>
              <span>الصنف</span>
              <span>الكمية</span>
              <span>السعر</span>
            </div>

            {items.map((it, idx) => (
              <div key={idx} style={{ padding: "4px 0", borderBottom: "1px dashed #eee" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                  <span style={{ fontWeight: 800 }}>{it.nameAr || it.nameEn || "صنف"}</span>
                  <span style={{ fontWeight: 700 }}>× {it.qty}</span>
                  <span style={{ fontWeight: 900 }}>{it.unitPrice * it.qty} ج</span>
                </div>
                {it.extras && it.extras.length > 0 && (
                  <div style={{ fontSize: "11px", color: "#666", paddingRight: "10px" }}>
                    + {it.extras.join(" + ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px dashed #666", margin: "10px 0" }} />

          {/* Financials Breakdown */}
          <div style={{ fontSize: "13px", lineHeight: 1.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>المجموع الفرعي:</span>
              <span style={{ fontWeight: 700 }}>{order.subtotal} ج</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>خدمة التوصيل ({order.zone || "6 أكتوبر"}):</span>
              <span style={{ fontWeight: 700 }}>{order.deliveryFee} ج</span>
            </div>

            <div style={{ borderTop: "2px solid #180e06", margin: "8px 0" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "16px", fontWeight: 900 }}>
              <span>المطلوب تحصيله:</span>
              <span style={{ fontSize: "20px", color: "#92400e" }}>{order.total} ج.م</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: "4px" }}>
              <span>طريقة الدفع:</span>
              <span style={{ fontWeight: 800 }}>
                {order.paymentMethod === "cash" ? "كاش عند الاستلام 💵"
                 : order.paymentMethod === "instapay" ? "إنستاباي (تم الدفع) ⚡"
                 : "فيزا / كارت 💳"}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1.5px dashed #444", margin: "14px 0 10px" }} />

          {/* Action for Captain: Complete & Collect Cash */}
          {order.status === "delivering" && (
            <div style={{ marginTop: "14px" }}>
              <button
                onClick={handleMarkDelivered}
                disabled={updating}
                style={{
                  width: "100%",
                  height: "46px",
                  background: "#22c55e",
                  color: "#ffffff",
                  fontWeight: 900,
                  fontSize: "14px",
                  borderRadius: "12px",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
                }}
              >
                <CheckCircle2 size={18} />
                <span>{updating ? "جاري التحديث..." : "تأكيد التسليم واستلام النقدية ✅"}</span>
              </button>
            </div>
          )}

          {/* Print Button */}
          <div style={{ marginTop: "12px" }}>
            <button
              onClick={() => printThermalReceipt(order as any)}
              style={{
                width: "100%",
                height: "42px",
                background: "#f3f4f6",
                color: "#180e06",
                border: "1px solid #d1d5db",
                borderRadius: "10px",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Printer size={16} />
              <span>طباعة الريسيت الحراري (80mm) 🖨️</span>
            </button>
          </div>

          <div style={{ textAlign: "center", fontSize: "11px", color: "#666", marginTop: "14px" }}>
            شكراً لطلبكم من بيت الشوكولاتة 🍫<br />
            *** نسعد دائماً بخدمتكم ***
          </div>
        </div>
      </div>
    </div>
  );
}
