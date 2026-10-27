"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import {
  ClipboardList, CheckCircle2, Clock, Phone, MapPin,
  RefreshCw, ChefHat, Bike, XCircle, AlertCircle
} from "lucide-react";

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
  createdAt: string;
}

export default function DashboardOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, currentUser, loading: authLoading } = useStaff();
  const { lang, t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const prevCount = useRef(0);

  const STATUS_TABS = [
    { id: "active",     label: t("النشطة", "Active") },
    { id: "new",        label: t("جديد", "New") },
    { id: "preparing",  label: t("قيد التحضير", "Preparing") },
    { id: "ready",      label: t("جاهز", "Ready") },
    { id: "delivering", label: t("مع الكابتن", "With Captain") },
    { id: "delivered",  label: t("تم التسليم", "Delivered") },
    { id: "cancelled",  label: t("ملغي", "Cancelled") },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const list: Order[] = Array.isArray(data) ? data : [];
        setOrders(list);

        // Sound alert if new orders arrived
        const newCount = list.filter((o) => o.status === "new").length;
        if (newCount > prevCount.current && prevCount.current > 0) {
          playSound("order");
        }
        prevCount.current = newCount;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      fetchOrders();
      const interval = setInterval(fetchOrders, 12000);
      return () => clearInterval(interval);
    }
  }, [authLoading, currentUser, router, fetchOrders]);

  async function updateStatus(orderId: string, nextStatus: string) {
    setUpdatingId(orderId);
    playSound("click");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          _updatedBy: currentUser?.name || "staff",
        }),
      });
      if (res.ok) {
        if (nextStatus === "delivered") playSound("success");
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: nextStatus as any } : o));
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (selectedTab === "active") {
      return o.status === "new" || o.status === "preparing" || o.status === "ready" || o.status === "delivering";
    }
    return o.status === selectedTab;
  });

  // Calculate counts for each tab
  const getTabCount = (tabId: string) => {
    if (tabId === "active") {
      return orders.filter((o) => o.status === "new" || o.status === "preparing" || o.status === "ready" || o.status === "delivering").length;
    }
    return orders.filter((o) => o.status === tabId).length;
  };

  const parseItems = (raw: string): OrderItem[] => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <ErpLayout activeItem="orders">
      <div>
        {/* ── Page Header ── */}
        <div style={{ marginBottom: "22px" }}>
          <h1 style={{
            fontSize: "26px",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 6px 0",
            lineHeight: 1.2,
          }}>
            {t("شاشة المطبخ والطلبات", "Kitchen & Orders Board")}
          </h1>
          <p style={{
            fontSize: "13.5px",
            color: "#8a7565",
            margin: 0,
            fontWeight: 600,
          }}>
            {t("الطلبات تتحدث لحظياً — تنبيه صوتي عند أي طلب جديد", "Real-time updates — Sound chime on new incoming orders")}
          </p>
        </div>

        {/* ── Horizontal Status Tabs (Exact Whacka Replica) ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}>
          {STATUS_TABS.map((tab) => {
            const count = getTabCount(tab.id);
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setSelectedTab(tab.id); playSound("click"); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  border: isSelected ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected ? "#cca043" : "rgba(255, 255, 255, 0.04)",
                  color: isSelected ? "#180e06" : "#b0957e",
                  fontSize: "13px",
                  fontWeight: isSelected ? 900 : 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 10px rgba(204, 160, 67, 0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                    e.currentTarget.style.color = "#ffffff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
                    e.currentTarget.style.color = "#b0957e";
                  }
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: "11px",
                  opacity: 0.85,
                  background: isSelected ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                  padding: "1px 7px",
                  borderRadius: "100px",
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Orders Display Container ── */}
        {filteredOrders.length === 0 ? (
          /* Empty State Box — 1:1 Whacka */
          <div style={{
            background: "rgba(24, 13, 7, 0.65)",
            border: "1px solid rgba(204, 160, 67, 0.14)",
            borderRadius: "24px",
            minHeight: "360px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 20px",
            textAlign: "center",
          }}>
            {/* Clipboard Icon */}
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "18px",
              background: "rgba(204, 160, 67, 0.12)",
              border: "1px solid rgba(204, 160, 67, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "18px",
              color: "#cca043",
            }}>
              <ClipboardList size={30} strokeWidth={2} />
            </div>

            <h3 style={{
              fontSize: "18px",
              fontWeight: 900,
              color: "#f5ede4",
              margin: "0 0 6px 0",
            }}>
              {t("لا توجد طلبات في هذا القسم", "No orders in this section")}
            </h3>
            <p style={{
              fontSize: "13px",
              color: "#8a7565",
              margin: 0,
              maxWidth: "380px",
              lineHeight: 1.6,
            }}>
              {t("أي طلب جديد من الموقع هيظهر هنا فوراً مع تنبيه صوتي", "Any new order from the website will appear here immediately with an audio alert")}
            </p>
          </div>
        ) : (
          /* Orders Grid */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "18px",
          }}>
            {filteredOrders.map((order) => {
              const items = parseItems(order.items);
              const isUpdating = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "rgba(24, 13, 7, 0.85)",
                    border: "1px solid rgba(204, 160, 67, 0.2)",
                    borderRadius: "20px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <div>
                    {/* Header: Order Number + Status Badge */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                      <span style={{
                        fontFamily: "monospace",
                        color: "#cca043",
                        fontWeight: 900,
                        fontSize: "15px",
                      }}>
                        {order.orderNumber}
                      </span>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: "100px",
                        background:
                          order.status === "new" ? "rgba(59, 130, 246, 0.2)"
                          : order.status === "preparing" ? "rgba(249, 115, 22, 0.2)"
                          : order.status === "ready" ? "rgba(16, 185, 129, 0.2)"
                          : order.status === "delivering" ? "rgba(168, 85, 247, 0.2)"
                          : order.status === "delivered" ? "rgba(34, 197, 94, 0.2)"
                          : "rgba(239, 68, 68, 0.2)",
                        color:
                          order.status === "new" ? "#60a5fa"
                          : order.status === "preparing" ? "#fb923c"
                          : order.status === "ready" ? "#34d399"
                          : order.status === "delivering" ? "#c084fc"
                          : order.status === "delivered" ? "#4ade80"
                          : "#f87171",
                      }}>
                        {order.status === "new" ? t("جديد 📋", "New 📋")
                         : order.status === "preparing" ? t("قيد التحضير 👨‍🍳", "Preparing 👨‍🍳")
                         : order.status === "ready" ? t("جاهز للتسليم 🛵", "Ready 🛵")
                         : order.status === "delivering" ? t("مع الكابتن 🚴", "With Captain 🚴")
                         : order.status === "delivered" ? t("تم التسليم 🎉", "Delivered 🎉")
                         : t("ملغي ❌", "Cancelled ❌")}
                      </span>
                    </div>

                    {/* Customer Info */}
                    <div style={{ marginBottom: "14px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", margin: "0 0 4px 0" }}>
                        {order.customerName}
                      </h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#8a7565", marginBottom: "4px" }}>
                        <Phone size={13} color="#cca043" />
                        <span dir="ltr">{order.phone}</span>
                      </div>
                      {order.address && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12.5px", color: "#8a7565" }}>
                          <MapPin size={13} color="#cca043" />
                          <span>{order.address} ({order.zone})</span>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                      {items.map((it, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                          <span style={{ color: "#ffffff", fontWeight: 700 }}>
                            {it.qty} × {lang === "en" ? (it.nameEn || it.nameAr) : (it.nameAr || it.nameEn)}
                          </span>
                          <span style={{ color: "#cca043", fontWeight: 800 }}>
                            {it.unitPrice * it.qty} {t("ج", "EGP")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer: Total & Actions */}
                  <div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      marginBottom: "12px",
                    }}>
                      <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>{t("الإجمالي", "Total")}</span>
                      <span style={{ fontSize: "18px", color: "#cca043", fontWeight: 900 }}>
                        {order.total} {t("ج", "EGP")}
                      </span>
                    </div>

                    {/* Action Flow Buttons */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {order.status === "new" && (
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          disabled={isUpdating}
                          style={{
                            flex: 1, height: "40px", borderRadius: "12px",
                            background: "#cca043", color: "#180e06",
                            fontWeight: 900, fontSize: "13px", border: "none", cursor: "pointer",
                          }}
                        >
                          {t("بدء التحضير 👨‍🍳", "Start Preparing 👨‍🍳")}
                        </button>
                      )}

                      {order.status === "preparing" && (
                        <button
                          onClick={() => updateStatus(order.id, "ready")}
                          disabled={isUpdating}
                          style={{
                            flex: 1, height: "40px", borderRadius: "12px",
                            background: "#10b981", color: "#ffffff",
                            fontWeight: 900, fontSize: "13px", border: "none", cursor: "pointer",
                          }}
                        >
                          {t("جاهز للتوصيل 🛵", "Ready for Delivery 🛵")}
                        </button>
                      )}

                      {order.status === "ready" && (
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          disabled={isUpdating}
                          style={{
                            flex: 1, height: "40px", borderRadius: "12px",
                            background: "#22c55e", color: "#ffffff",
                            fontWeight: 900, fontSize: "13px", border: "none", cursor: "pointer",
                          }}
                        >
                          {t("تم التسليم بنجاح 🎉", "Delivered Successfully 🎉")}
                        </button>
                      )}

                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(order.id, "cancelled")}
                          disabled={isUpdating}
                          style={{
                            padding: "0 12px", height: "40px", borderRadius: "12px",
                            background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                          }}
                          title={t("إلغاء الطلب", "Cancel Order")}
                        >
                          {t("إلغاء ❌", "Cancel ❌")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ErpLayout>
  );
}
