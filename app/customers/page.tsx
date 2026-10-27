"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import {
  Users, UserCheck, Phone, Mail, MapPin, Search,
  Plus, MessageCircle, ExternalLink, Package, CheckCircle2,
  Calendar, RefreshCw, X, AlertCircle, Edit, Trash2, ArrowUpRight
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  zone?: string | null;
  isVerified: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string | null;
  createdAt: string;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: string;
  captainName?: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useStaff();
  const { lang, t } = useLanguage();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "verified" | "repeat">("all");

  // Orders History Modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Add / Edit Customer Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    zone: "الحي الثاني",
    isVerified: true,
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const q = searchQuery.trim();
      const res = await fetch(`/api/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      fetchCustomers();
    }
  }, [authLoading, currentUser, router, fetchCustomers]);

  // Load orders for a specific customer
  async function openCustomerOrders(cust: Customer) {
    setSelectedCustomer(cust);
    setLoadingOrders(true);
    playSound("click");
    try {
      const res = await fetch(`/api/customer/orders?phone=${encodeURIComponent(cust.phone)}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerOrders(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingOrders(false);
    }
  }

  // Save new or edited customer
  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!customerForm.name || !customerForm.phone) return;
    setSavingCustomer(true);
    playSound("click");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerForm),
      });
      if (res.ok) {
        playSound("success");
        setEditModalOpen(false);
        setCustomerForm({ name: "", phone: "", email: "", address: "", zone: "الحي الثاني", isVerified: true });
        fetchCustomers();
      }
    } finally {
      setSavingCustomer(false);
    }
  }

  // Filter customers
  const filteredCustomers = customers.filter((c) => {
    if (filterType === "verified") return c.isVerified;
    if (filterType === "repeat") return (c.totalOrders || 0) > 1;
    return true;
  });

  // Calculate Aggregates
  const totalCount = customers.length;
  const verifiedCount = customers.filter((c) => c.isVerified).length;
  const totalOrdersCount = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);

  return (
    <ErpLayout activeItem="customers">
      <div>
        {/* ── Page Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 900,
                color: "#ffffff",
                margin: "0 0 6px 0",
              }}
            >
              {t("قاعدة بيانات العملاء (CRM)", "Customer Relationship Database")}
            </h1>
            <p style={{ fontSize: "13.5px", color: "#8a7565", margin: 0, fontWeight: 600 }}>
              {t(
                "سجل العملاء الكامل — التوثيق بالجيميل — تكرار الطلبات وإجمالي المبيعات — التواصل المباشر",
                "Full customer profiles — Gmail OTP verification — Orders frequency & direct WhatsApp contact"
              )}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => {
                setCustomerForm({ name: "", phone: "", email: "", address: "", zone: "الحي الثاني", isVerified: true });
                setEditModalOpen(true);
                playSound("click");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                background: "linear-gradient(135deg, #cca043, #e8a020)",
                color: "#180e06",
                border: "none",
                padding: "10px 18px",
                borderRadius: "12px",
                fontWeight: 900,
                fontSize: "13.5px",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(204, 160, 67, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>{t("إضافة عميل جديد ➕", "Add New Customer ➕")}</span>
            </button>

            <button
              onClick={() => {
                fetchCustomers();
                playSound("click");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#cca043",
                padding: "10px 14px",
                borderRadius: "12px",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* ── KPI Metric Cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          {/* Card 1 */}
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>
                {t("إجمالي العملاء", "Total Customers")}
              </span>
              <Users size={18} color="#cca043" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#ffffff" }}>{totalCount}</div>
            <div style={{ fontSize: "11.5px", color: "#cca043", marginTop: "4px" }}>عميل مسجل في قاعدة البيانات</div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>
                {t("موثقين بالجيميل", "Verified via Gmail")}
              </span>
              <CheckCircle2 size={18} color="#22c55e" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#22c55e" }}>{verifiedCount}</div>
            <div style={{ fontSize: "11.5px", color: "#8a7565", marginTop: "4px" }}>
              {totalCount > 0 ? `${Math.round((verifiedCount / totalCount) * 100)}% من إجمالي العملاء` : "0%"}
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>
                {t("إجمالي الطلبات", "Total Customer Orders")}
              </span>
              <Package size={18} color="#60a5fa" />
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#60a5fa" }}>{totalOrdersCount}</div>
            <div style={{ fontSize: "11.5px", color: "#8a7565", marginTop: "4px" }}>طلب تم تنفيذه عبر الموقع</div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#8a7565", fontWeight: 700 }}>
                {t("إجمالي مشتريات العملاء", "Total Customer Revenue")}
              </span>
              <span style={{ fontSize: "16px", color: "#cca043", fontWeight: 900 }}>EGP</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#cca043" }}>{totalRevenue.toLocaleString()} ج</div>
            <div style={{ fontSize: "11.5px", color: "#8a7565", marginTop: "4px" }}>قيمة المبيعات المحققة</div>
          </div>
        </div>

        {/* ── Search & Filter Controls ── */}
        <div
          style={{
            background: "#160d05",
            border: "1px solid rgba(204, 160, 67, 0.2)",
            borderRadius: "16px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
            <Search
              size={16}
              color="#8a7565"
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder={t("ابحث بالاسم، الموبايل، البريد، أو المنطقة...", "Search by name, phone, email, or zone...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                background: "#0d0805",
                border: "1px solid rgba(204, 160, 67, 0.25)",
                borderRadius: "10px",
                padding: "0 38px 0 14px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { id: "all", label: "جميع العملاء" },
              { id: "verified", label: "موثقين بالجيميل ✅" },
              { id: "repeat", label: "أكثر من طلب ⭐" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "100px",
                  border: filterType === f.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                  background: filterType === f.id ? "#cca043" : "rgba(255,255,255,0.03)",
                  color: filterType === f.id ? "#180e06" : "#b0957e",
                  fontSize: "12.5px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Customers Table / List ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#cca043" }}>
            جاري تحميل قاعدة بيانات العملاء... 🍫
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.15)",
              borderRadius: "20px",
              padding: "50px 20px",
              textAlign: "center",
            }}
          >
            <Users size={44} color="#cca043" style={{ margin: "0 auto 12px" }} />
            <h3 style={{ margin: 0, fontSize: "17px", color: "#ffffff", fontWeight: 800 }}>لا يوجد عملاء يطابقون البحث</h3>
            <p style={{ margin: "6px 0 0 0", color: "#8a7565", fontSize: "13px" }}>
              يمكنك إضافة عميل جديد يدوي أو انتظار طلبات العملاء عبر الموقع
            </p>
          </div>
        ) : (
          <div
            style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "20px",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "#1a0f07" }}>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800 }}>العميل</th>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800 }}>الموبايل والتواصل</th>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800 }}>العنوان والمنطقة</th>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800 }}>الطلبات والمشتريات</th>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800 }}>تاريخ التسجيل</th>
                  <th style={{ padding: "14px 18px", color: "#8a7565", fontWeight: 800, textAlign: "center" }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((cust) => {
                  const cleanPhone = cust.phone.replace(/[^0-9]/g, "");
                  const waPhone = cleanPhone.startsWith("0") ? "2" + cleanPhone : cleanPhone;

                  return (
                    <tr
                      key={cust.id}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.15s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {/* Name & Verification */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "34px",
                              height: "34px",
                              borderRadius: "10px",
                              background: "rgba(204, 160, 67, 0.15)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#cca043",
                              fontWeight: 900,
                              fontSize: "13px",
                            }}
                          >
                            {cust.name.slice(0, 1)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#ffffff", fontSize: "14px" }}>
                              {cust.name}
                            </div>
                            <div style={{ fontSize: "11px", color: cust.email ? "#cca043" : "#8a7565" }}>
                              {cust.email || "بدون إيميل"}
                            </div>
                          </div>
                          {cust.isVerified && (
                            <span
                              title="تم التحقق من البريد عبر كود Gmail"
                              style={{
                                background: "rgba(34, 197, 94, 0.2)",
                                color: "#4ade80",
                                fontSize: "10.5px",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: "6px",
                              }}
                            >
                              موثّق ✅
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone & Instant Contact */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#f5ede4" }} dir="ltr">
                            {cust.phone}
                          </span>
                          <a
                            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`أهلاً بك يا ${cust.name} من بيت الشوكولاتة Choco House 🍫`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="مراسلة واتساب فورية"
                            style={{
                              background: "rgba(34, 197, 94, 0.15)",
                              color: "#4ade80",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontSize: "11px",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                            }}
                          >
                            <MessageCircle size={12} />
                            <span>واتساب</span>
                          </a>
                          <a
                            href={`tel:${cust.phone}`}
                            title="اتصال هاتفي"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "#b0957e",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              textDecoration: "none",
                              fontSize: "11px",
                              fontWeight: 800,
                            }}
                          >
                            اتصال
                          </a>
                        </div>
                      </td>

                      {/* Address & Zone */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ color: "#ffffff", fontWeight: 700 }}>
                          {cust.zone || "الحي الثاني"}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#8a7565", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {cust.address || "مدينة 6 أكتوبر"}
                        </div>
                      </td>

                      {/* Orders & Spending */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 800, color: "#cca043" }}>
                          {cust.totalOrders || 0} طلبات
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#8a7565" }}>
                          إجمالي: {cust.totalSpent || 0} ج.م
                        </div>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: "14px 18px", color: "#8a7565", fontSize: "12px" }}>
                        {new Date(cust.createdAt).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            onClick={() => openCustomerOrders(cust)}
                            title="عرض سجل طلبات العميل"
                            style={{
                              background: "rgba(204, 160, 67, 0.15)",
                              border: "1px solid rgba(204, 160, 67, 0.3)",
                              color: "#cca043",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              fontSize: "11.5px",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Package size={13} />
                            <span>الطلبات</span>
                          </button>

                          <button
                            onClick={() => {
                              setCustomerForm({
                                name: cust.name,
                                phone: cust.phone,
                                email: cust.email || "",
                                address: cust.address || "",
                                zone: cust.zone || "الحي الثاني",
                                isVerified: cust.isVerified,
                              });
                              setEditModalOpen(true);
                            }}
                            title="تعديل بيانات العميل"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "none",
                              color: "#b0957e",
                              padding: "6px 8px",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <Edit size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 1: CUSTOMER ORDERS HISTORY
        ══════════════════════════════════════════════════════════ */}
        {selectedCustomer && (
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
                padding: "24px",
                maxWidth: "540px",
                width: "100%",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: "#ffffff" }}>
                    سجل طلبات العميل: {selectedCustomer.name}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#cca043" }}>
                    موبايل: {selectedCustomer.phone} • {selectedCustomer.zone || "6 أكتوبر"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{ background: "transparent", border: "none", color: "#8a7565", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
                {loadingOrders ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#cca043" }}>جاري تحميل الطلبات...</div>
                ) : customerOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px", color: "#8a7565" }}>لم يتم العثور على طلبات لهذا العميل</div>
                ) : (
                  customerOrders.map((ord) => (
                    <div
                      key={ord.id}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(204, 160, 67, 0.2)",
                        borderRadius: "14px",
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "monospace", fontWeight: 900, color: "#cca043", fontSize: "14px" }}>
                          {ord.orderNumber}
                        </div>
                        <div style={{ fontSize: "11px", color: "#8a7565" }}>
                          {new Date(ord.createdAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </div>
                        {ord.captainName && (
                          <div style={{ fontSize: "11px", color: "#c084fc", marginTop: "2px" }}>
                            كابتن التوصيل: {ord.captainName}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                          {ord.total} ج.م
                        </div>
                        <span
                          style={{
                            fontSize: "10.5px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "100px",
                            background: ord.status === "delivered" ? "rgba(34, 197, 94, 0.2)" : "rgba(204, 160, 67, 0.2)",
                            color: ord.status === "delivered" ? "#4ade80" : "#cca043",
                          }}
                        >
                          {ord.status === "delivered" ? "تم التسليم" : ord.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", textAlign: "left" }}>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  style={{ background: "#cca043", color: "#180e06", border: "none", padding: "8px 20px", borderRadius: "10px", fontWeight: 800, cursor: "pointer" }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            MODAL 2: ADD / EDIT CUSTOMER
        ══════════════════════════════════════════════════════════ */}
        {editModalOpen && (
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
            <form
              onSubmit={handleSaveCustomer}
              style={{
                background: "#160d05",
                border: "1px solid rgba(204, 160, 67, 0.4)",
                borderRadius: "24px",
                padding: "26px",
                maxWidth: "460px",
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 900, color: "#ffffff" }}>
                  بيانات العميل 👤
                </h3>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#8a7565", cursor: "pointer" }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    اسم العميل بالكامل: *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    style={{ width: "100%", height: "40px", background: "#0d0805", border: "1px solid rgba(204, 160, 67, 0.3)", borderRadius: "10px", padding: "0 12px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    رقم الموبايل: *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    style={{ width: "100%", height: "40px", background: "#0d0805", border: "1px solid rgba(204, 160, 67, 0.3)", borderRadius: "10px", padding: "0 12px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    dir="ltr"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    البريد الإلكتروني (Gmail):
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    style={{ width: "100%", height: "40px", background: "#0d0805", border: "1px solid rgba(204, 160, 67, 0.3)", borderRadius: "10px", padding: "0 12px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                    dir="ltr"
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    منطقة التوصيل:
                  </label>
                  <input
                    type="text"
                    value={customerForm.zone}
                    onChange={(e) => setCustomerForm({ ...customerForm, zone: e.target.value })}
                    style={{ width: "100%", height: "40px", background: "#0d0805", border: "1px solid rgba(204, 160, 67, 0.3)", borderRadius: "10px", padding: "0 12px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", color: "#b0957e", display: "block", marginBottom: "4px" }}>
                    العنوان بالتفصيل:
                  </label>
                  <input
                    type="text"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    style={{ width: "100%", height: "40px", background: "#0d0805", border: "1px solid rgba(204, 160, 67, 0.3)", borderRadius: "10px", padding: "0 12px", color: "#ffffff", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  style={{
                    flex: 1,
                    height: "44px",
                    background: "linear-gradient(135deg, #cca043, #e8a020)",
                    color: "#180e06",
                    fontWeight: 900,
                    fontSize: "14px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {savingCustomer ? "جاري الحفظ..." : "حفظ بيانات العميل 💾"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </ErpLayout>
  );
}
