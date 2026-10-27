"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import ThermalReceiptModal, { printThermalReceipt } from "@/components/ThermalReceipt";
import OrderEditModal from "@/components/OrderEditModal";
import {
  ClipboardList, CheckCircle2, Clock, Phone, MapPin,
  RefreshCw, ChefHat, Bike, XCircle, AlertCircle, Printer,
  Volume2, VolumeX, MessageSquare, Send, UserCheck, Eye,
  ExternalLink, User, MessageCircle, DollarSign, QrCode, Copy, Check,
  Edit3, ArrowRight, ArrowLeft
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
  captainName?: string | null;
  captainPhone?: string | null;
  customerEmail?: string | null;
  deposit?: number;
  remaining?: number;
  timeline?: string;
  createdAt: string;
}

interface Captain {
  id: string;
  name: string;
  phone: string;
  vehicle?: string;
}

interface ChatMsg {
  id: string;
  senderName: string;
  senderId?: string | null;
  text: string;
  isStaff: boolean;
  customerPhone?: string | null;
  orderId?: string | null;
  createdAt: string;
}

export default function DashboardOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, currentUser, loading: authLoading } = useStaff();
  const { lang, dir, t } = useLanguage();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState("active");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Persistent Alarm State
  const [alarmMuted, setAlarmMuted] = useState(false);

  // Thermal Receipt Preview
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);

  // Digital QR Code Modal
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);
  const [copiedQrLink, setCopiedQrLink] = useState(false);

  // Captain Assignment Modal
  const [captainModalOrder, setCaptainModalOrder] = useState<Order | null>(null);
  const [captains, setCaptains] = useState<Captain[]>([]);
  const [selectedCaptainPhone, setSelectedCaptainPhone] = useState("");
  const [newCaptainName, setNewCaptainName] = useState("");
  const [newCaptainPhone, setNewCaptainPhone] = useState("");
  const [savingCaptain, setSavingCaptain] = useState(false);

  // Live Customer Inquiries / Chat Drawer
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatReplyText, setChatReplyText] = useState("");
  const [chatRecipientPhone, setChatRecipientPhone] = useState("");
  const [selectedChatPhone, setSelectedChatPhone] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [chatView, setChatView] = useState<"list" | "thread">("list");
  const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);

  const chatCustomers = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; token?: string; count: number; lastMessage: string; lastTime: string }>();
    chatMessages.forEach((m) => {
      const key = m.customerPhone || m.senderId;
      if (key) {
        const existing = map.get(key);
        map.set(key, {
          id: key,
          name: (!m.isStaff && m.senderName) ? m.senderName : (existing?.name || (m.customerPhone ? "عميل" : "زائر ضيف")),
          phone: m.customerPhone || "",
          token: m.senderId || undefined,
          count: (existing?.count || 0) + 1,
          lastMessage: m.text,
          lastTime: m.createdAt,
        });
      }
    });
    return Array.from(map.values());
  }, [chatMessages]);

  useEffect(() => {
    if (!selectedChatPhone && chatCustomers.length > 0) {
      setSelectedChatPhone(chatCustomers[0].id);
      setChatRecipientPhone(chatCustomers[0].phone);
    }
  }, [chatCustomers, selectedChatPhone]);

  const STATUS_TABS = [
    { id: "active",     label: t("النشطة", "Active") },
    { id: "new",        label: t("جديد", "New") },
    { id: "preparing",  label: t("قيد التحضير", "Preparing") },
    { id: "ready",      label: t("جاهز للتسليم", "Ready") },
    { id: "delivering", label: t("مع الكابتن", "With Captain") },
    { id: "delivered",  label: t("تم التسليم والتحصيل", "Delivered & Settled") },
    { id: "cancelled",  label: t("ملغي", "Cancelled") },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        const list: Order[] = Array.isArray(data) ? data : [];
        setOrders(list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCaptains = useCallback(async () => {
    try {
      const res = await fetch("/api/captains");
      if (res.ok) {
        const data = await res.json();
        setCaptains(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, []);

  const fetchChatMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/chat?isStaffView=1");
      if (res.ok) {
        const data = await res.json();
        setChatMessages(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      fetchOrders();
      fetchCaptains();
      fetchChatMessages();
      const interval = setInterval(() => {
        fetchOrders();
        fetchChatMessages();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [authLoading, currentUser, router, fetchOrders, fetchCaptains, fetchChatMessages]);

  // Persistent Looping Alarm for New Orders
  const newOrdersCount = orders.filter((o) => o.status === "new").length;

  useEffect(() => {
    if (newOrdersCount === 0 || alarmMuted) return;

    // Immediately play tone once, then repeat every 3.8s
    playSound("alarm");
    const alarmInterval = setInterval(() => {
      playSound("alarm");
    }, 3800);

    return () => clearInterval(alarmInterval);
  }, [newOrdersCount, alarmMuted]);

  async function updateStatus(orderId: string, nextStatus: string, extraData?: Record<string, any>) {
    setUpdatingId(orderId);
    playSound("click");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          _updatedBy: currentUser?.name || "staff",
          ...extraData,
        }),
      });
      if (res.ok) {
        if (nextStatus === "delivered") playSound("success");
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status: nextStatus as any, ...(extraData || {}) }
              : o
          )
        );
      }
    } finally {
      setUpdatingId(null);
    }
  }

  // Assign Captain and change status to 'delivering'
  async function assignCaptainToOrder() {
    if (!captainModalOrder) return;
    setSavingCaptain(true);
    try {
      let captainName = "";
      let captainPhone = "";

      if (selectedCaptainPhone === "custom") {
        captainName = newCaptainName.trim();
        captainPhone = newCaptainPhone.trim();
        if (!captainName || !captainPhone) {
          alert("برجاء إدخال اسم ورقم هاتف الكابتن");
          setSavingCaptain(false);
          return;
        }
        // Save new captain to directory
        await fetch("/api/captains", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: captainName, phone: captainPhone }),
        });
        fetchCaptains();
      } else {
        const found = captains.find((c) => c.phone === selectedCaptainPhone);
        if (found) {
          captainName = found.name;
          captainPhone = found.phone;
        } else {
          alert("برجاء اختيار كابتن");
          setSavingCaptain(false);
          return;
        }
      }

      await updateStatus(captainModalOrder.id, "delivering", {
        captainName,
        captainPhone,
      });

      playSound("success");
      setCaptainModalOrder(null);
      setSelectedCaptainPhone("");
      setNewCaptainName("");
      setNewCaptainPhone("");
    } finally {
      setSavingCaptain(false);
    }
  }

  // Send Staff Reply in Customer Chat
  async function handleSendReply() {
    if (!chatReplyText.trim()) return;
    const activeTarget = chatCustomers.find((c) => c.id === selectedChatPhone);
    const targetPhone = activeTarget?.phone || chatRecipientPhone || null;
    const targetToken = activeTarget?.token || null;
    setSendingReply(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: currentUser?.name || "فريق Choco House",
          senderRole: currentUser?.role || "staff",
          text: chatReplyText.trim(),
          isStaff: true,
          customerPhone: targetPhone,
          token: targetToken,
        }),
      });
      if (res.ok) {
        setChatReplyText("");
        playSound("chat");
        fetchChatMessages();
      }
    } finally {
      setSendingReply(false);
    }
  }

  // Filter orders based on active tab
  const filteredOrders = orders.filter((o) => {
    if (selectedTab === "active") {
      return (
        o.status === "new" ||
        o.status === "preparing" ||
        o.status === "ready" ||
        o.status === "delivering"
      );
    }
    return o.status === selectedTab;
  });

  const getTabCount = (tabId: string) => {
    if (tabId === "active") {
      return orders.filter(
        (o) =>
          o.status === "new" ||
          o.status === "preparing" ||
          o.status === "ready" ||
          o.status === "delivering"
      ).length;
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

  // Helper WhatsApp link for customer
  const getCustomerWhatsAppUrl = (order: Order) => {
    const cleanPhone = order.phone.replace(/[^0-9]/g, "");
    const egyptianPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
    const msg = `مرحباً ${order.customerName} من Choco House 🍫\nأوردر رقم: #${order.orderNumber}\nالحالة الحالية: ${
      order.status === "delivering" ? `مع الكابتن ${order.captainName || ""} 🛵` : "قيد التجهيز 👨‍🍳"
    }\nالإجمالي المطلوب: ${order.total} ج.م\nلأي استفسار تواصل معنا!`;
    return `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Helper WhatsApp link for captain
  const getCaptainWhatsAppUrl = (order: Order) => {
    if (!order.captainPhone) return "#";
    const cleanPhone = order.captainPhone.replace(/[^0-9]/g, "");
    const egyptianPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
    const msg = `أهلاً كابتن ${order.captainName} 🛵\nتفاصيل الأوردر للتسليم:\nرقم الأوردر: #${order.orderNumber}\nالعميل: ${order.customerName}\nالهاتف: ${order.phone}\nالعنوان: ${order.address || "غير محدد"} (${order.zone || ""})\nالمطلوب تحصيله: ${order.total} ج.م\nطريقة الدفع: ${order.paymentMethod === "cash" ? "كاش 💵" : "مدفوع إلكترونياً 💳"}`;
    return `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <ErpLayout activeItem="orders">
      <div>
        {/* ── Persistent Alarm Flashing Banner ── */}
        {newOrdersCount > 0 && (
          <div
            style={{
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              border: "2px solid #fecaca",
              borderRadius: "16px",
              padding: "14px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 6px 24px rgba(220, 38, 38, 0.45)",
              animation: "pulse 1.8s infinite",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#ffffff" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={26} color="#ffffff" strokeWidth={2.5} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 900 }}>
                  {t(
                    `🚨 تنبيه فوري: يوجد ${newOrdersCount} طلب جديد بانتظار استلامك والتحضير!`,
                    `🚨 Alert: ${newOrdersCount} new order(s) waiting for acceptance & prep!`
                  )}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", opacity: 0.9 }}>
                  {t(
                    "صوت المنبه يعمل باستمرار لتنبيه المطبخ والكاشير حتى يتم قبول الطلب",
                    "Continuous kitchen alarm ringing until order is accepted or muted"
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setAlarmMuted(!alarmMuted);
                playSound("click");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                padding: "10px 18px",
                borderRadius: "12px",
                background: alarmMuted ? "#ffffff" : "rgba(0, 0, 0, 0.35)",
                color: alarmMuted ? "#dc2626" : "#ffffff",
                border: "none",
                fontWeight: 900,
                fontSize: "13.5px",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
              }}
            >
              {alarmMuted ? (
                <>
                  <Volume2 size={18} />
                  <span>{t("تشغيل الصوت 🔔", "Unmute Alarm 🔔")}</span>
                </>
              ) : (
                <>
                  <VolumeX size={18} />
                  <span>{t("كتم الصوت مؤقتاً 🔕", "Mute Alarm 🔕")}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Page Header & Top Quick Actions ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "22px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#ffffff",
                margin: "0 0 6px 0",
                lineHeight: 1.2,
              }}
            >
              {t("شاشة المطبخ والطلبات ولوجستيات التوصيل", "Kitchen & Delivery Logistics Board")}
            </h1>
            <p
              style={{
                fontSize: "13.5px",
                color: "#8a7565",
                margin: 0,
                fontWeight: 600,
              }}
            >
              {t(
                "إدارة دورة حياة الأوردر — طباعة ريسيت حراري 80mm — تعيين الطيار — تحصيل الفلوس",
                "Full order lifecycle — 80mm thermal receipt printing — Captain assignment & cash settlement"
              )}
            </p>
          </div>

          {/* Quick Actions Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => {
                setChatDrawerOpen(true);
                playSound("click");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(204, 160, 67, 0.12)",
                border: "1px solid rgba(204, 160, 67, 0.35)",
                color: "#cca043",
                padding: "9px 16px",
                borderRadius: "12px",
                fontWeight: 800,
                fontSize: "13px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <MessageSquare size={16} />
              <span>{t("شات واستفسارات العملاء 💬", "Customer Live Chat 💬")}</span>
              {chatMessages.length > 0 && (
                <span
                  style={{
                    background: "#cca043",
                    color: "#180e06",
                    fontSize: "11px",
                    fontWeight: 900,
                    padding: "1px 7px",
                    borderRadius: "100px",
                  }}
                >
                  {chatMessages.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                fetchOrders();
                fetchCaptains();
                playSound("click");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e8a020",
                padding: "9px 14px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} />
              <span>{t("تحديث 🔄", "Refresh 🔄")}</span>
            </button>
          </div>
        </div>

        {/* ── Horizontal Status Tabs ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            overflowX: "auto",
            paddingBottom: "10px",
            marginBottom: "20px",
          }}
        >
          {STATUS_TABS.map((tab) => {
            const count = getTabCount(tab.id);
            const isSelected = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedTab(tab.id);
                  playSound("click");
                }}
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
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: "11px",
                    opacity: 0.85,
                    background: isSelected ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.06)",
                    padding: "1px 7px",
                    borderRadius: "100px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Orders Display Container ── */}
        {filteredOrders.length === 0 ? (
          <div
            style={{
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
            }}
          >
            <div
              style={{
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
              }}
            >
              <ClipboardList size={30} strokeWidth={2} />
            </div>

            <h3
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color: "#f5ede4",
                margin: "0 0 6px 0",
              }}
            >
              {t("لا توجد طلبات في هذا القسم", "No orders in this section")}
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "#8a7565",
                margin: 0,
                maxWidth: "380px",
                lineHeight: 1.6,
              }}
            >
              {t(
                "أي طلب جديد من الموقع هيظهر هنا فوراً مع تنبيه صوتي مستمر",
                "Any new order from the website will appear here immediately with continuous sound alert"
              )}
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredOrders.map((order) => {
              const items = parseItems(order.items);
              const isUpdating = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "rgba(24, 13, 7, 0.9)",
                    border:
                      order.status === "new"
                        ? "1.5px solid #eab308"
                        : order.status === "delivering"
                        ? "1.5px solid #a855f7"
                        : "1px solid rgba(204, 160, 67, 0.25)",
                    borderRadius: "20px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
                    position: "relative",
                  }}
                >
                  <div>
                    {/* Header: Order Number + Actions (Receipt & Status Badge) */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            color: "#cca043",
                            fontWeight: 900,
                            fontSize: "16px",
                          }}
                        >
                          {order.orderNumber}
                        </span>

                        {/* Direct Print Thermal Receipt Button */}
                        <button
                          onClick={() => printThermalReceipt(order as any)}
                          title={t("طباعة ريسيت حراري فوري 🖨️", "Print Thermal Receipt 🖨️")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "rgba(204, 160, 67, 0.15)",
                            border: "1px solid rgba(204, 160, 67, 0.35)",
                            color: "#cca043",
                            borderRadius: "8px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          <Printer size={13} />
                          <span>80mm</span>
                        </button>

                        {/* Digital QR Receipt Button */}
                        <button
                          onClick={() => {
                            setQrModalOrder(order);
                            playSound("click");
                          }}
                          title={t("كيو ار الفاتورة الذكية للموبايل 📱", "Digital QR Receipt 📱")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "rgba(168, 85, 247, 0.15)",
                            border: "1px solid rgba(168, 85, 247, 0.35)",
                            color: "#c084fc",
                            borderRadius: "8px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          <QrCode size={13} />
                          <span>QR 📱</span>
                        </button>

                        {/* Edit Order Button */}
                        {order.status !== "delivered" && order.status !== "cancelled" && (
                          <button
                            onClick={() => {
                              setOrderToEdit(order);
                              playSound("click");
                            }}
                            title={t("تعديل أصناف وتفاصيل الأوردر ✏️", "Edit Order Items & Details ✏️")}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "rgba(59, 130, 246, 0.15)",
                              border: "1px solid rgba(59, 130, 246, 0.35)",
                              color: "#60a5fa",
                              borderRadius: "8px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            <Edit3 size={13} />
                            <span>{t("تعديل ✏️", "Edit ✏️")}</span>
                          </button>
                        )}

                        <button
                          onClick={() => setPreviewOrder(order)}
                          title={t("معاينة الفاتورة", "Preview Receipt")}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#9c7a5e",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                        >
                          <Eye size={15} />
                        </button>
                      </div>

                      {/* Status Badge + Edited Flag */}
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {order.timeline?.includes("edited") && (
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: 900,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              background: "rgba(249, 115, 22, 0.2)",
                              border: "1px solid rgba(249, 115, 22, 0.4)",
                              color: "#fb923c",
                            }}
                            title={t("تم تعديل أصناف هذا الطلب", "Order has been edited")}
                          >
                            معدّل ✏️
                          </span>
                        )}
                        <span
                          style={{
                          fontSize: "11.5px",
                          fontWeight: 800,
                          padding: "4px 10px",
                          borderRadius: "100px",
                          background:
                            order.status === "new"
                              ? "rgba(234, 179, 8, 0.2)"
                              : order.status === "preparing"
                              ? "rgba(249, 115, 22, 0.2)"
                              : order.status === "ready"
                              ? "rgba(16, 185, 129, 0.2)"
                              : order.status === "delivering"
                              ? "rgba(168, 85, 247, 0.2)"
                              : order.status === "delivered"
                              ? "rgba(34, 197, 94, 0.2)"
                              : "rgba(239, 68, 68, 0.2)",
                          color:
                            order.status === "new"
                              ? "#facc15"
                              : order.status === "preparing"
                              ? "#fb923c"
                              : order.status === "ready"
                              ? "#34d399"
                              : order.status === "delivering"
                              ? "#c084fc"
                              : order.status === "delivered"
                              ? "#4ade80"
                              : "#f87171",
                        }}
                      >
                        {order.status === "new"
                          ? t("جديد 📋", "New 📋")
                          : order.status === "preparing"
                          ? t("قيد التحضير 👨‍🍳", "Preparing 👨‍🍳")
                          : order.status === "ready"
                          ? t("جاهز للتسليم 🛵", "Ready 🛵")
                          : order.status === "delivering"
                          ? t("مع الكابتن 🚴", "With Captain 🚴")
                          : order.status === "delivered"
                          ? t("تم التسليم والتحصيل 🎉", "Delivered 🎉")
                          : t("ملغي ❌", "Cancelled ❌")}
                      </span>
                    </div>
                  </div>

                    {/* Customer Info Card */}
                    <div
                      style={{
                        marginBottom: "14px",
                        background: "rgba(0, 0, 0, 0.25)",
                        padding: "12px",
                        borderRadius: "14px",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "6px",
                        }}
                      >
                        <h4
                          style={{
                            fontSize: "15px",
                            fontWeight: 900,
                            color: "#ffffff",
                            margin: 0,
                          }}
                        >
                          {order.customerName}
                        </h4>

                        {/* Customer WhatsApp Free Link */}
                        <a
                          href={getCustomerWhatsAppUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => playSound("click")}
                          title={t("مراسلة العميل عبر واتساب مجاناً", "Message Customer on WhatsApp")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: "rgba(34, 197, 94, 0.15)",
                            border: "1px solid rgba(34, 197, 94, 0.35)",
                            color: "#4ade80",
                            borderRadius: "8px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 800,
                            textDecoration: "none",
                          }}
                        >
                          <MessageCircle size={12} />
                          <span>واتساب 💬</span>
                        </a>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12.5px",
                          color: "#b0957e",
                          marginBottom: "4px",
                        }}
                      >
                        <Phone size={13} color="#cca043" />
                        <a
                          href={`tel:${order.phone}`}
                          style={{ color: "#f5ede4", textDecoration: "none" }}
                          dir="ltr"
                        >
                          {order.phone}
                        </a>
                      </div>

                      {order.address && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "12px",
                            color: "#8a7565",
                          }}
                        >
                          <MapPin size={13} color="#cca043" />
                          <span>
                            {order.address} ({order.zone || "6 أكتوبر"})
                          </span>
                        </div>
                      )}

                      {order.notes && (
                        <div
                          style={{
                            marginTop: "6px",
                            fontSize: "11.5px",
                            color: "#f59e0b",
                            background: "rgba(245, 158, 11, 0.1)",
                            padding: "4px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          ⚠️ {order.notes}
                        </div>
                      )}
                    </div>

                    {/* Captain Info (If Assigned) */}
                    {order.captainName && (
                      <div
                        style={{
                          background: "rgba(168, 85, 247, 0.12)",
                          border: "1px solid rgba(168, 85, 247, 0.3)",
                          borderRadius: "12px",
                          padding: "10px 12px",
                          marginBottom: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Bike size={18} color="#c084fc" />
                          <div>
                            <div style={{ fontSize: "11px", color: "#c084fc", fontWeight: 700 }}>
                              {t("طيار التوصيل المسؤول:", "Assigned Captain:")}
                            </div>
                            <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#ffffff" }}>
                              {order.captainName}
                            </div>
                            {order.captainPhone && (
                              <div style={{ fontSize: "11.5px", color: "#d8b4fe" }} dir="ltr">
                                {order.captainPhone}
                              </div>
                            )}
                          </div>
                        </div>

                        {order.captainPhone && (
                          <a
                            href={getCaptainWhatsAppUrl(order)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "rgba(168, 85, 247, 0.25)",
                              color: "#e9d5ff",
                              border: "none",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              fontSize: "11px",
                              fontWeight: 800,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Send size={11} />
                            <span>بياناته 📱</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Order Items List */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        marginBottom: "16px",
                        maxHeight: "180px",
                        overflowY: "auto",
                      }}
                    >
                      {items.map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            borderBottom: "1px dashed rgba(255,255,255,0.06)",
                            paddingBottom: "4px",
                          }}
                        >
                          <div>
                            <span style={{ color: "#ffffff", fontWeight: 700 }}>
                              {it.qty} ×{" "}
                              {lang === "en"
                                ? it.nameEn || it.nameAr
                                : it.nameAr || it.nameEn}
                            </span>
                            {it.extras && it.extras.length > 0 && (
                              <div style={{ fontSize: "11px", color: "#cca043", marginTop: "2px" }}>
                                + {it.extras.join(" + ")}
                              </div>
                            )}
                          </div>
                          <span style={{ color: "#cca043", fontWeight: 800 }}>
                            {it.unitPrice * it.qty} {t("ج", "EGP")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer: Financials & Action Buttons */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        marginBottom: "12px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "12px", color: "#8a7565", display: "block" }}>
                          {t("المطلوب تحصيله", "To Collect")}{" "}
                          {order.paymentMethod === "cash" ? "(كاش 💵)" : "(مدفوع 💳)"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#cca043" }}>
                          + توصيل {order.deliveryFee} ج
                        </span>
                      </div>
                      <span style={{ fontSize: "20px", color: "#cca043", fontWeight: 900 }}>
                        {order.total} {t("ج", "EGP")}
                      </span>
                    </div>

                    {/* Step-by-Step Logistics Flow */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {/* NEW -> PREPARING */}
                      {order.status === "new" && (
                        <button
                          onClick={() => updateStatus(order.id, "preparing")}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            height: "42px",
                            borderRadius: "12px",
                            background: "#cca043",
                            color: "#180e06",
                            fontWeight: 900,
                            fontSize: "13px",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <ChefHat size={16} />
                          <span>{t("بدء التحضير 👨‍🍳", "Start Preparing 👨‍🍳")}</span>
                        </button>
                      )}

                      {/* PREPARING -> READY */}
                      {order.status === "preparing" && (
                        <button
                          onClick={() => updateStatus(order.id, "ready")}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            height: "42px",
                            borderRadius: "12px",
                            background: "#10b981",
                            color: "#ffffff",
                            fontWeight: 900,
                            fontSize: "13px",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <CheckCircle2 size={16} />
                          <span>{t("جاهز للتوصيل 🛵", "Ready for Delivery 🛵")}</span>
                        </button>
                      )}

                      {/* READY -> ASSIGN CAPTAIN -> DELIVERING */}
                      {order.status === "ready" && (
                        <button
                          onClick={() => {
                            setCaptainModalOrder(order);
                            setSelectedCaptainPhone(captains[0]?.phone || "custom");
                            playSound("click");
                          }}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            height: "42px",
                            borderRadius: "12px",
                            background: "#9333ea",
                            color: "#ffffff",
                            fontWeight: 900,
                            fontSize: "13px",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 4px 14px rgba(147, 51, 234, 0.35)",
                          }}
                        >
                          <Bike size={16} />
                          <span>{t("تسليم للطيار 🛵", "Assign to Captain 🛵")}</span>
                        </button>
                      )}

                      {/* DELIVERING -> SETTLED & DELIVERED */}
                      {order.status === "delivering" && (
                        <button
                          onClick={() => updateStatus(order.id, "delivered")}
                          disabled={isUpdating}
                          style={{
                            flex: 1,
                            height: "42px",
                            borderRadius: "12px",
                            background: "#22c55e",
                            color: "#ffffff",
                            fontWeight: 900,
                            fontSize: "13px",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            boxShadow: "0 4px 14px rgba(34, 197, 94, 0.35)",
                          }}
                        >
                          <DollarSign size={16} />
                          <span>{t("تم التحصيل والتسليم 🎉", "Collect Cash & Deliver 🎉")}</span>
                        </button>
                      )}

                      {/* CANCEL */}
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <button
                          onClick={() => updateStatus(order.id, "cancelled")}
                          disabled={isUpdating}
                          style={{
                            padding: "0 12px",
                            height: "42px",
                            borderRadius: "12px",
                            background: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            color: "#f87171",
                            fontSize: "12px",
                            fontWeight: 700,
                            cursor: "pointer",
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

        {/* ═══════════════════════════════════════════════════════
            MODAL 1: ASSIGN CAPTAIN TO ORDER
        ══════════════════════════════════════════════════════════ */}
        {captainModalOrder && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(0,0,0,0.85)",
            }}
          >
            <div
              style={{
                background: "#180d06",
                border: "1px solid rgba(204, 160, 67, 0.4)",
                borderRadius: "24px",
                padding: "26px",
                maxWidth: "460px",
                width: "100%",
                boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
                color: "#f5ede4",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "12px",
                      background: "rgba(168, 85, 247, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#c084fc",
                    }}
                  >
                    <Bike size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 900 }}>
                      {t("ربط الطيار بالأوردر", "Assign Delivery Captain")}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#cca043" }}>
                      أوردر رقم {captainModalOrder.orderNumber} — المطلوب: {captainModalOrder.total} ج
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setCaptainModalOrder(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#8a7565",
                    cursor: "pointer",
                  }}
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Captain Selection List */}
              <div style={{ marginBottom: "18px" }}>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#b0957e",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {t("اختر الطيار من القائمة المسجلة:", "Select Captain from Registered Staff:")}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {captains.map((cpt) => (
                    <label
                      key={cpt.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        borderRadius: "12px",
                        background:
                          selectedCaptainPhone === cpt.phone
                            ? "rgba(204, 160, 67, 0.15)"
                            : "rgba(255,255,255,0.03)",
                        border:
                          selectedCaptainPhone === cpt.phone
                            ? "1.5px solid #cca043"
                            : "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="captain"
                        value={cpt.phone}
                        checked={selectedCaptainPhone === cpt.phone}
                        onChange={() => setSelectedCaptainPhone(cpt.phone)}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#ffffff" }}>
                          {cpt.name}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#8a7565" }} dir="ltr">
                          {cpt.phone} • {cpt.vehicle || "سكوتر دليفري"}
                        </div>
                      </div>
                    </label>
                  ))}

                  {/* Option for New / External Captain */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background:
                        selectedCaptainPhone === "custom"
                          ? "rgba(204, 160, 67, 0.15)"
                          : "rgba(255,255,255,0.03)",
                      border:
                        selectedCaptainPhone === "custom"
                          ? "1.5px solid #cca043"
                          : "1px solid rgba(255,255,255,0.08)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="captain"
                      value="custom"
                      checked={selectedCaptainPhone === "custom"}
                      onChange={() => setSelectedCaptainPhone("custom")}
                    />
                    <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#ffffff" }}>
                      {t("طيار جديد / خارجي ➕", "Add New / External Captain ➕")}
                    </div>
                  </label>
                </div>
              </div>

              {/* If Custom Captain Selected */}
              {selectedCaptainPhone === "custom" && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    padding: "14px",
                    borderRadius: "14px",
                    border: "1px solid rgba(204, 160, 67, 0.2)",
                    marginBottom: "18px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                      اسم الكابتن:
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: كابتن خالد المصري"
                      value={newCaptainName}
                      onChange={(e) => setNewCaptainName(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.3)",
                        borderRadius: "10px",
                        padding: "0 12px",
                        color: "#ffffff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                      رقم موبايل الكابتن:
                    </label>
                    <input
                      type="tel"
                      placeholder="010XXXXXXXX"
                      value={newCaptainPhone}
                      onChange={(e) => setNewCaptainPhone(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.3)",
                        borderRadius: "10px",
                        padding: "0 12px",
                        color: "#ffffff",
                        fontSize: "13px",
                        boxSizing: "border-box",
                      }}
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={assignCaptainToOrder}
                  disabled={savingCaptain}
                  style={{
                    flex: 1,
                    height: "44px",
                    background: "#9333ea",
                    color: "#ffffff",
                    fontWeight: 900,
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {savingCaptain
                    ? t("جاري التعيين...", "Assigning...")
                    : t("تأكيد وإسناد الأوردر للطيار 🛵", "Confirm & Assign 🛵")}
                </button>
                <button
                  onClick={() => setCaptainModalOrder(null)}
                  style={{
                    height: "44px",
                    padding: "0 16px",
                    background: "rgba(255,255,255,0.06)",
                    color: "#b0957e",
                    fontWeight: 700,
                    fontSize: "13px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {t("إلغاء", "Cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 2: CUSTOMER INQUIRIES & LIVE CHAT DRAWER
        ══════════════════════════════════════════════════════════ */}
        {chatDrawerOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              justifyContent: dir === "rtl" ? "flex-start" : "flex-end",
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(4px)",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setChatDrawerOpen(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "460px",
                height: "100%",
                background: "#160d05",
                borderRight: dir === "rtl" ? "1px solid rgba(204, 160, 67, 0.3)" : "none",
                borderLeft: dir === "ltr" ? "1px solid rgba(204, 160, 67, 0.3)" : "none",
                display: "flex",
                flexDirection: "column",
                boxShadow: dir === "rtl" ? "10px 0 35px rgba(0,0,0,0.8)" : "-10px 0 35px rgba(0,0,0,0.8)",
              }}
            >
              {/* Drawer Header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#1a0f07",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {chatView === "thread" && (
                    <button
                      onClick={() => {
                        setChatView("list");
                        playSound("click");
                      }}
                      style={{
                        background: "rgba(204, 160, 67, 0.15)",
                        border: "1px solid rgba(204, 160, 67, 0.3)",
                        color: "#cca043",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11.5px",
                        fontWeight: 800,
                      }}
                    >
                      {dir === "rtl" ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                      <span>{t("المحادثات", "Chats")}</span>
                    </button>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MessageSquare size={18} color="#cca043" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                        {chatView === "thread" && selectedChatPhone
                          ? chatCustomers.find((c) => c.id === selectedChatPhone)?.name || "محادثة عميل"
                          : t("شات واستفسارات العملاء", "Customer Inquiries Chat")}
                      </h3>
                      <p style={{ margin: 0, fontSize: "11px", color: "#8a7565" }}>
                        {chatView === "thread" && selectedChatPhone
                          ? (chatCustomers.find((c) => c.id === selectedChatPhone)?.phone || "عميل عبر المتجر")
                          : `${chatCustomers.length} ${t("محادثة نشطة", "active chats")}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {chatView === "thread" && selectedChatPhone && (
                    <a
                      href={`https://wa.me/${
                        selectedChatPhone.replace(/[^0-9]/g, "").startsWith("0")
                          ? "2" + selectedChatPhone.replace(/[^0-9]/g, "")
                          : selectedChatPhone.replace(/[^0-9]/g, "")
                      }?text=${encodeURIComponent("مرحباً من فريق Choco House 🍫")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="مراسلة العميل عبر واتساب مباشرة"
                      style={{
                        background: "rgba(34, 197, 94, 0.15)",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        color: "#4ade80",
                        padding: "6px 10px",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: 800,
                        fontSize: "11px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <MessageCircle size={13} />
                      <span>واتساب</span>
                    </a>
                  )}

                  <button
                    onClick={() => setChatDrawerOpen(false)}
                    style={{ background: "transparent", border: "none", color: "#8a7565", cursor: "pointer", padding: "4px" }}
                  >
                    <XCircle size={22} />
                  </button>
                </div>
              </div>

              {/* View 1: CONVERSATIONS LIST (WhatsApp style vertical list) */}
              {chatView === "list" ? (
                <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Broadcast Option */}
                  <div
                    onClick={() => {
                      setSelectedChatPhone("");
                      setChatRecipientPhone("");
                      setChatView("thread");
                      playSound("click");
                    }}
                    style={{
                      background: "rgba(204, 160, 67, 0.08)",
                      border: "1px dashed rgba(204, 160, 67, 0.35)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "38px",
                        height: "38px",
                        borderRadius: "50%",
                        background: "#cca043",
                        color: "#180e06",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: "14px",
                      }}>
                        📢
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "#f5ede4" }}>
                          {t("بث رسالة عامة للجميع", "Broadcast Message to All")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#8a7565" }}>
                          إرسال تنبيه أو إشعار لجميع زوار المتجر
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", color: "#cca043", fontWeight: 700 }}>
                      {chatMessages.length} رسالة
                    </span>
                  </div>

                  {chatCustomers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7565" }}>
                      <MessageSquare size={36} color="#7a5c3e" style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#f5ede4", marginBottom: "4px" }}>
                        لا توجد محادثات عملاء حتى الآن
                      </div>
                      <div style={{ fontSize: "12px" }}>
                        أي استفسار يكتبه عميل في المتجر سيظهر هنا فوراً للتواصل معه
                      </div>
                    </div>
                  ) : (
                    chatCustomers.map((cust) => {
                      const isSelected = selectedChatPhone === cust.id;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedChatPhone(cust.id);
                            setChatRecipientPhone(cust.phone);
                            setChatView("thread");
                            playSound("click");
                          }}
                          style={{
                            background: isSelected ? "rgba(204, 160, 67, 0.15)" : "rgba(255, 255, 255, 0.03)",
                            border: isSelected ? "1px solid rgba(204, 160, 67, 0.4)" : "1px solid rgba(255, 255, 255, 0.06)",
                            borderRadius: "14px",
                            padding: "12px 14px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {/* Avatar */}
                          <div style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "rgba(204, 160, 67, 0.2)",
                            border: "1px solid rgba(204, 160, 67, 0.4)",
                            color: "#cca043",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "15px",
                            flexShrink: 0,
                          }}>
                            {cust.name.slice(0, 1) || "ع"}
                          </div>

                          {/* Info & Last Message */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                              <h4 style={{ margin: 0, fontSize: "13.5px", fontWeight: 800, color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cust.name}
                              </h4>
                              {cust.lastTime && (
                                <span style={{ fontSize: "10.5px", color: "#8a7565" }}>
                                  {new Date(cust.lastTime).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                              <p style={{
                                margin: 0,
                                fontSize: "12px",
                                color: "#b0957e",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}>
                                {cust.lastMessage || (cust.phone ? `هاتف: ${cust.phone}` : "محادثة نشطة")}
                              </p>
                              <span style={{
                                background: "#cca043",
                                color: "#180e06",
                                fontSize: "10px",
                                fontWeight: 900,
                                padding: "1px 7px",
                                borderRadius: "100px",
                                flexShrink: 0,
                              }}>
                                {cust.count}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* View 2: ACTIVE CONVERSATION THREAD */
                <>
                  <div
                    style={{
                      flex: 1,
                      padding: "16px 18px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    {chatMessages.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: "#8a7565", fontSize: "13px" }}>
                        لا توجد رسائل في هذه المحادثة حتى الآن
                      </div>
                    ) : (
                      (selectedChatPhone
                        ? chatMessages.filter(
                            (m) =>
                              (m.customerPhone && m.customerPhone === selectedChatPhone) ||
                              (m.senderId && m.senderId === selectedChatPhone) ||
                              (!m.customerPhone && !m.senderId && m.isStaff)
                          )
                        : chatMessages
                      ).map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: msg.isStaff ? "flex-start" : "flex-end",
                            maxWidth: "85%",
                            background: msg.isStaff ? "rgba(204, 160, 67, 0.15)" : "rgba(255, 255, 255, 0.08)",
                            border: msg.isStaff ? "1px solid rgba(204, 160, 67, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "14px",
                            padding: "10px 14px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              color: msg.isStaff ? "#cca043" : "#60a5fa",
                              marginBottom: "3px",
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <span>{msg.senderName}</span>
                            {msg.customerPhone && (
                              <span dir="ltr" style={{ color: "#8a7565" }}>
                                {msg.customerPhone}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "13.5px", color: "#f5ede4", lineHeight: 1.4, wordBreak: "break-word" }}>
                            {msg.text}
                          </div>
                          <div style={{ fontSize: "10px", color: "#8a7565", marginTop: "4px", textAlign: "left" }}>
                            {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Chat Reply Input */}
                  <div
                    style={{
                      padding: "14px 18px",
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                      background: "#1a0f07",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11.5px" }}>
                      <span style={{ color: "#cca043", fontWeight: 700 }}>
                        الرد موجه إلى:{" "}
                        <strong>
                          {selectedChatPhone
                            ? chatCustomers.find((c) => c.id === selectedChatPhone)?.name || selectedChatPhone
                            : "جميع العملاء (بث عام)"}
                        </strong>
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="اكتب ردك للعميل..."
                        value={chatReplyText}
                        onChange={(e) => setChatReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendReply();
                        }}
                        style={{
                          flex: 1,
                          height: "42px",
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          borderRadius: "12px",
                          padding: "0 14px",
                          color: "#ffffff",
                          fontSize: "13px",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !chatReplyText.trim()}
                        style={{
                          width: "44px",
                          height: "42px",
                          borderRadius: "12px",
                          background: "#cca043",
                          border: "none",
                          color: "#180e06",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 3: THERMAL RECEIPT MODAL PREVIEW
        ══════════════════════════════════════════════════════════ */}
        {previewOrder && (
          <ThermalReceiptModal
            order={previewOrder as any}
            onClose={() => setPreviewOrder(null)}
          />
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 4: DIGITAL QR RECEIPT MODAL
        ══════════════════════════════════════════════════════════ */}
        {qrModalOrder && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(0,0,0,0.85)",
            }}
          >
            <div
              style={{
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.4)",
                borderRadius: "24px",
                padding: "26px",
                maxWidth: "400px",
                width: "100%",
                textAlign: "center",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                color: "#f5ede4",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <QrCode size={22} color="#cca043" />
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#ffffff" }}>
                    الفاتورة الذكية والتتبع (QR) 📱
                  </h3>
                </div>
                <button
                  onClick={() => setQrModalOrder(null)}
                  style={{ background: "transparent", border: "none", color: "#8a7565", cursor: "pointer" }}
                >
                  <XCircle size={22} />
                </button>
              </div>

              <p style={{ margin: "0 0 16px 0", fontSize: "12.5px", color: "#8a7565" }}>
                امسح الرمز بكاميرا الموبايل لفتح الفاتورة الذكية والتتبع للطيار أو العميل بدون طابعة
              </p>

              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "16px",
                  display: "inline-block",
                  marginBottom: "16px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    (typeof window !== "undefined" ? window.location.origin : "https://choco-house.vercel.app") +
                      "/receipt/" +
                      qrModalOrder.id
                  )}`}
                  alt="Order QR Code"
                  style={{ width: "190px", height: "190px", display: "block" }}
                />
              </div>

              <div style={{ marginBottom: "18px", fontSize: "13px" }}>
                <div style={{ fontFamily: "monospace", fontWeight: 900, color: "#cca043", fontSize: "16px" }}>
                  {qrModalOrder.orderNumber}
                </div>
                <div style={{ color: "#ffffff", fontWeight: 700, marginTop: "2px" }}>
                  العميل: {qrModalOrder.customerName} ({qrModalOrder.phone})
                </div>
                <div style={{ color: "#4ade80", fontWeight: 800, marginTop: "2px" }}>
                  المطلوب تحصيله: {qrModalOrder.total} ج.م
                </div>
                {qrModalOrder.captainName && (
                  <div style={{ color: "#c084fc", fontSize: "12px", marginTop: "4px" }}>
                    🛵 الكابتن: {qrModalOrder.captainName}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => {
                    const url =
                      (typeof window !== "undefined" ? window.location.origin : "https://choco-house.vercel.app") +
                      "/receipt/" +
                      qrModalOrder.id;
                    navigator.clipboard.writeText(url);
                    setCopiedQrLink(true);
                    playSound("click");
                    setTimeout(() => setCopiedQrLink(false), 2500);
                  }}
                  style={{
                    flex: 1,
                    height: "42px",
                    background: copiedQrLink ? "#22c55e" : "rgba(204, 160, 67, 0.2)",
                    border: "1px solid rgba(204, 160, 67, 0.4)",
                    color: copiedQrLink ? "#ffffff" : "#cca043",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  {copiedQrLink ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedQrLink ? "تم النسخ!" : "نسخ الرابط 📋"}</span>
                </button>

                <a
                  href={`/receipt/${qrModalOrder.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    height: "42px",
                    background: "#cca043",
                    color: "#180e06",
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "12.5px",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <ExternalLink size={16} />
                  <span>فتح الفاتورة 🔗</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 5: ORDER EDIT MODAL
        ══════════════════════════════════════════════════════════ */}
        {orderToEdit && (
          <OrderEditModal
            order={orderToEdit}
            isOpen={Boolean(orderToEdit)}
            onClose={() => setOrderToEdit(null)}
            onOrderUpdated={(updated) => {
              setOrders((prev) =>
                prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
              );
              setOrderToEdit(null);
            }}
            onPrintReceipt={(ord) => printThermalReceipt(ord as any)}
            lang={lang}
          />
        )}
      </div>
    </ErpLayout>
  );
}
