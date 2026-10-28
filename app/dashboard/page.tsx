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
  Edit3, ArrowRight, ArrowLeft,
  Power, Plus, Trash2, Star, Sparkles
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
  isActive?: boolean;
  createdAt?: string;
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

  // Dynamic Fleet Operations Command Center Modal
  const [fleetModalOpen, setFleetModalOpen] = useState(false);
  const [fleetCaptainName, setFleetCaptainName] = useState("");
  const [fleetCaptainPhone, setFleetCaptainPhone] = useState("");
  const [fleetCaptainVehicle, setFleetCaptainVehicle] = useState("Ø³ÙƒÙˆØªØ±");
  const [savingFleetCaptain, setSavingFleetCaptain] = useState(false);

  // Instant WhatsApp Dispatch Banner after assignment
  const [assignedDispatch, setAssignedDispatch] = useState<{
    order: Order;
    captainName: string;
    captainPhone: string;
  } | null>(null);

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
          name: (!m.isStaff && m.senderName) ? m.senderName : (existing?.name || (m.customerPhone ? "Ø¹Ù…ÙŠÙ„" : "Ø²Ø§Ø¦Ø± Ø¶ÙŠÙ")),
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
    { id: "active",     label: t("Ø§Ù„Ù†Ø´Ø·Ø©", "Active") },
    { id: "new",        label: t("Ø¬Ø¯ÙŠØ¯", "New") },
    { id: "preparing",  label: t("Ù‚ÙŠØ¯ Ø§Ù„ØªØ­Ø¶ÙŠØ±", "Preparing") },
    { id: "ready",      label: t("Ø¬Ø§Ù‡Ø² Ù„Ù„ØªØ³Ù„ÙŠÙ…", "Ready") },
    { id: "delivering", label: t("Ù…Ø¹ Ø§Ù„ÙƒØ§Ø¨ØªÙ†", "With Captain") },
    { id: "delivered",  label: t("ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ… ÙˆØ§Ù„ØªØ­ØµÙŠÙ„", "Delivered & Settled") },
    { id: "cancelled",  label: t("Ù…Ù„ØºÙŠ", "Cancelled") },
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

  // Calculate active orders currently with a specific captain
  const getCaptainActiveOrders = useCallback((phone: string) => {
    return orders.filter((o) => o.status === "delivering" && o.captainPhone === phone);
  }, [orders]);

  // Toggle captain on/off duty
  async function handleToggleCaptainActive(cpt: Captain) {
    playSound("click");
    const nextActive = cpt.isActive === false ? true : false;
    try {
      const res = await fetch("/api/captains", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cpt.id, isActive: nextActive }),
      });
      if (res.ok) {
        playSound("success");
        setCaptains((prev) => prev.map((c) => (c.id === cpt.id ? { ...c, isActive: nextActive } : c)));
      }
    } catch {}
  }

  // Quick Add Captain to Fleet
  async function handleAddFleetCaptain(e: React.FormEvent) {
    e.preventDefault();
    if (!fleetCaptainName.trim() || !fleetCaptainPhone.trim()) {
      alert("Ø¨Ø±Ø¬Ø§Ø¡ ÙƒØªØ§Ø¨Ø© Ø§Ø³Ù… ÙˆØ±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„Ø·ÙŠØ§Ø±");
      return;
    }
    setSavingFleetCaptain(true);
    playSound("click");
    try {
      const res = await fetch("/api/captains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fleetCaptainName.trim(),
          phone: fleetCaptainPhone.trim(),
          vehicle: fleetCaptainVehicle,
          isActive: true,
        }),
      });
      if (res.ok) {
        playSound("success");
        setFleetCaptainName("");
        setFleetCaptainPhone("");
        fetchCaptains();
      }
    } finally {
      setSavingFleetCaptain(false);
    }
  }

  // Delete Captain
  async function handleDeleteCaptain(cpt: Captain) {
    if (!confirm(`Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ø­Ø°Ù Ø§Ù„ÙƒØ§Ø¨ØªÙ† ${cpt.name} Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹ Ù…Ù† Ø£Ø³Ø·ÙˆÙ„ Ø´ÙˆÙƒÙˆ Ù‡Ø§ÙˆØ³ØŸ`)) return;
    playSound("alert");
    try {
      const res = await fetch(`/api/captains?id=${cpt.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCaptains();
      }
    } catch {}
  }

  // Smart WhatsApp Dispatch Generator with Google Maps & Full Items Breakdown
  const getCaptainDispatchUrl = (order: Order, captainPhoneOverride?: string, captainNameOverride?: string) => {
    const captPhone = captainPhoneOverride || order.captainPhone || "";
    if (!captPhone) return "#";
    const cleanCaptPhone = captPhone.replace(/[^0-9]/g, "");
    const captIntl = cleanCaptPhone.startsWith("0") ? "2" + cleanCaptPhone : cleanCaptPhone;
    const captName = captainNameOverride || order.captainName || "Ø§Ù„ÙƒØ§Ø¨ØªÙ†";

    const itemsList = parseItems(order.items)
      .map(
        (it) =>
          `â€¢ ${it.qty} Ã— ${lang === "en" ? it.nameEn || it.nameAr : it.nameAr || it.nameEn} ${
            it.extras && it.extras.length ? `(${it.extras.join(" + ")})` : ""
          } [${it.unitPrice * it.qty} Ø¬]`
      )
      .join("\n");

    const addressQuery = encodeURIComponent(
      `${order.address || ""} ${order.zone || "Ø§Ù„Ø³Ø§Ø¯Ø³ Ù…Ù† Ø£ÙƒØªÙˆØ¨Ø±"}`
    );
    const mapsUrl = `https://maps.google.com/?q=${addressQuery}`;

    const msg =
      `ðŸ›µ *Ø¨ÙŠØ§Ù† ØªÙˆØµÙŠÙ„ Ø£ÙˆØ±Ø¯Ø± Ø¬Ø¯ÙŠØ¯ â€” Choco House Desserts ðŸ«ðŸ‘‘*\n\n` +
      `Ø£Ù‡Ù„Ø§Ù‹ ÙƒØ§Ø¨ØªÙ† ${captName}ØŒ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨ Ù„Ù„ØªÙˆØµÙŠÙ„ Ø§Ù„ÙÙˆØ±ÙŠ:\n` +
      `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n` +
      `ðŸ·ï¸ *Ø£ÙˆØ±Ø¯Ø± Ø±Ù‚Ù…:* #${order.orderNumber}\n` +
      `ðŸ‘¤ *Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„:* ${order.customerName}\n` +
      `ðŸ“ž *Ù‡Ø§ØªÙ Ø§Ù„Ø¹Ù…ÙŠÙ„:* ${order.phone}\n` +
      `ðŸ“ *Ø§Ù„Ø¹Ù†ÙˆØ§Ù†:* ${order.address || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"} (${order.zone || "Ø§Ù„Ø­ÙŠ Ø§Ù„Ø«Ø§Ù†ÙŠ"})\n` +
      `ðŸ—ºï¸ *Ù„ÙˆÙƒÙŠØ´Ù† Ø§Ù„Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ù…Ø¨Ø§Ø´Ø±:*\n${mapsUrl}\n\n` +
      `ðŸ« *Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©:*\n${itemsList || "Ø£ØµÙ†Ø§Ù Ù…ØªÙ†ÙˆØ¹Ø©"}\n\n` +
      `ðŸ’° *Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡ ÙƒØ§Ø´:* ${order.total} Ø¬.Ù… ${
        order.paymentMethod === "cash"
          ? "(ðŸ’µ ÙƒØ§Ø´ Ø¹Ù†Ø¯ Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…)"
          : "(ðŸ’³ Ù…Ø¯ÙÙˆØ¹ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ - Ù„Ø§ ØªØ­ØµÙ„ Ù…Ø¨Ø§Ù„Øº)"
      }\n` +
      (order.notes ? `âš ï¸ *Ù…Ù„Ø§Ø­Ø¸Ø§Øª Ø®Ø§ØµØ©:* ${order.notes}\n\n` : `\n`) +
      `Ø¨Ø§Ù„ØªÙˆÙÙŠÙ‚ ÙŠØ§ Ø¨Ø·Ù„! ðŸš€`;

    return `https://wa.me/${captIntl}?text=${encodeURIComponent(msg)}`;
  };

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
          alert("Ø¨Ø±Ø¬Ø§Ø¡ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… ÙˆØ±Ù‚Ù… Ù‡Ø§ØªÙ Ø§Ù„ÙƒØ§Ø¨ØªÙ†");
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
          alert("Ø¨Ø±Ø¬Ø§Ø¡ Ø§Ø®ØªÙŠØ§Ø± ÙƒØ§Ø¨ØªÙ†");
          setSavingCaptain(false);
          return;
        }
      }

      await updateStatus(captainModalOrder.id, "delivering", {
        captainName,
        captainPhone,
      });

      setAssignedDispatch({
        order: captainModalOrder,
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
          senderName: currentUser?.name || "ÙØ±ÙŠÙ‚ Choco House",
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
    const msg = `Ù…Ø±Ø­Ø¨Ø§Ù‹ ${order.customerName} Ù…Ù† Choco House ðŸ«\nØ£ÙˆØ±Ø¯Ø± Ø±Ù‚Ù…: #${order.orderNumber}\nØ§Ù„Ø­Ø§Ù„Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©: ${
      order.status === "delivering" ? `Ù…Ø¹ Ø§Ù„ÙƒØ§Ø¨ØªÙ† ${order.captainName || ""} ðŸ›µ` : "Ù‚ÙŠØ¯ Ø§Ù„ØªØ¬Ù‡ÙŠØ² ðŸ‘¨â€ðŸ³"
    }\nØ§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: ${order.total} Ø¬.Ù…\nÙ„Ø£ÙŠ Ø§Ø³ØªÙØ³Ø§Ø± ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù†Ø§!`;
    return `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Helper WhatsApp link for captain
  const getCaptainWhatsAppUrl = (order: Order) => {
    if (!order.captainPhone) return "#";
    const cleanPhone = order.captainPhone.replace(/[^0-9]/g, "");
    const egyptianPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;
    const msg = `Ø£Ù‡Ù„Ø§Ù‹ ÙƒØ§Ø¨ØªÙ† ${order.captainName} ðŸ›µ\nØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø£ÙˆØ±Ø¯Ø± Ù„Ù„ØªØ³Ù„ÙŠÙ…:\nØ±Ù‚Ù… Ø§Ù„Ø£ÙˆØ±Ø¯Ø±: #${order.orderNumber}\nØ§Ù„Ø¹Ù…ÙŠÙ„: ${order.customerName}\nØ§Ù„Ù‡Ø§ØªÙ: ${order.phone}\nØ§Ù„Ø¹Ù†ÙˆØ§Ù†: ${order.address || "ØºÙŠØ± Ù…Ø­Ø¯Ø¯"} (${order.zone || ""})\nØ§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡: ${order.total} Ø¬.Ù…\nØ·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹: ${order.paymentMethod === "cash" ? "ÙƒØ§Ø´ ðŸ’µ" : "Ù…Ø¯ÙÙˆØ¹ Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ§Ù‹ ðŸ’³"}`;
    return `https://wa.me/${egyptianPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <ErpLayout activeItem="orders">
      <div>
        {/* â”€â”€ Assigned Dispatch Success Notification (1-Click WhatsApp Send) â”€â”€ */}
        {assignedDispatch && (
          <div
            style={{
              background: "rgba(24, 13, 7, 0.95)",
              border: "2px solid #cca043",
              borderRadius: "16px",
              padding: "14px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "14px",
              boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(204, 160, 67, 0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "rgba(204, 160, 67, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }}
              >
                ðŸ›µ
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                  ØªÙ… Ø¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ø£ÙˆØ±Ø¯Ø± #{assignedDispatch.order.orderNumber} Ù„Ù„Ø·ÙŠØ§Ø± ({assignedDispatch.captainName}) Ø¨Ù†Ø¬Ø§Ø­!
                </h4>
                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#a8927e" }}>
                  Ø§Ø¶ØºØ· Ø§Ù„Ø²Ø± Ø§Ù„Ø£Ø®Ø¶Ø± Ù„Ø¥Ø±Ø³Ø§Ù„ Ø¨ÙŠØ§Ù† Ø§Ù„Ø£ÙˆØ±Ø¯Ø± Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ Ù…Ø¹ Ø±Ø§Ø¨Ø· Ù„ÙˆÙƒÙŠØ´Ù† Ø¬ÙˆØ¬Ù„ Ù…Ø§Ø¨Ø³ Ù„Ù„Ø·ÙŠØ§Ø± Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ø¨Ù†Ù‚Ø±Ø© ÙˆØ§Ø­Ø¯Ø©
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <a
                href={getCaptainDispatchUrl(
                  assignedDispatch.order,
                  assignedDispatch.captainPhone,
                  assignedDispatch.captainName
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playSound("click")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#22c55e",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontWeight: 900,
                  fontSize: "13.5px",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
                  transition: "all 0.15s ease",
                }}
              >
                <MessageCircle size={17} />
                <span>ðŸ“² Ø¥Ø±Ø³Ø§Ù„ Ø¨ÙŠØ§Ù† Ø§Ù„Ø£ÙˆØ±Ø¯Ø± ÙˆØ§Ù„Ù„ÙˆÙƒÙŠØ´Ù† Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ ÙÙˆØ±Ø§Ù‹ ðŸš€</span>
              </a>

              <button
                onClick={() => setAssignedDispatch(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "none",
                  color: "#a8927e",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                Ø¥ØºÙ„Ø§Ù‚ âœ•
              </button>
            </div>
          </div>
        )}
        {/* â”€â”€ Persistent Alarm Flashing Banner â”€â”€ */}
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
                    `ðŸš¨ ØªÙ†Ø¨ÙŠÙ‡ ÙÙˆØ±ÙŠ: ÙŠÙˆØ¬Ø¯ ${newOrdersCount} Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ø¨Ø§Ù†ØªØ¸Ø§Ø± Ø§Ø³ØªÙ„Ø§Ù…Ùƒ ÙˆØ§Ù„ØªØ­Ø¶ÙŠØ±!`,
                    `ðŸš¨ Alert: ${newOrdersCount} new order(s) waiting for acceptance & prep!`
                  )}
                </h3>
                <p style={{ margin: "2px 0 0 0", fontSize: "12.5px", opacity: 0.9 }}>
                  {t(
                    "ØµÙˆØª Ø§Ù„Ù…Ù†Ø¨Ù‡ ÙŠØ¹Ù…Ù„ Ø¨Ø§Ø³ØªÙ…Ø±Ø§Ø± Ù„ØªÙ†Ø¨ÙŠÙ‡ Ø§Ù„Ù…Ø·Ø¨Ø® ÙˆØ§Ù„ÙƒØ§Ø´ÙŠØ± Ø­ØªÙ‰ ÙŠØªÙ… Ù‚Ø¨ÙˆÙ„ Ø§Ù„Ø·Ù„Ø¨",
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
                  <span>{t("ØªØ´ØºÙŠÙ„ Ø§Ù„ØµÙˆØª ðŸ””", "Unmute Alarm ðŸ””")}</span>
                </>
              ) : (
                <>
                  <VolumeX size={18} />
                  <span>{t("ÙƒØªÙ… Ø§Ù„ØµÙˆØª Ù…Ø¤Ù‚ØªØ§Ù‹ ðŸ”•", "Mute Alarm ðŸ”•")}</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* â”€â”€ Page Header & Top Quick Actions â”€â”€ */}
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
              {t("Ø´Ø§Ø´Ø© Ø§Ù„Ù…Ø·Ø¨Ø® ÙˆØ§Ù„Ø·Ù„Ø¨Ø§Øª ÙˆÙ„ÙˆØ¬Ø³ØªÙŠØ§Øª Ø§Ù„ØªÙˆØµÙŠÙ„", "Kitchen & Delivery Logistics Board")}
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
                "Ø¥Ø¯Ø§Ø±Ø© Ø¯ÙˆØ±Ø© Ø­ÙŠØ§Ø© Ø§Ù„Ø£ÙˆØ±Ø¯Ø± â€” Ø·Ø¨Ø§Ø¹Ø© Ø±ÙŠØ³ÙŠØª Ø­Ø±Ø§Ø±ÙŠ 80mm â€” ØªØ¹ÙŠÙŠÙ† Ø§Ù„Ø·ÙŠØ§Ø± â€” ØªØ­ØµÙŠÙ„ Ø§Ù„ÙÙ„ÙˆØ³",
                "Full order lifecycle â€” 80mm thermal receipt printing â€” Captain assignment & cash settlement"
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
              <span>{t("Ø´Ø§Øª ÙˆØ§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ ðŸ’¬", "Customer Live Chat ðŸ’¬")}</span>
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

                        {/* Delivery Fleet Operations Center Button */}
            <button
              onClick={() => {
                setFleetModalOpen(true);
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
              <Bike size={16} />
              <span>{t("Ø£Ø³Ø·ÙˆÙ„ Ø§Ù„Ø¯Ù„ÙŠÙØ±ÙŠ ÙˆØ§Ù„Ø·ÙŠØ§Ø±ÙŠÙ† ðŸ›µ", "Delivery Fleet ðŸ›µ")}</span>
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
                {captains.filter((c) => c.isActive !== false).length}
              </span>
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
              <span>{t("ØªØ­Ø¯ÙŠØ« ðŸ”„", "Refresh ðŸ”„")}</span>
            </button>
          </div>
        </div>

        {/* â”€â”€ Horizontal Status Tabs â”€â”€ */}
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

        {/* â”€â”€ Orders Display Container â”€â”€ */}
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
              {t("Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª ÙÙŠ Ù‡Ø°Ø§ Ø§Ù„Ù‚Ø³Ù…", "No orders in this section")}
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
                "Ø£ÙŠ Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯ Ù…Ù† Ø§Ù„Ù…ÙˆÙ‚Ø¹ Ù‡ÙŠØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙÙˆØ±Ø§Ù‹ Ù…Ø¹ ØªÙ†Ø¨ÙŠÙ‡ ØµÙˆØªÙŠ Ù…Ø³ØªÙ…Ø±",
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
                          title={t("Ø·Ø¨Ø§Ø¹Ø© Ø±ÙŠØ³ÙŠØª Ø­Ø±Ø§Ø±ÙŠ ÙÙˆØ±ÙŠ ðŸ–¨ï¸", "Print Thermal Receipt ðŸ–¨ï¸")}
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
                          title={t("ÙƒÙŠÙˆ Ø§Ø± Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø°ÙƒÙŠØ© Ù„Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ ðŸ“±", "Digital QR Receipt ðŸ“±")}
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
                          <span>QR ðŸ“±</span>
                        </button>

                        {/* Edit Order Button */}
                        {order.status !== "delivered" && order.status !== "cancelled" && (
                          <button
                            onClick={() => {
                              setOrderToEdit(order);
                              playSound("click");
                            }}
                            title={t("ØªØ¹Ø¯ÙŠÙ„ Ø£ØµÙ†Ø§Ù ÙˆØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø£ÙˆØ±Ø¯Ø± âœï¸", "Edit Order Items & Details âœï¸")}
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
                            <span>{t("ØªØ¹Ø¯ÙŠÙ„ âœï¸", "Edit âœï¸")}</span>
                          </button>
                        )}

                        <button
                          onClick={() => setPreviewOrder(order)}
                          title={t("Ù…Ø¹Ø§ÙŠÙ†Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©", "Preview Receipt")}
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
                            title={t("ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø£ØµÙ†Ø§Ù Ù‡Ø°Ø§ Ø§Ù„Ø·Ù„Ø¨", "Order has been edited")}
                          >
                            Ù…Ø¹Ø¯Ù‘Ù„ âœï¸
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
                          ? t("Ø¬Ø¯ÙŠØ¯ ðŸ“‹", "New ðŸ“‹")
                          : order.status === "preparing"
                          ? t("Ù‚ÙŠØ¯ Ø§Ù„ØªØ­Ø¶ÙŠØ± ðŸ‘¨â€ðŸ³", "Preparing ðŸ‘¨â€ðŸ³")
                          : order.status === "ready"
                          ? t("Ø¬Ø§Ù‡Ø² Ù„Ù„ØªØ³Ù„ÙŠÙ… ðŸ›µ", "Ready ðŸ›µ")
                          : order.status === "delivering"
                          ? t("Ù…Ø¹ Ø§Ù„ÙƒØ§Ø¨ØªÙ† ðŸš´", "With Captain ðŸš´")
                          : order.status === "delivered"
                          ? t("ØªÙ… Ø§Ù„ØªØ³Ù„ÙŠÙ… ÙˆØ§Ù„ØªØ­ØµÙŠÙ„ ðŸŽ‰", "Delivered ðŸŽ‰")
                          : t("Ù…Ù„ØºÙŠ âŒ", "Cancelled âŒ")}
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
                          title={t("Ù…Ø±Ø§Ø³Ù„Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¬Ø§Ù†Ø§Ù‹", "Message Customer on WhatsApp")}
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
                          <span>ÙˆØ§ØªØ³Ø§Ø¨ ðŸ’¬</span>
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
                            {order.address} ({order.zone || "6 Ø£ÙƒØªÙˆØ¨Ø±"})
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
                          âš ï¸ {order.notes}
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
                              {t("Ø·ÙŠØ§Ø± Ø§Ù„ØªÙˆØµÙŠÙ„ Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„:", "Assigned Captain:")}
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
                            <span>Ø¨ÙŠØ§Ù†Ø§ØªÙ‡ ðŸ“±</span>
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
                              {it.qty} Ã—{" "}
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
                            {it.unitPrice * it.qty} {t("Ø¬", "EGP")}
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
                          {t("Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡", "To Collect")}{" "}
                          {order.paymentMethod === "cash" ? "(ÙƒØ§Ø´ ðŸ’µ)" : "(Ù…Ø¯ÙÙˆØ¹ ðŸ’³)"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#cca043" }}>
                          + ØªÙˆØµÙŠÙ„ {order.deliveryFee} Ø¬
                        </span>
                      </div>
                      <span style={{ fontSize: "20px", color: "#cca043", fontWeight: 900 }}>
                        {order.total} {t("Ø¬", "EGP")}
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
                          <span>{t("Ø¨Ø¯Ø¡ Ø§Ù„ØªØ­Ø¶ÙŠØ± ðŸ‘¨â€ðŸ³", "Start Preparing ðŸ‘¨â€ðŸ³")}</span>
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
                          <span>{t("Ø¬Ø§Ù‡Ø² Ù„Ù„ØªÙˆØµÙŠÙ„ ðŸ›µ", "Ready for Delivery ðŸ›µ")}</span>
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
                          <span>{t("ØªØ³Ù„ÙŠÙ… Ù„Ù„Ø·ÙŠØ§Ø± ðŸ›µ", "Assign to Captain ðŸ›µ")}</span>
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
                          <span>{t("ØªÙ… Ø§Ù„ØªØ­ØµÙŠÙ„ ÙˆØ§Ù„ØªØ³Ù„ÙŠÙ… ðŸŽ‰", "Collect Cash & Deliver ðŸŽ‰")}</span>
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
                          title={t("Ø¥Ù„ØºØ§Ø¡ Ø§Ù„Ø·Ù„Ø¨", "Cancel Order")}
                        >
                          {t("Ø¥Ù„ØºØ§Ø¡ âŒ", "Cancel âŒ")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MODAL 1: ASSIGN CAPTAIN TO ORDER
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
                      {t("Ø±Ø¨Ø· Ø§Ù„Ø·ÙŠØ§Ø± Ø¨Ø§Ù„Ø£ÙˆØ±Ø¯Ø±", "Assign Delivery Captain")}
                    </h3>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#cca043" }}>
                      Ø£ÙˆØ±Ø¯Ø± Ø±Ù‚Ù… {captainModalOrder.orderNumber} â€” Ø§Ù„Ù…Ø·Ù„ÙˆØ¨: {captainModalOrder.total} Ø¬
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
                  {t("Ø§Ø®ØªØ± Ø§Ù„Ø·ÙŠØ§Ø± Ù…Ù† Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³Ø¬Ù„Ø©:", "Select Captain from Registered Staff:")}
                </label>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {captains
                    .map((cpt) => {
                      const activeLoad = getCaptainActiveOrders(cpt.phone);
                      const isOffline = cpt.isActive === false;
                      return { cpt, activeLoad, isOffline };
                    })
                    .sort((a, b) => {
                      if (a.isOffline && !b.isOffline) return 1;
                      if (!a.isOffline && b.isOffline) return -1;
                      return a.activeLoad.length - b.activeLoad.length;
                    })
                    .map(({ cpt, activeLoad, isOffline }) => (
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
                              ? "rgba(204, 160, 67, 0.18)"
                              : isOffline
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(255,255,255,0.04)",
                          border:
                            selectedCaptainPhone === cpt.phone
                              ? "1.5px solid #cca043"
                              : "1px solid rgba(204, 160, 67, 0.18)",
                          cursor: "pointer",
                          opacity: isOffline ? 0.6 : 1,
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
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#ffffff" }}>
                              {cpt.name}
                            </div>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: "100px",
                                background: isOffline
                                  ? "rgba(255,255,255,0.08)"
                                  : activeLoad.length === 0
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : activeLoad.length === 1
                                  ? "rgba(234, 179, 8, 0.2)"
                                  : "rgba(239, 68, 68, 0.2)",
                                color: isOffline
                                  ? "#a8927e"
                                  : activeLoad.length === 0
                                  ? "#4ade80"
                                  : activeLoad.length === 1
                                  ? "#facc15"
                                  : "#f87171",
                              }}
                            >
                              {isOffline
                                ? "âšª ØºÙŠØ± Ù…ØªØ§Ø­ (Ø§Ø³ØªØ±Ø§Ø­Ø©)"
                                : activeLoad.length === 0
                                ? "ðŸŸ¢ Ù…ØªØ§Ø­ ÙˆØ¬Ø§Ù‡Ø² (0 Ø£ÙˆØ±Ø¯Ø±Ø§Øª) â­"
                                : activeLoad.length === 1
                                ? `ðŸŸ¡ ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚ (Ø£ÙˆØ±Ø¯Ø± #${activeLoad[0].orderNumber})`
                                : `ðŸ”´ Ø­Ù…ÙˆÙ„Ø© (${activeLoad.length} Ø£ÙˆØ±Ø¯Ø±Ø§Øª)`}
                            </span>
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#a8927e" }} dir="ltr">
                            {cpt.phone} â€¢ {cpt.vehicle || "Ø³ÙƒÙˆØªØ± Ø¯Ù„ÙŠÙØ±ÙŠ"}
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
                      {t("Ø·ÙŠØ§Ø± Ø¬Ø¯ÙŠØ¯ / Ø®Ø§Ø±Ø¬ÙŠ âž•", "Add New / External Captain âž•")}
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
                      Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ø¨ØªÙ†:
                    </label>
                    <input
                      type="text"
                      placeholder="Ù…Ø«Ø§Ù„: ÙƒØ§Ø¨ØªÙ† Ø®Ø§Ù„Ø¯ Ø§Ù„Ù…ØµØ±ÙŠ"
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
                      Ø±Ù‚Ù… Ù…ÙˆØ¨Ø§ÙŠÙ„ Ø§Ù„ÙƒØ§Ø¨ØªÙ†:
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
                    ? t("Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ¹ÙŠÙŠÙ†...", "Assigning...")
                    : t("ØªØ£ÙƒÙŠØ¯ ÙˆØ¥Ø³Ù†Ø§Ø¯ Ø§Ù„Ø£ÙˆØ±Ø¯Ø± Ù„Ù„Ø·ÙŠØ§Ø± ðŸ›µ", "Confirm & Assign ðŸ›µ")}
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
                  {t("Ø¥Ù„ØºØ§Ø¡", "Cancel")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MODAL 2: CUSTOMER INQUIRIES & LIVE CHAT DRAWER
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
                      <span>{t("Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø§Øª", "Chats")}</span>
                    </button>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <MessageSquare size={18} color="#cca043" />
                    <div>
                      <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                        {chatView === "thread" && selectedChatPhone
                          ? chatCustomers.find((c) => c.id === selectedChatPhone)?.name || "Ù…Ø­Ø§Ø¯Ø«Ø© Ø¹Ù…ÙŠÙ„"
                          : t("Ø´Ø§Øª ÙˆØ§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡", "Customer Inquiries Chat")}
                      </h3>
                      <p style={{ margin: 0, fontSize: "11px", color: "#8a7565" }}>
                        {chatView === "thread" && selectedChatPhone
                          ? (chatCustomers.find((c) => c.id === selectedChatPhone)?.phone || "Ø¹Ù…ÙŠÙ„ Ø¹Ø¨Ø± Ø§Ù„Ù…ØªØ¬Ø±")
                          : `${chatCustomers.length} ${t("Ù…Ø­Ø§Ø¯Ø«Ø© Ù†Ø´Ø·Ø©", "active chats")}`}
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
                      }?text=${encodeURIComponent("Ù…Ø±Ø­Ø¨Ø§Ù‹ Ù…Ù† ÙØ±ÙŠÙ‚ Choco House ðŸ«")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ù…Ø±Ø§Ø³Ù„Ø© Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨ Ù…Ø¨Ø§Ø´Ø±Ø©"
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
                      <span>ÙˆØ§ØªØ³Ø§Ø¨</span>
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
                        ðŸ“¢
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 800, color: "#f5ede4" }}>
                          {t("Ø¨Ø« Ø±Ø³Ø§Ù„Ø© Ø¹Ø§Ù…Ø© Ù„Ù„Ø¬Ù…ÙŠØ¹", "Broadcast Message to All")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#8a7565" }}>
                          Ø¥Ø±Ø³Ø§Ù„ ØªÙ†Ø¨ÙŠÙ‡ Ø£Ùˆ Ø¥Ø´Ø¹Ø§Ø± Ù„Ø¬Ù…ÙŠØ¹ Ø²ÙˆØ§Ø± Ø§Ù„Ù…ØªØ¬Ø±
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", color: "#cca043", fontWeight: 700 }}>
                      {chatMessages.length} Ø±Ø³Ø§Ù„Ø©
                    </span>
                  </div>

                  {chatCustomers.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", color: "#8a7565" }}>
                      <MessageSquare size={36} color="#7a5c3e" style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#f5ede4", marginBottom: "4px" }}>
                        Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø¹Ù…Ù„Ø§Ø¡ Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†
                      </div>
                      <div style={{ fontSize: "12px" }}>
                        Ø£ÙŠ Ø§Ø³ØªÙØ³Ø§Ø± ÙŠÙƒØªØ¨Ù‡ Ø¹Ù…ÙŠÙ„ ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø± Ø³ÙŠØ¸Ù‡Ø± Ù‡Ù†Ø§ ÙÙˆØ±Ø§Ù‹ Ù„Ù„ØªÙˆØ§ØµÙ„ Ù…Ø¹Ù‡
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
                            {cust.name.slice(0, 1) || "Ø¹"}
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
                                {cust.lastMessage || (cust.phone ? `Ù‡Ø§ØªÙ: ${cust.phone}` : "Ù…Ø­Ø§Ø¯Ø«Ø© Ù†Ø´Ø·Ø©")}
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
                        Ù„Ø§ ØªÙˆØ¬Ø¯ Ø±Ø³Ø§Ø¦Ù„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†
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
                        Ø§Ù„Ø±Ø¯ Ù…ÙˆØ¬Ù‡ Ø¥Ù„Ù‰:{" "}
                        <strong>
                          {selectedChatPhone
                            ? chatCustomers.find((c) => c.id === selectedChatPhone)?.name || selectedChatPhone
                            : "Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ (Ø¨Ø« Ø¹Ø§Ù…)"}
                        </strong>
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="text"
                        placeholder="Ø§ÙƒØªØ¨ Ø±Ø¯Ùƒ Ù„Ù„Ø¹Ù…ÙŠÙ„..."
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MODAL 3: THERMAL RECEIPT MODAL PREVIEW
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {previewOrder && (
          <ThermalReceiptModal
            order={previewOrder as any}
            onClose={() => setPreviewOrder(null)}
          />
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MODAL 4: DIGITAL QR RECEIPT MODAL
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
                    Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø°ÙƒÙŠØ© ÙˆØ§Ù„ØªØªØ¨Ø¹ (QR) ðŸ“±
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
                Ø§Ù…Ø³Ø­ Ø§Ù„Ø±Ù…Ø² Ø¨ÙƒØ§Ù…ÙŠØ±Ø§ Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ Ù„ÙØªØ­ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø°ÙƒÙŠØ© ÙˆØ§Ù„ØªØªØ¨Ø¹ Ù„Ù„Ø·ÙŠØ§Ø± Ø£Ùˆ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¨Ø¯ÙˆÙ† Ø·Ø§Ø¨Ø¹Ø©
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
                  Ø§Ù„Ø¹Ù…ÙŠÙ„: {qrModalOrder.customerName} ({qrModalOrder.phone})
                </div>
                <div style={{ color: "#4ade80", fontWeight: 800, marginTop: "2px" }}>
                  Ø§Ù„Ù…Ø·Ù„ÙˆØ¨ ØªØ­ØµÙŠÙ„Ù‡: {qrModalOrder.total} Ø¬.Ù…
                </div>
                {qrModalOrder.captainName && (
                  <div style={{ color: "#c084fc", fontSize: "12px", marginTop: "4px" }}>
                    ðŸ›µ Ø§Ù„ÙƒØ§Ø¨ØªÙ†: {qrModalOrder.captainName}
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
                  <span>{copiedQrLink ? "ØªÙ… Ø§Ù„Ù†Ø³Ø®!" : "Ù†Ø³Ø® Ø§Ù„Ø±Ø§Ø¨Ø· ðŸ“‹"}</span>
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
                  <span>ÙØªØ­ Ø§Ù„ÙØ§ØªÙˆØ±Ø© ðŸ”—</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            MODAL 5: ORDER EDIT MODAL
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
            NEW MODAL: FLEET OPERATIONS COMMAND CENTER (ØºØ±ÙØ© Ø¹Ù…Ù„ÙŠØ§Øª ÙˆØ¥Ø¯Ø§Ø±Ø© Ø£Ø³Ø·ÙˆÙ„ Ø§Ù„Ø·ÙŠØ§Ø±ÙŠÙ† ðŸ›µ)
        â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {fleetModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "740px",
                maxHeight: "92vh",
                background: "#180e06",
                border: "1.5px solid rgba(204, 160, 67, 0.35)",
                borderRadius: "24px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.7), 0 0 20px rgba(204, 160, 67, 0.15)",
                color: "#ffffff",
              }}
            >
              {/* Fleet Modal Header */}
              <div
                style={{
                  padding: "18px 24px",
                  borderBottom: "1px solid rgba(204, 160, 67, 0.2)",
                  background: "#22130a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "rgba(204, 160, 67, 0.15)",
                      border: "1px solid rgba(204, 160, 67, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#cca043",
                    }}
                  >
                    <Bike size={24} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#cca043" }}>
                      {t("ØºØ±ÙØ© Ø¹Ù…Ù„ÙŠØ§Øª ÙˆØ¥Ø¯Ø§Ø±Ø© Ø£Ø³Ø·ÙˆÙ„ Ø§Ù„ØªÙˆØµÙŠÙ„ ÙˆØ§Ù„Ø·ÙŠØ§Ø±ÙŠÙ† ðŸ›µ", "Delivery Fleet Operations Center")}
                    </h2>
                    <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#a8927e" }}>
                      {t(
                        "Ù…ØªØ§Ø¨Ø¹Ø© Ø­ÙŠØ© Ù„Ø­Ù…ÙˆÙ„Ø© ÙƒÙ„ Ø·ÙŠØ§Ø±ØŒ Ø¥Ø±Ø³Ø§Ù„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù„ÙˆÙƒÙŠØ´Ù†ØŒ Ø§Ù„ØªØ¨Ø¯ÙŠÙ„ Ø¨ÙŠÙ† Ù…ØªØ§Ø­ ÙˆØ§Ø³ØªØ±Ø§Ø­Ø©ØŒ ÙˆØ¥Ø¶Ø§ÙØ© Ø·ÙŠØ§Ø±ÙŠÙ†",
                        "Live courier workload tracking, WhatsApp GPS dispatch, active toggles & fleet CRUD"
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setFleetModalOpen(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(204, 160, 67, 0.25)",
                    color: "#a8927e",
                    borderRadius: "10px",
                    padding: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle size={20} />
                </button>
              </div>

              {/* Fleet Modal Body */}
              <div style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
                {/* 4 Fleet Overview Stats */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(36, 22, 12, 0.72)",
                      border: "1px solid rgba(204, 160, 67, 0.25)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#a8927e", fontWeight: 700 }}>
                      Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø£Ø³Ø·ÙˆÙ„
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff", marginTop: "2px" }}>
                      {captains.length} ðŸ›µ
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.12)",
                      border: "1px solid rgba(34, 197, 94, 0.35)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#4ade80", fontWeight: 700 }}>
                      Ù…ØªØ§Ø­ÙˆÙ† Ù„Ù„Ø·Ù„Ø¨ Ø§Ù„Ø¢Ù†
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#4ade80", marginTop: "2px" }}>
                      {captains.filter((c) => c.isActive !== false).length} ðŸŸ¢
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(204, 160, 67, 0.12)",
                      border: "1px solid rgba(204, 160, 67, 0.35)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#cca043", fontWeight: 700 }}>
                      Ø£ÙˆØ±Ø¯Ø±Ø§Øª ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚ Ø­Ø§Ù„ÙŠØ§Ù‹
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#cca043", marginTop: "2px" }}>
                      {orders.filter((o) => o.status === "delivering").length} âš¡
                    </div>
                  </div>

                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.1)",
                      border: "1px solid rgba(34, 197, 94, 0.25)",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#86efac", fontWeight: 700 }}>
                      Ø·Ù„Ø¨Ø§Øª Ø³ÙÙ„Ù…Øª Ø¨Ø§Ù„ÙƒØ§Ù…Ù„
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#86efac", marginTop: "2px" }}>
                      {orders.filter((o) => o.status === "delivered").length} âœ…
                    </div>
                  </div>
                </div>

                {/* Section 1: Quick Add Captain to Fleet */}
                <form
                  onSubmit={handleAddFleetCaptain}
                  style={{
                    background: "rgba(36, 22, 12, 0.72)",
                    border: "1px solid rgba(204, 160, 67, 0.25)",
                    borderRadius: "16px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "13.5px", fontWeight: 900, color: "#ffffff", marginBottom: "10px" }}>
                    {t("Ø¥Ø¶Ø§ÙØ© Ø·ÙŠØ§Ø± Ø¬Ø¯ÙŠØ¯ Ù„Ø£Ø³Ø·ÙˆÙ„ Ø´ÙˆÙƒÙˆ Ù‡Ø§ÙˆØ³ âž•", "Add New Courier to Fleet âž•")}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Ø§Ø³Ù… Ø§Ù„ÙƒØ§Ø¨ØªÙ† (Ù…Ø«Ø§Ù„: ÙƒØ§Ø¨ØªÙ† Ø£Ø­Ù…Ø¯ Ø­Ø³Ù†)"
                        value={fleetCaptainName}
                        onChange={(e) => setFleetCaptainName(e.target.value)}
                        style={{
                          width: "100%",
                          height: "40px",
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          borderRadius: "10px",
                          padding: "0 12px",
                          fontSize: "13px",
                          color: "#ffffff",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <input
                        type="tel"
                        placeholder="Ø±Ù‚Ù… Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ (Ù…Ø«Ø§Ù„: 010XXXXXXXX)"
                        value={fleetCaptainPhone}
                        onChange={(e) => setFleetCaptainPhone(e.target.value)}
                        dir="ltr"
                        style={{
                          width: "100%",
                          height: "40px",
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          borderRadius: "10px",
                          padding: "0 12px",
                          fontSize: "13px",
                          color: "#ffffff",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <select
                        value={fleetCaptainVehicle}
                        onChange={(e) => setFleetCaptainVehicle(e.target.value)}
                        style={{
                          width: "100%",
                          height: "40px",
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          borderRadius: "10px",
                          padding: "0 10px",
                          fontSize: "13px",
                          color: "#ffffff",
                          boxSizing: "border-box",
                          outline: "none",
                        }}
                      >
                        <option value="Ø³ÙƒÙˆØªØ±">ðŸ›µ Ø³ÙƒÙˆØªØ± Ø¯Ù„ÙŠÙØ±ÙŠ</option>
                        <option value="Ù…ÙˆØªÙˆØ³ÙŠÙƒÙ„">ðŸï¸ Ù…ÙˆØªÙˆØ³ÙŠÙƒÙ„</option>
                        <option value="Ø¹Ø¬Ù„Ø©">ðŸš² Ø¯Ø±Ø§Ø¬Ø© / Ø¹Ø¬Ù„Ø©</option>
                        <option value="Ø³ÙŠØ§Ø±Ø©">ðŸš— Ø³ÙŠØ§Ø±Ø© Ø®Ø§ØµØ©</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingFleetCaptain || !fleetCaptainName.trim() || !fleetCaptainPhone.trim()}
                    style={{
                      height: "40px",
                      padding: "0 20px",
                      background: "#cca043",
                      color: "#180e06",
                      borderRadius: "10px",
                      border: "none",
                      fontWeight: 900,
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(204, 160, 67, 0.3)",
                    }}
                  >
                    <Plus size={16} />
                    <span>{savingFleetCaptain ? t("Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸...", "Saving...") : t("Ø­ÙØ¸ ÙˆØ¥Ø¶Ø§ÙØ© Ù„Ù„Ø£Ø³Ø·ÙˆÙ„ ðŸš€", "Save Courier ðŸš€")}</span>
                  </button>
                </form>

                {/* Section 2: Fleet Directory & Live Operations List */}
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 900, color: "#cca043", marginBottom: "12px" }}>
                    {t("Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø·ÙŠØ§Ø±ÙŠÙ† ÙˆØ§Ù„ØªØ´ØºÙŠÙ„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±:", "Active Fleet Couriers & Real-Time Status:")}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {captains.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "30px 20px", color: "#a8927e" }}>
                        Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø·ÙŠØ§Ø±ÙŠÙ† Ù…Ø³Ø¬Ù„ÙŠÙ† Ø¨Ø¹Ø¯. Ø£Ø¶Ù Ø£ÙˆÙ„ Ø·ÙŠØ§Ø± Ù…Ù† Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø£Ø¹Ù„Ø§Ù‡.
                      </div>
                    ) : (
                      captains.map((cpt) => {
                        const activeOrders = getCaptainActiveOrders(cpt.phone);
                        const isOffline = cpt.isActive === false;

                        return (
                          <div
                            key={cpt.id}
                            style={{
                              background: "rgba(36, 22, 12, 0.72)",
                              border: "1px solid rgba(204, 160, 67, 0.2)",
                              borderRadius: "16px",
                              padding: "16px",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: "10px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                <div
                                  style={{
                                    width: "42px",
                                    height: "42px",
                                    borderRadius: "12px",
                                    background: isOffline ? "rgba(255,255,255,0.04)" : "rgba(204, 160, 67, 0.15)",
                                    border: isOffline ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(204, 160, 67, 0.35)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: isOffline ? "#78716c" : "#cca043",
                                    fontSize: "20px",
                                  }}
                                >
                                  {cpt.vehicle?.includes("Ù…ÙˆØªÙˆØ³ÙŠÙƒÙ„")
                                    ? "ðŸï¸"
                                    : cpt.vehicle?.includes("Ø¹Ø¬Ù„Ø©")
                                    ? "ðŸš²"
                                    : cpt.vehicle?.includes("Ø³ÙŠØ§Ø±Ø©")
                                    ? "ðŸš—"
                                    : "ðŸ›µ"}
                                </div>
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                                      {cpt.name}
                                    </h4>
                                    <span
                                      style={{
                                        fontSize: "11px",
                                        fontWeight: 800,
                                        padding: "2px 8px",
                                        borderRadius: "100px",
                                        background: isOffline ? "rgba(255,255,255,0.08)" : "rgba(34, 197, 94, 0.18)",
                                        color: isOffline ? "#a8927e" : "#4ade80",
                                        border: isOffline ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(34, 197, 94, 0.35)",
                                      }}
                                    >
                                      {isOffline ? "âšª Ø®Ø§Ø±Ø¬ Ø§Ù„Ø®Ø¯Ù…Ø© (Ø¥Ø¬Ø§Ø²Ø©)" : "ðŸŸ¢ Ù†Ø´Ø· Ø¨Ø§Ù„Ø®Ø¯Ù…Ø©"}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "12px", color: "#a8927e", marginTop: "2px" }} dir="ltr">
                                    {cpt.phone} â€¢ {cpt.vehicle || "Ø³ÙƒÙˆØªØ± Ø¯Ù„ÙŠÙØ±ÙŠ"}
                                  </div>
                                </div>
                              </div>

                              {/* Controls: Active Toggle, Direct WhatsApp, Direct Call, Delete */}
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleToggleCaptainActive(cpt)}
                                  title={isOffline ? "ØªÙØ¹ÙŠÙ„ Ø§Ù„ÙƒØ§Ø¨ØªÙ† Ù„Ù„Ø®Ø¯Ù…Ø©" : "ØªØ¹Ø·ÙŠÙ„ Ø§Ù„ÙƒØ§Ø¨ØªÙ† Ù…Ø¤Ù‚ØªØ§Ù‹"}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    height: "34px",
                                    padding: "0 10px",
                                    borderRadius: "8px",
                                    background: isOffline ? "rgba(255,255,255,0.06)" : "rgba(34, 197, 94, 0.15)",
                                    border: isOffline ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(34, 197, 94, 0.35)",
                                    color: isOffline ? "#a8927e" : "#4ade80",
                                    fontSize: "11.5px",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                  }}
                                >
                                  <Power size={13} />
                                  <span>{isOffline ? "ØªÙØ¹ÙŠÙ„ ðŸŸ¢" : "Ø§Ø³ØªØ±Ø§Ø­Ø© âšª"}</span>
                                </button>

                                <a
                                  href={`https://wa.me/${
                                    cpt.phone.replace(/[^0-9]/g, "").startsWith("0")
                                      ? "2" + cpt.phone.replace(/[^0-9]/g, "")
                                      : cpt.phone.replace(/[^0-9]/g, "")
                                  }?text=${encodeURIComponent("Ù…Ø±Ø­Ø¨Ø§Ù‹ ÙƒØ§Ø¨ØªÙ† " + cpt.name + " Ù…Ù† Ø¥Ø¯Ø§Ø±Ø© Ø´ÙˆÙƒÙˆ Ù‡Ø§ÙˆØ³ Choco House ðŸ«ðŸ‘‘")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Ù…Ø±Ø§Ø³Ù„Ø© Ø§Ù„ÙƒØ§Ø¨ØªÙ† Ø¹Ø¨Ø± ÙˆØ§ØªØ³Ø§Ø¨"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "8px",
                                    background: "rgba(34, 197, 94, 0.15)",
                                    border: "1px solid rgba(34, 197, 94, 0.35)",
                                    color: "#4ade80",
                                    textDecoration: "none",
                                  }}
                                >
                                  <MessageCircle size={15} />
                                </a>

                                <a
                                  href={`tel:${cpt.phone}`}
                                  title="Ø§ØªØµØ§Ù„ Ù‡Ø§ØªÙÙŠ Ø¨Ø§Ù„ÙƒØ§Ø¨ØªÙ†"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "8px",
                                    background: "rgba(255, 255, 255, 0.06)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    color: "#ffffff",
                                    textDecoration: "none",
                                  }}
                                >
                                  <Phone size={14} />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCaptain(cpt)}
                                  title="Ø­Ø°Ù Ø§Ù„ÙƒØ§Ø¨ØªÙ† Ù…Ù† Ø§Ù„Ø£Ø³Ø·ÙˆÙ„"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "8px",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.3)",
                                    color: "#f87171",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Active Orders List with this Captain */}
                            {activeOrders.length > 0 ? (
                              <div
                                style={{
                                  marginTop: "12px",
                                  paddingTop: "12px",
                                  borderTop: "1px dashed rgba(204, 160, 67, 0.2)",
                                }}
                              >
                                <div style={{ fontSize: "11.5px", fontWeight: 800, color: "#cca043", marginBottom: "6px" }}>
                                  âš¡ Ø£ÙˆØ±Ø¯Ø±Ø§Øª ÙÙŠ Ø§Ù„Ø·Ø±ÙŠÙ‚ Ø­Ø§Ù„ÙŠØ§Ù‹ Ù…Ø¹ Ù‡Ø°Ø§ Ø§Ù„ÙƒØ§Ø¨ØªÙ† ({activeOrders.length}):
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                  {activeOrders.map((o) => (
                                    <div
                                      key={o.id}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        background: "rgba(0, 0, 0, 0.3)",
                                        border: "1px solid rgba(204, 160, 67, 0.25)",
                                        fontSize: "11.5px",
                                      }}
                                    >
                                      <span style={{ fontWeight: 800, color: "#ffffff" }}>
                                        #{o.orderNumber}
                                      </span>
                                      <span style={{ color: "#a8927e" }}>({o.customerName})</span>
                                      <span style={{ color: "#cca043", fontWeight: 800 }}>
                                        {o.total} Ø¬
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginTop: "8px", fontSize: "11.5px", color: isOffline ? "#78716c" : "#4ade80" }}>
                                {isOffline ? "âšª Ø§Ù„Ø·ÙŠØ§Ø± ÙÙŠ Ø§Ø³ØªØ±Ø§Ø­Ø© Ø­Ø§Ù„ÙŠØ§Ù‹" : "ðŸŸ¢ Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£ÙˆØ±Ø¯Ø±Ø§Øª Ø¬Ø§Ø±ÙŠØ© (Ù…ØªØ§Ø­ ÙÙˆØ±Ø§Ù‹ Ù„Ø£ÙŠ Ø£ÙˆØ±Ø¯Ø± Ø¬Ø¯ÙŠØ¯)"}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Fleet Modal Footer */}
              <div
                style={{
                  padding: "14px 24px",
                  borderTop: "1px solid rgba(204, 160, 67, 0.2)",
                  background: "#22130a",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setFleetModalOpen(false)}
                  style={{
                    height: "36px",
                    padding: "0 18px",
                    background: "rgba(204, 160, 67, 0.15)",
                    border: "1px solid rgba(204, 160, 67, 0.35)",
                    color: "#cca043",
                    fontWeight: 800,
                    fontSize: "13px",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  {t("Ø¥ØºÙ„Ø§Ù‚", "Close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErpLayout>
  );
}
