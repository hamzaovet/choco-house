"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import {
  CircleDollarSign, TrendingUp, TrendingDown, ShoppingBag,
  DollarSign, Loader2, ArrowUpRight, ArrowDownRight, Wallet,
  Plus, X, Trash2, Calendar, Tag, Check, Save
} from "lucide-react";

interface ReportData {
  totalRevenue: number;
  totalDelivery: number;
  totalExpenses: number;
  netProfit: number;
  ordersCount: number;
  byStatus: Record<string, number>;
  byPayment: Record<string, number>;
}

interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  category: string;
  recordedBy?: string;
  createdAt: string;
}

const STATUS_I18N: Record<string, { ar: string; en: string }> = {
  new: { ar: "جديد", en: "New" },
  preparing: { ar: "يُحضَّر", en: "Preparing" },
  ready: { ar: "جاهز للتوصيل", en: "Ready" },
  delivering: { ar: "مع الكابتن", en: "With Captain" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

const PAYMENT_I18N: Record<string, { ar: string; en: string }> = {
  cash: { ar: "كاش 💵", en: "Cash 💵" },
  instapay: { ar: "إنستاباي", en: "InstaPay" },
  wallet: { ar: "محفظة إلكترونية", en: "E-Wallet" },
  card: { ar: "كارت بنكي 💳", en: "Credit Card 💳" },
};

const EXPENSE_CATEGORIES = [
  "خامات ومشتريات 🍫",
  "فواتير ومرافق 💡",
  "رواتب وعمالة 👨‍🍳",
  "صيانة ومعدات 🔧",
  "دليفري ونقل 🛵",
  "نثريات وتشغيل 🧾",
];

export default function ReportsPage() {
  const router = useRouter();
  const { isAuthenticated, currentUser, loading: authLoading } = useStaff();
  const { lang, t, dir } = useLanguage();
  const [data, setData]           = useState<ReportData | null>(null);
  const [range, setRange]         = useState("today");
  const [loading, setLoading]     = useState(true);

  // Expenses management
  const [expenses, setExpenses]   = useState<ExpenseItem[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: EXPENSE_CATEGORIES[0],
    expenseDate: new Date().toISOString().split("T")[0],
  });
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      loadReport();
      loadExpenses();
    }
  }, [authLoading, currentUser, range, router]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?range=${range}`);
      const d = await res.json();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadExpenses() {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const list = await res.json();
        setExpenses(Array.isArray(list) ? list : []);
      }
    } catch {
      // ignore
    }
  }

  async function handleAddExpense() {
    if (!expenseForm.description || !expenseForm.amount) return;
    setSavingExpense(true);
    playSound("click");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseForm.description,
          amount: parseFloat(expenseForm.amount) || 0,
          category: expenseForm.category,
          expenseDate: expenseForm.expenseDate,
          recordedBy: currentUser?.name || "المالك",
        }),
      });

      if (res.ok) {
        playSound("success");
        setShowExpenseModal(false);
        setExpenseForm({
          description: "",
          amount: "",
          category: EXPENSE_CATEGORIES[0],
          expenseDate: new Date().toISOString().split("T")[0],
        });
        loadReport();
        loadExpenses();
      }
    } finally {
      setSavingExpense(false);
    }
  }

  async function handleDeleteExpense(id: string) {
    if (!confirm(t("هل أنت متأكد من حذف هذا المصروف؟", "Are you sure you want to delete this expense?"))) return;
    playSound("click");
    setExpenses((prev) => prev.filter((e) => e.id !== id));

    try {
      await fetch(`/api/expenses/${id}`, { method: "DELETE" });
      playSound("success");
      loadReport();
    } catch {
      loadExpenses();
      loadReport();
    }
  }

  const formatCurrency = (val: number) => {
    return `${lang === "en" ? val.toLocaleString("en-US") : val.toLocaleString("ar-EG")} ${t("ج", "EGP")}`;
  };

  return (
    <ErpLayout activeItem="reports">
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "24px",
        }}>
          <div>
            <h1 style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#ffffff",
              margin: "0 0 6px 0",
            }}>
              {t("الحسابات والأرباح 💰", "Finances & Profits 💰")}
            </h1>
            <p style={{
              fontSize: "13.5px",
              color: "#8a7565",
              margin: 0,
              fontWeight: 600,
            }}>
              {t("متابعة الإيرادات، تسجيل المصروفات وصافي الأرباح لحظة بلحظة", "Track revenues, log expenses, and monitor net profit in real time")}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Time range buttons */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "14px",
              padding: "4px",
            }}>
              {[
                { id: "today", label: t("اليوم", "Today") },
                { id: "week",  label: t("هذا الأسبوع", "This Week") },
                { id: "month", label: t("هذا الشهر", "This Month") },
              ].map((r) => {
                const isSelected = range === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => { setRange(r.id); playSound("click"); }}
                    style={{
                      padding: "7px 16px",
                      borderRadius: "10px",
                      border: "none",
                      background: isSelected ? "#cca043" : "transparent",
                      color: isSelected ? "#180e06" : "#b0957e",
                      fontSize: "13px",
                      fontWeight: isSelected ? 900 : 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Add Expense Button */}
            <button
              onClick={() => { playSound("click"); setShowExpenseModal(true); }}
              style={{
                background: "#cca043",
                border: "none",
                borderRadius: "12px",
                color: "#180e06",
                padding: "9px 18px",
                fontSize: "13.5px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: "0 4px 14px rgba(204, 160, 67, 0.3)",
              }}
            >
              <Plus size={17} strokeWidth={2.5} />
              <span>{t("تسجيل مصروف جديد 💸", "Record Expense 💸")}</span>
            </button>
          </div>
        </div>

        {/* ── KPIs Cards ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#8a7565" }}>
            <Loader2 size={36} className="animate-spin" color="#cca043" style={{ margin: "0 auto 12px" }} />
            <p>{t("جاري تجميع البيانات المالية...", "Aggregating financial data...")}</p>
          </div>
        ) : !data ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#8a7565" }}>
            <p>{t("لا توجد بيانات متاحة لهذه الفترة", "No data available for this period")}</p>
          </div>
        ) : (
          <div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "28px",
            }}>
              {[
                {
                  label: t("إجمالي الإيرادات", "Total Revenue"),
                  val: formatCurrency(data.totalRevenue),
                  icon: <CircleDollarSign size={22} color="#cca043" />,
                  color: "#cca043",
                  bg: "rgba(204, 160, 67, 0.1)",
                  border: "rgba(204, 160, 67, 0.25)",
                },
                {
                  label: t("عدد الطلبات", "Total Orders"),
                  val: data.ordersCount,
                  icon: <ShoppingBag size={22} color="#60a5fa" />,
                  color: "#60a5fa",
                  bg: "rgba(59, 130, 246, 0.1)",
                  border: "rgba(59, 130, 246, 0.25)",
                },
                {
                  label: t("المصروفات", "Total Expenses"),
                  val: formatCurrency(data.totalExpenses),
                  icon: <TrendingDown size={22} color="#f87171" />,
                  color: "#f87171",
                  bg: "rgba(239, 68, 68, 0.1)",
                  border: "rgba(239, 68, 68, 0.25)",
                },
                {
                  label: t("صافي الربح", "Net Profit"),
                  val: formatCurrency(data.netProfit),
                  icon: <TrendingUp size={22} color={data.netProfit >= 0 ? "#4ade80" : "#f87171"} />,
                  color: data.netProfit >= 0 ? "#4ade80" : "#f87171",
                  bg: data.netProfit >= 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                  border: data.netProfit >= 0 ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)",
                },
              ].map((k) => (
                <div
                  key={k.label}
                  style={{
                    background: k.bg,
                    border: `1px solid ${k.border}`,
                    borderRadius: "18px",
                    padding: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "13px", color: "#b0957e", fontWeight: 700 }}>{k.label}</span>
                    {k.icon}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 900, color: k.color }}>
                    {k.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown Grids */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px", marginBottom: "28px" }}>
              {/* By Status */}
              <div style={{
                background: "rgba(24, 13, 7, 0.85)",
                border: "1px solid rgba(204, 160, 67, 0.16)",
                borderRadius: "20px",
                padding: "22px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", margin: "0 0 16px 0" }}>
                  {t("توزيع الطلبات بالحالة", "Orders by Status")}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {Object.entries(data.byStatus).map(([status, count]) => {
                    const pct = data.ordersCount > 0 ? Math.round((count / data.ordersCount) * 100) : 0;
                    const statusLabel = STATUS_I18N[status] ? (lang === "en" ? STATUS_I18N[status].en : STATUS_I18N[status].ar) : status;
                    return (
                      <div key={status}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                          <span style={{ color: "#b0957e", fontWeight: 700 }}>{statusLabel}</span>
                          <span style={{ color: "#ffffff", fontWeight: 800 }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "100px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#cca043", borderRadius: "100px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Payment Method */}
              <div style={{
                background: "rgba(24, 13, 7, 0.85)",
                border: "1px solid rgba(204, 160, 67, 0.16)",
                borderRadius: "20px",
                padding: "22px",
              }}>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#ffffff", margin: "0 0 16px 0" }}>
                  {t("الإيرادات بطريقة الدفع", "Revenue by Payment Method")}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {Object.entries(data.byPayment).map(([method, amount]) => {
                    const pct = data.totalRevenue > 0 ? Math.round((amount / data.totalRevenue) * 100) : 0;
                    const payLabel = PAYMENT_I18N[method] ? (lang === "en" ? PAYMENT_I18N[method].en : PAYMENT_I18N[method].ar) : method;
                    return (
                      <div key={method}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "5px" }}>
                          <span style={{ color: "#b0957e", fontWeight: 700 }}>{payLabel}</span>
                          <span style={{ color: "#ffffff", fontWeight: 800 }}>{formatCurrency(amount)} ({pct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.06)", borderRadius: "100px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#10b981", borderRadius: "100px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Recent Expenses List ── */}
            <div style={{
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "20px",
              padding: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "17px", fontWeight: 900, color: "#ffffff" }}>
                    {t("سجل المصروفات المسجلة 🧾", "Recorded Expenses Log 🧾")}
                  </h3>
                  <p style={{ margin: 0, fontSize: "12px", color: "#8a7565" }}>
                    {t("جميع المصروفات اليومية وخصمها المباشر من صافي الأرباح", "All daily expenses and direct deduction from net profit")}
                  </p>
                </div>

                <button
                  onClick={() => { playSound("click"); setShowExpenseModal(true); }}
                  style={{
                    background: "rgba(204, 160, 67, 0.15)",
                    border: "1px solid rgba(204, 160, 67, 0.3)",
                    borderRadius: "10px",
                    color: "#cca043",
                    padding: "7px 14px",
                    fontSize: "12.5px",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={14} />
                  <span>{t("إضافة مصروف", "Add Expense")}</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#8a7565" }}>
                  <p>{t("لا توجد مصروفات مسجلة حتى الآن", "No recorded expenses yet")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {expenses.slice(0, 20).map((exp) => (
                    <div
                      key={exp.id}
                      style={{
                        background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.12)",
                        borderRadius: "14px",
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          background: "rgba(204, 160, 67, 0.12)",
                          color: "#cca043",
                          fontSize: "11px",
                          fontWeight: 800,
                        }}>
                          {exp.category}
                        </span>
                        <div>
                          <div style={{ fontSize: "14px", fontWeight: 800, color: "#ffffff" }}>
                            {exp.description}
                          </div>
                          <div style={{ fontSize: "11px", color: "#8a7565", marginTop: "2px" }}>
                            {t("التاريخ:", "Date:")} {exp.expenseDate} {exp.recordedBy ? `— ${t("بواسطة:", "By:")} ${exp.recordedBy}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "16px", fontWeight: 900, color: "#f87171" }}>
                          - {formatCurrency(exp.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "8px",
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            color: "#f87171",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                          }}
                          title={t("حذف المصروف", "Delete Expense")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Record Expense Modal ── */}
        {showExpenseModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              width: "100%",
              maxWidth: "460px",
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.35)",
              borderRadius: "24px",
              padding: "26px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
              position: "relative",
              color: "#f5ede4",
            }}>
              <button
                onClick={() => setShowExpenseModal(false)}
                style={{
                  position: "absolute", top: "18px", [dir === "rtl" ? "left" : "right"]: "18px",
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: "10px", padding: "6px", cursor: "pointer", color: "#8a7565",
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "12px",
                  background: "rgba(239, 68, 68, 0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#f87171",
                }}>
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>
                    {t("تسجيل مصروف جديد 💸", "Record New Expense 💸")}
                  </h2>
                  <div style={{ fontSize: "11px", color: "#8a7565" }}>
                    {t("يتم خصم المبلغ مباشرة من صافي أرباح المحل", "Deducted directly from store net profit")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("بيان / وصف المصروف *", "Description / Notes *")}
                  </label>
                  <input
                    type="text"
                    value={expenseForm.description}
                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                    placeholder={t("مثلاً: شراء 2 كرتونة نوتيلا، فاتورة كهرباء، صيانة...", "e.g., 2 boxes of Nutella, electric bill, maintenance...")}
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                      padding: "0 14px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("المبلغ (جنيه) *", "Amount (EGP) *")}
                    </label>
                    <input
                      type="number"
                      dir="ltr"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      placeholder="0.00"
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 14px", color: "#fff", fontSize: "14px", fontWeight: 800, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("تاريخ المصروف", "Expense Date")}
                    </label>
                    <input
                      type="date"
                      dir="ltr"
                      value={expenseForm.expenseDate}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 10px", color: "#fff", fontSize: "12.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("تصنيف المصروف", "Category")}
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                      padding: "0 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box",
                    }}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                  <button
                    onClick={() => setShowExpenseModal(false)}
                    style={{
                      flex: 1, height: "44px", borderRadius: "12px",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#b0957e", fontSize: "13px", fontWeight: 800, cursor: "pointer",
                    }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>

                  <button
                    onClick={handleAddExpense}
                    disabled={savingExpense || !expenseForm.description || !expenseForm.amount}
                    style={{
                      flex: 2, height: "44px", borderRadius: "12px",
                      background: "#cca043", border: "none",
                      color: "#180e06", fontSize: "13.5px", fontWeight: 900,
                      cursor: savingExpense ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      opacity: (!expenseForm.description || !expenseForm.amount) ? 0.5 : 1,
                    }}
                  >
                    {savingExpense ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{savingExpense ? t("جاري التسجيل...", "Saving...") : t("تسجيل المصروف الآن", "Save Expense Now")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </ErpLayout>
  );
}
