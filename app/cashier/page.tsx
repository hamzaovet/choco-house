"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import { Plus, RefreshCw, Search, Loader2, CheckCircle2, X, Clock, ShoppingBag, Truck, Phone } from "lucide-react";
import Link from "next/link";

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  address: string;
  zone: string;
  status: string;
  items: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  basePrice: number;
  image?: string | null;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  new:       { color: "text-blue-300",    bg: "bg-blue-500/20 border-blue-500/40" },
  preparing: { color: "text-orange-300",  bg: "bg-orange-500/20 border-orange-500/40" },
  ready:     { color: "text-emerald-300", bg: "bg-emerald-500/20 border-emerald-500/40" },
  delivered: { color: "text-green-300",   bg: "bg-green-500/20 border-green-500/40" },
  cancelled: { color: "text-red-300",     bg: "bg-red-500/20 border-red-500/40" },
};

const ZONES = ["الحي الثاني", "الحي الأول", "الحي الثالث", "الحي السادس", "الحي السابع", "المحور المركزي"];
const ZONE_FEES: Record<string, number> = {
  "الحي الثاني": 10,
  "الحي الأول": 10,
  "الحي الثالث": 12,
  "الحي السادس": 12,
  "الحي السابع": 15,
  "المحور المركزي": 15,
};

export default function CashierPage() {
  const router = useRouter();
  const { isAuthenticated, permissions, loading: authLoading, currentUser } = useStaff();
  const { lang, toggleLang, dir, t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const prevCount = React.useRef(0);

  function getStatusLabel(status: string) {
    switch (status) {
      case "new": return t("جديد", "New");
      case "preparing": return t("يُحضَّر", "Preparing");
      case "ready": return t("جاهز 🛵", "Ready 🛵");
      case "delivered": return t("سُلِّم", "Delivered");
      case "cancelled": return t("ملغي", "Cancelled");
      default: return status;
    }
  }

  function getPaymentLabel(method: string) {
    switch (method) {
      case "cash": return t("كاش 💵", "Cash 💵");
      case "instapay": return t("إنستاباي ⚡", "InstaPay ⚡");
      case "wallet": return t("محفظة 📱", "Wallet 📱");
      case "card": return t("كارت 💳", "Card 💳");
      default: return method;
    }
  }

  // New order form
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    zone: ZONES[0],
    paymentMethod: "cash",
    notes: "",
    items: [] as { product: Product; qty: number }[],
  });

  const fetchData = useCallback(async () => {
    try {
      const [ordRes, prodRes] = await Promise.all([fetch("/api/orders"), fetch("/api/products")]);
      const [ord, prod] = await Promise.all([ordRes.json(), prodRes.json()]);
      const ordList = Array.isArray(ord) ? ord : [];

      // Alert on new orders
      const newCount = ordList.filter((o: Order) => o.status === "new").length;
      if (newCount > prevCount.current) playSound("order");
      prevCount.current = newCount;

      setOrders(ordList);
      setProducts(Array.isArray(prod) ? prod : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !permissions.canViewOrders) {
        router.push("/login");
        return;
      }
      fetchData();
      const t = setInterval(fetchData, 20000);
      return () => clearInterval(t);
    }
  }, [authLoading, isAuthenticated, permissions, router, fetchData]);

  async function changeStatus(order: Order, status: string) {
    setUpdating(order.id);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, _updatedBy: currentUser?.name || "cashier" }),
      });
      playSound(status === "delivered" ? "success" : "click");
      await fetchData();
      if (selectedOrder?.id === order.id) setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
    } finally {
      setUpdating(null);
    }
  }

  async function placeNewOrder() {
    if (!form.customerName || !form.phone || form.items.length === 0) return;
    const items = form.items.map((i) => ({
      productId: i.product.id,
      nameAr: i.product.nameAr,
      nameEn: i.product.nameEn,
      qty: i.qty,
      unitPrice: i.product.basePrice,
      extras: [],
    }));
    const subtotal = form.items.reduce((s, i) => s + i.product.basePrice * i.qty, 0);
    const deliveryFee = ZONE_FEES[form.zone] || 10;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, items, subtotal, deliveryFee }),
    });
    playSound("order");
    setNewOrderOpen(false);
    setForm({ customerName: "", phone: "", address: "", zone: ZONES[0], paymentMethod: "cash", notes: "", items: [] });
    await fetchData();
  }

  const displayOrders = orders
    .filter((o) => {
      if (filterStatus === "active") return ["new", "preparing", "ready"].includes(o.status);
      if (filterStatus !== "all") return o.status === filterStatus;
      return true;
    })
    .filter((o) => !search || o.orderNumber.includes(search) || o.customerName.includes(search) || o.phone.includes(search))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const stats = {
    new: orders.filter((o) => o.status === "new").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    total: orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0),
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#0d0805] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#c8860a]" size={40} />
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-[#0d0805] p-4 sm:p-6" style={{ fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-black text-white">{t("نقطة البيع والكاشير (POS)", "Cashier Point of Sale (POS)")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { playSound("click"); toggleLang(); }}
            className="px-3.5 py-1.5 rounded-xl bg-[#1a0f07] border border-[#3d1f0a] text-[#cca043] font-bold text-xs hover:border-[#cca043] transition-colors"
          >
            {lang === "ar" ? "EN 🌐" : "ع 🌐"}
          </button>
          <Link href="/dashboard" className="px-3 py-1.5 rounded-xl bg-[#1a0f07] border border-[#3d1f0a] text-[#b0957e] hover:text-white text-xs font-bold transition-colors">
            {t("الداشبورد", "Dashboard")}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: t("جديد", "New"), val: stats.new, color: "text-blue-300", bg: "bg-blue-500/10 border-blue-500/30" },
          { label: t("يُحضَّر", "Preparing"), val: stats.preparing, color: "text-orange-300", bg: "bg-orange-500/10 border-orange-500/30" },
          { label: t("جاهز", "Ready"), val: stats.ready, color: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" },
          { label: t("اليوم (ج)", "Today (EGP)"), val: stats.total.toLocaleString(lang === "ar" ? "ar-EG" : "en-US"), color: "text-[#c8860a]", bg: "bg-[#c8860a]/10 border-[#c8860a]/30" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.bg}`}>
            <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
            <div className="text-xs text-[#9c7a5e] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} style={{ [dir === "rtl" ? "right" : "left"]: "12px" }} className="absolute top-1/2 -translate-y-1/2 text-[#9c7a5e]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("ابحث بالاسم أو الرقم...", "Search by name or number...")}
            style={{ [dir === "rtl" ? "paddingRight" : "paddingLeft"]: "36px", [dir === "rtl" ? "paddingLeft" : "paddingRight"]: "16px" }}
            className="w-full h-10 rounded-xl bg-[#1a0f07] border border-[#3d1f0a] focus:border-[#c8860a] text-white text-sm outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-[#1a0f07] border border-[#3d1f0a] rounded-xl p-1">
          {[
            { id: "active", label: t("نشط", "Active") },
            { id: "delivered", label: t("مسلَّم", "Delivered") },
            { id: "cancelled", label: t("ملغي", "Cancelled") },
            { id: "all", label: t("الكل", "All") },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s.id ? "bg-[#c8860a] text-[#0d0805]" : "text-[#9c7a5e] hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl bg-[#1a0f07] border border-[#3d1f0a] text-[#c8860a] hover:border-[#c8860a] transition-colors" title={t("تحديث", "Refresh")}>
          <RefreshCw size={16} />
        </button>
        {permissions.canCreateOrder && (
          <button
            onClick={() => { setNewOrderOpen(true); playSound("click"); }}
            className="btn-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-1.5"
          >
            <Plus size={16} /> {t("طلب جديد", "New Order")}
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-[#1a0f07] border border-[#3d1f0a] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#3d1f0a] text-[#9c7a5e] text-xs">
                <th className={`p-3 text-${dir === "rtl" ? "right" : "left"}`}>{t("رقم الطلب", "Order #")}</th>
                <th className={`p-3 text-${dir === "rtl" ? "right" : "left"}`}>{t("العميل", "Customer")}</th>
                <th className={`p-3 text-${dir === "rtl" ? "right" : "left"} hidden sm:table-cell`}>{t("المنطقة", "Zone")}</th>
                <th className={`p-3 text-${dir === "rtl" ? "right" : "left"}`}>{t("الحالة", "Status")}</th>
                <th className={`p-3 text-${dir === "rtl" ? "left" : "right"}`}>{t("الإجمالي", "Total")}</th>
                <th className={`p-3 text-${dir === "rtl" ? "right" : "left"} hidden md:table-cell`}>{t("الوقت", "Time")}</th>
                <th className="p-3 text-center">{t("إجراءات", "Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {displayOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#9c7a5e]">
                    {t("لا توجد طلبات", "No orders found")}
                  </td>
                </tr>
              ) : (
                displayOrders.map((order) => {
                  const colorCfg = STATUS_COLORS[order.status] || STATUS_COLORS.new;
                  const elapsed = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="border-b border-[#3d1f0a]/50 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <td className="p-3 font-mono text-xs text-[#c8860a] font-bold">{order.orderNumber}</td>
                      <td className="p-3">
                        <p className="font-bold text-white">{order.customerName}</p>
                        <p className="text-xs text-[#9c7a5e]">{order.phone}</p>
                      </td>
                      <td className="p-3 text-[#9c7a5e] hidden sm:table-cell">{order.zone}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${colorCfg.bg} ${colorCfg.color}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className={`p-3 text-${dir === "rtl" ? "left" : "right"} font-black text-[#c8860a]`}>
                        {order.total} {t("ج", "EGP")}
                      </td>
                      <td className="p-3 hidden md:table-cell text-xs text-[#9c7a5e]">
                        {elapsed} {t("د", "m")}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {order.status === "new" && permissions.canUpdateOrderStatus && (
                            <button
                              onClick={(e) => { e.stopPropagation(); changeStatus(order, "preparing"); }}
                              disabled={updating === order.id}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors font-bold"
                            >
                              {updating === order.id ? "..." : t("حضّر", "Prep")}
                            </button>
                          )}
                          {order.status === "preparing" && permissions.canUpdateOrderStatus && (
                            <button
                              onClick={(e) => { e.stopPropagation(); changeStatus(order, "ready"); }}
                              disabled={updating === order.id}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-bold"
                            >
                              {updating === order.id ? "..." : t("جاهز", "Ready")}
                            </button>
                          )}
                          {order.status === "ready" && permissions.canUpdateOrderStatus && (
                            <button
                              onClick={(e) => { e.stopPropagation(); changeStatus(order, "delivered"); }}
                              disabled={updating === order.id}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 hover:bg-green-500/30 transition-colors font-bold"
                            >
                              {updating === order.id ? "..." : t("سُلِّم ✓", "Delivered ✓")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-[#1a0f07] border border-[#3d1f0a] rounded-3xl p-6 mx-4 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <button onClick={() => setSelectedOrder(null)} style={{ [dir === "rtl" ? "left" : "right"]: "16px" }} className="absolute top-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400">
              <X size={18} />
            </button>
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[#c8860a] font-black">{selectedOrder.orderNumber}</span>
              <span className={`text-xs px-2 py-1 rounded-lg border font-bold ${STATUS_COLORS[selectedOrder.status]?.bg} ${STATUS_COLORS[selectedOrder.status]?.color}`}>
                {getStatusLabel(selectedOrder.status)}
              </span>
            </div>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-[#9c7a5e]"><Phone size={14} /> {selectedOrder.customerName} — {selectedOrder.phone}</div>
              <div className="flex items-center gap-2 text-[#9c7a5e]"><Truck size={14} /> {selectedOrder.zone} — {selectedOrder.address}</div>
              <div className="flex items-center gap-2 text-[#9c7a5e]"><Clock size={14} /> {new Date(selectedOrder.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</div>
            </div>

            <div className="bg-[#0d0805] rounded-xl p-3 space-y-2 mb-4">
              {(() => { try { return JSON.parse(selectedOrder.items); } catch { return []; } })()
                .map((item: { nameAr?: string; nameEn?: string; qty: number; unitPrice: number; extras: string[] }, i: number) => {
                  const itemName = (lang === "en" && item.nameEn) ? item.nameEn : (item.nameAr || item.nameEn || "");
                  return (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-white">× {item.qty} {itemName}</span>
                      <span className="text-[#c8860a] font-bold">{item.unitPrice * item.qty} {t("ج", "EGP")}</span>
                    </div>
                  );
                })}
              <div className="border-t border-[#3d1f0a] pt-2 space-y-1">
                <div className="flex justify-between text-[#9c7a5e] text-xs">
                  <span>{t("توصيل", "Delivery")} {selectedOrder.zone}</span>
                  <span>{selectedOrder.deliveryFee} {t("ج", "EGP")}</span>
                </div>
                <div className="flex justify-between font-black text-white">
                  <span>{t("الإجمالي", "Total")}</span>
                  <span className="text-[#c8860a]">{selectedOrder.total} {t("ج", "EGP")}</span>
                </div>
                <div className="text-xs text-[#9c7a5e]">{getPaymentLabel(selectedOrder.paymentMethod)}</div>
              </div>
            </div>

            {selectedOrder.notes && (
              <p className="text-xs text-amber-300 bg-amber-500/10 rounded-xl p-2 border border-amber-500/20 mb-4">
                📝 {selectedOrder.notes}
              </p>
            )}

            <div className="flex gap-2">
              {selectedOrder.status !== "delivered" && selectedOrder.status !== "cancelled" && permissions.canUpdateOrderStatus && (
                <>
                  {selectedOrder.status === "new" && (
                    <button onClick={() => { changeStatus(selectedOrder, "preparing"); setSelectedOrder(null); }} className="flex-1 btn-gold py-2.5 rounded-xl text-sm font-black">
                      {t("بدأ التحضير", "Start Prep")}
                    </button>
                  )}
                  {selectedOrder.status === "preparing" && (
                    <button onClick={() => { changeStatus(selectedOrder, "ready"); setSelectedOrder(null); }} className="flex-1 btn-gold py-2.5 rounded-xl text-sm font-black">
                      {t("جاهز للتوصيل", "Ready for Delivery")}
                    </button>
                  )}
                  {selectedOrder.status === "ready" && (
                    <button onClick={() => { changeStatus(selectedOrder, "delivered"); setSelectedOrder(null); }} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-black transition-colors">
                      {t("تم التسليم ✓", "Delivered ✓")}
                    </button>
                  )}
                  <button onClick={() => { changeStatus(selectedOrder, "cancelled"); setSelectedOrder(null); }} className="px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/30 transition-colors">
                    {t("إلغاء", "Cancel")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {newOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setNewOrderOpen(false)} />
          <div className="relative bg-[#1a0f07] border border-[#3d1f0a] rounded-3xl p-6 mx-4 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <button onClick={() => setNewOrderOpen(false)} style={{ [dir === "rtl" ? "left" : "right"]: "16px" }} className="absolute top-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400">
              <X size={18} />
            </button>
            <h3 className="font-black text-white text-lg mb-5">{t("طلب جديد ➕", "New Order ➕")}</h3>
            <div className="space-y-3">
              <input
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder={t("اسم العميل *", "Customer Name *")}
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t("رقم الموبايل *", "Phone Number *")}
                dir="ltr"
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm font-mono outline-none"
              />
              <select
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none"
              >
                {ZONES.map((z) => <option key={z}>{z}</option>)}
              </select>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t("العنوان بالتفصيل", "Detailed Address")}
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none"
              />
              <div>
                <p className="text-xs text-[#9c7a5e] mb-2 font-bold">{t("المنتجات:", "Items:")}</p>
                <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                  {products.map((p) => {
                    const inCart = form.items.find((i) => i.product.id === p.id);
                    const pName = (lang === "en" && p.nameEn) ? p.nameEn : p.nameAr;
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-[#0d0805] border border-[#3d1f0a]">
                        <span className="text-xs text-white">{pName} <span className="text-[#c8860a]">{p.basePrice} {t("ج", "EGP")}</span></span>
                        <div className="flex items-center gap-2">
                          {inCart ? (
                            <>
                              <button
                                onClick={() => setForm((f) => ({ ...f, items: f.items.map((i) => i.product.id === p.id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter((i) => i.qty > 0) }))}
                                className="w-6 h-6 rounded-lg bg-[#3d1f0a] text-white flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <span className="text-white font-bold text-xs w-4 text-center">{inCart.qty}</span>
                              <button
                                onClick={() => setForm((f) => ({ ...f, items: f.items.map((i) => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i) }))}
                                className="w-6 h-6 rounded-lg bg-[#c8860a] text-[#0d0805] flex items-center justify-center text-xs font-bold"
                              >
                                +
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setForm((f) => ({ ...f, items: [...f.items, { product: p, qty: 1 }] }))}
                              className="text-xs px-2 py-1 rounded-lg bg-[#c8860a]/20 text-[#c8860a] border border-[#c8860a]/30 font-bold"
                            >
                              {t("+ أضف", "+ Add")}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm font-bold text-[#c8860a]">
              {t("الإجمالي", "Total")}: {form.items.reduce((s, i) => s + i.product.basePrice * i.qty, 0) + (ZONE_FEES[form.zone] || 10)} {t("ج", "EGP")}
            </div>
            <button
              onClick={placeNewOrder}
              disabled={!form.customerName || !form.phone || form.items.length === 0}
              className="w-full btn-gold py-3 rounded-xl font-black mt-4 disabled:opacity-50"
            >
              {t("أضف الطلب 🛵", "Place Order 🛵")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
