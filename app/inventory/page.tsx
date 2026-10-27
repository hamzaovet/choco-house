"use client";

import React, { useState, useEffect } from "react";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import {
  Package, AlertTriangle, Plus, Search, RefreshCw,
  TrendingDown, TrendingUp, Pencil, Trash2, X, Check, Loader2, Minus, Save,
  Scale, ShoppingCart, History, Calendar, Calculator, FileText, ChevronDown, ChevronUp, DollarSign
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minStock: number;
  costPerUnit: number;
  createdAt?: string;
}

interface AuditSessionItem {
  ingredientId: string;
  name: string;
  unit: string;
  prevQty: number;
  actualQty: number;
  costPerUnit: number;
}

interface HistoricalAudit {
  id: string;
  title: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalCost: number;
  itemsCount: number;
  items: string; // JSON
  recordedBy?: string | null;
  createdAt: string;
}

const COMMON_UNITS = ["كيلو", "لتر", "علبة", "طبق", "صندوق", "قطعة", "جرام"];

export default function InventoryPage() {
  const { isAuthenticated, currentUser, loading: authLoading } = useStaff();
  const { lang, t, dir } = useLanguage();
  const router = useRouter();

  const translateUnit = (u: string) => {
    if (lang !== "en") return u;
    const map: Record<string, string> = {
      "كيلو": "Kg",
      "لتر": "L",
      "علبة": "Box",
      "طبق": "Plate",
      "صندوق": "Crate",
      "قطعة": "Pcs",
      "جرام": "g",
    };
    return map[u] || u;
  };

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // ── Modal 1: Add / Edit Item ──
  const [modalItem, setModalItem] = useState<Partial<Ingredient> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // ── Modal 2: Audit / Reconciliation (تحديث المخزن وجرد الاستهلاك) ──
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditTitle, setAuditTitle] = useState("");
  const [auditStart, setAuditStart] = useState("");
  const [auditEnd, setAuditEnd] = useState(new Date().toISOString().split("T")[0]);
  const [auditInputs, setAuditInputs] = useState<Record<string, number>>({});
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  // ── Modal 3: Purchase / Restock (شراء وتوريد خامة بمتوسط التكلفة WAC) ──
  const [purchaseItem, setPurchaseItem] = useState<Ingredient | null>(null);
  const [purchaseQty, setPurchaseQty] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [purchaseInvoice, setPurchaseInvoice] = useState("");
  const [purchaseSupplier, setPurchaseSupplier] = useState("");
  const [recordPurchaseExpense, setRecordPurchaseExpense] = useState(true);
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // ── Modal 4: Historical Audits (تقارير الجرد السابقة) ──
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyAudits, setHistoryAudits] = useState<HistoricalAudit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      fetchItems();
    }
  }, [authLoading, isAuthenticated, router]);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchHistoryAudits() {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/inventory/audit");
      if (res.ok) {
        const data = await res.json();
        setHistoryAudits(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  // ── Handle Open Audit Modal ──
  function openAuditModal() {
    playSound("click");
    // Pre-populate actual count inputs with current database quantities as starting point
    const initial: Record<string, number> = {};
    items.forEach((item) => {
      initial[item.id] = item.quantity;
    });
    setAuditInputs(initial);
    const today = new Date().toISOString().split("T")[0];
    setAuditTitle(`جرد استهلاك المخزن (${today})`);
    setAuditEnd(today);
    setAuditSuccess(false);
    setShowAuditModal(true);
  }

  // ── Submit Audit / Consumption Reconciliation ──
  async function handleSubmitAudit() {
    setSubmittingAudit(true);
    playSound("click");

    const auditPayload = {
      title: auditTitle,
      periodStart: auditStart || null,
      periodEnd: auditEnd,
      recordedBy: currentUser?.name || "المالك",
      items: items.map((i) => ({
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        prevQty: i.quantity,
        actualQty: auditInputs[i.id] !== undefined ? auditInputs[i.id] : i.quantity,
        costPerUnit: i.costPerUnit,
      })),
    };

    try {
      const res = await fetch("/api/inventory/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(auditPayload),
      });

      if (res.ok) {
        playSound("success");
        setAuditSuccess(true);
        setTimeout(() => {
          setShowAuditModal(false);
          setAuditSuccess(false);
          fetchItems();
        }, 1500);
      }
    } finally {
      setSubmittingAudit(false);
    }
  }

  // ── Submit Purchase / Restock ──
  async function handleSubmitPurchase() {
    if (!purchaseItem || !purchaseQty || !purchasePrice) return;
    setSubmittingPurchase(true);
    playSound("click");

    try {
      const res = await fetch("/api/inventory/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: purchaseItem.id,
          quantity: parseFloat(purchaseQty),
          unitPrice: parseFloat(purchasePrice),
          invoiceNumber: purchaseInvoice,
          supplier: purchaseSupplier,
          recordAsExpense: recordPurchaseExpense,
          recordedBy: currentUser?.name || "المالك",
        }),
      });

      if (res.ok) {
        playSound("success");
        setPurchaseSuccess(true);
        setTimeout(() => {
          setPurchaseItem(null);
          setPurchaseQty("");
          setPurchasePrice("");
          setPurchaseInvoice("");
          setPurchaseSupplier("");
          setPurchaseSuccess(false);
          fetchItems();
        }, 1500);
      }
    } finally {
      setSubmittingPurchase(false);
    }
  }

  // ── Quick +/- Qty ──
  async function handleQuickQty(id: string, delta: number) {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const newQty = Math.max(0, target.quantity + delta);
    playSound("click");

    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: newQty } : i));

    try {
      await fetch(`/api/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
    } catch {
      fetchItems();
    }
  }

  // ── Save Add/Edit Item ──
  async function handleSaveItem() {
    if (!modalItem || !modalItem.name) return;
    setSavingItem(true);
    playSound("click");

    try {
      if (isNew) {
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalItem),
        });
        if (res.ok) {
          playSound("success");
          fetchItems();
          setModalItem(null);
        }
      } else if (modalItem.id) {
        const res = await fetch(`/api/inventory/${modalItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalItem),
        });
        if (res.ok) {
          playSound("success");
          fetchItems();
          setModalItem(null);
        }
      }
    } finally {
      setSavingItem(false);
    }
  }

  // ── Delete Item ──
  async function handleDelete(id: string, name: string) {
    if (!confirm(`هل أنت متأكد من حذف "${name}" من المخزن؟`)) return;
    playSound("click");
    setItems((prev) => prev.filter((i) => i.id !== id));

    try {
      await fetch(`/api/inventory/${id}`, { method: "DELETE" });
      playSound("success");
    } catch {
      fetchItems();
    }
  }

  // Calculations for live audit
  const calculateTotalAuditConsumptionCost = () => {
    return items.reduce((sum, item) => {
      const actual = auditInputs[item.id] !== undefined ? auditInputs[item.id] : item.quantity;
      const consumed = Math.max(0, item.quantity - actual);
      return sum + consumed * item.costPerUnit;
    }, 0);
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.unit.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;
  const totalValue = items.reduce((sum, i) => sum + i.quantity * i.costPerUnit, 0);

  if (authLoading) return null;

  return (
    <ErpLayout activeItem="inventory">
      <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "40px" }}>

        {/* ── Top Header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "26px", fontWeight: 900, color: "#ffffff" }}>
              {t("المخزن والتكاليف 📦", "Inventory & Costs 📦")}
            </h1>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#8a7565", fontWeight: 600 }}>
              {t("متابعة أرصدة الخامات، حساب متوسط التكلفة المرجح، وجرد استهلاك الفترة", "Track raw materials, calculate Weighted Average Cost, and audit period consumption")}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* 1. Update Inventory (Audit & Consumption) */}
            <button
              onClick={openAuditModal}
              style={{
                background: "#cca043",
                border: "none",
                borderRadius: "12px",
                color: "#180e06",
                padding: "10px 18px",
                fontSize: "13.5px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: "0 4px 14px rgba(204, 160, 67, 0.35)",
              }}
              title={t("جرد المخزن وحساب تكلفة الخامات المستهلكة وترحيلها للأرباح", "Audit stock, calculate consumed costs, and book to profits")}
            >
              <Scale size={17} strokeWidth={2.5} />
              <span>{t("تحديث المخزن (جرد الاستهلاك) ⚖️", "Stock Audit (Reconcile) ⚖️")}</span>
            </button>

            {/* 2. Purchase / Restock */}
            <button
              onClick={() => {
                playSound("click");
                if (items.length > 0) setPurchaseItem(items[0]);
              }}
              style={{
                background: "rgba(204, 160, 67, 0.15)",
                border: "1px solid rgba(204, 160, 67, 0.35)",
                borderRadius: "12px",
                color: "#cca043",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <ShoppingCart size={16} />
              <span>{t("شراء / توريد خامات 🛒", "Purchase / Restock 🛒")}</span>
            </button>

            {/* 3. Historical Audits Report */}
            <button
              onClick={() => {
                playSound("click");
                fetchHistoryAudits();
                setShowHistoryModal(true);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                color: "#b0957e",
                padding: "10px 16px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <History size={16} />
              <span>{t("تقارير الجرد السابقة 📋", "Audit History 📋")}</span>
            </button>

            {/* 4. Add New Raw Material */}
            <button
              onClick={() => {
                playSound("click");
                setIsNew(true);
                setModalItem({ name: "", unit: "كيلو", quantity: 1, minStock: 2, costPerUnit: 100 });
              }}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "12px",
                color: "#f5ede4",
                padding: "10px 14px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Plus size={16} />
              <span>{t("خامة جديدة +", "+ New Material")}</span>
            </button>

            {/* Refresh button */}
            <button
              onClick={() => { playSound("click"); fetchItems(); }}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#b0957e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title={t("تحديث", "Refresh")}
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "24px",
        }}>
          <div style={{
            background: "#160d05",
            border: "1px solid rgba(204, 160, 67, 0.2)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#8a7565", marginBottom: "6px" }}>
              {t("إجمالي قيمة المخزن الحالية", "Total Current Stock Value")}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: "#cca043" }}>
              {totalValue.toLocaleString(lang === "en" ? "en-US" : "ar-EG")} <span style={{ fontSize: "14px", color: "#8a7565" }}>{t("ج.م", "EGP")}</span>
            </div>
          </div>

          <div style={{
            background: "#160d05",
            border: "1px solid rgba(204, 160, 67, 0.2)",
            borderRadius: "16px",
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#8a7565", marginBottom: "6px" }}>
              {t("إجمالي الأصناف بالمخزن", "Total Stock Items")}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: "#ffffff" }}>
              {items.length} <span style={{ fontSize: "14px", color: "#8a7565" }}>{t("خامة", "Items")}</span>
            </div>
          </div>

          <div style={{
            background: lowStockCount > 0 ? "rgba(239, 68, 68, 0.12)" : "#160d05",
            border: `1px solid ${lowStockCount > 0 ? "rgba(239, 68, 68, 0.35)" : "rgba(204, 160, 67, 0.2)"}`,
            borderRadius: "16px",
            padding: "18px 20px",
          }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: lowStockCount > 0 ? "#f87171" : "#8a7565", marginBottom: "6px" }}>
              {t("أصناف تحت الحد الأدنى", "Items Below Minimum")}
            </div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: lowStockCount > 0 ? "#ef4444" : "#4ade80" }}>
              {lowStockCount} <span style={{ fontSize: "14px" }}>{lowStockCount > 0 ? t("⚠️ تحتاج توريد", "⚠️ Needs Restock") : t("✓ آمن", "✓ Safe")}</span>
            </div>
          </div>
        </div>

        {/* ── Search Bar ── */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <Search size={18} style={{
            position: "absolute", top: "13px",
            [dir === "rtl" ? "right" : "left"]: "14px",
            color: "#8a7565"
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("بحث بالاسم أو وحدة القياس (مثلاً: نوتيلا، لوتس، دقيق، طبق)...", "Search by name or unit (e.g. Nutella, Lotus, Flour, Plate)...")}
            style={{
              width: "100%",
              height: "44px",
              backgroundColor: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.2)",
              borderRadius: "14px",
              padding: dir === "rtl" ? "0 44px 0 16px" : "0 16px 0 44px",
              color: "#ffffff",
              fontSize: "13.5px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* ── Items Cards Grid ── */}
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "240px" }}>
            <Loader2 size={36} className="animate-spin" color="#cca043" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "#160d05",
            border: "1px solid rgba(204, 160, 67, 0.15)",
            borderRadius: "20px",
            padding: "60px 20px",
            textAlign: "center",
            color: "#8a7565",
          }}>
            <Package size={48} style={{ margin: "0 auto 12px auto", opacity: 0.3 }} />
            <h3 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "17px" }}>{t("لا توجد خامات مطابقة", "No matching materials")}</h3>
            <p style={{ margin: 0, fontSize: "13px" }}>{t("اضغط على \"خامة جديدة\" لإضافة خامات للمخزن", "Click on \"+ New Material\" to add raw materials to stock")}</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "16px",
          }}>
            {filtered.map((item) => {
              const isLow = item.quantity <= item.minStock;
              return (
                <div
                  key={item.id}
                  style={{
                    background: "#160d05",
                    border: `1px solid ${isLow ? "rgba(239, 68, 68, 0.35)" : "rgba(204, 160, 67, 0.18)"}`,
                    borderRadius: "18px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Item Header */}
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px 0", fontSize: "16.5px", fontWeight: 900, color: "#ffffff" }}>
                          {item.name}
                        </h3>
                        <div style={{ fontSize: "12px", color: "#cca043", fontWeight: 700 }}>
                          {t("متوسط التكلفة:", "Avg Cost:")} {item.costPerUnit} {t("ج", "EGP")} / {translateUnit(item.unit)}
                        </div>
                      </div>

                      <span style={{
                        padding: "3px 10px",
                        borderRadius: "100px",
                        fontSize: "11px",
                        fontWeight: 800,
                        backgroundColor: isLow ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                        color: isLow ? "#ef4444" : "#4ade80",
                        border: `1px solid ${isLow ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                      }}>
                        {isLow ? <AlertTriangle size={11} /> : <Check size={11} />}
                        <span>{isLow ? t("منخفض ⚠️", "Low ⚠️") : t("كافي ✓", "Adequate ✓")}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quantity and Quick Adjustment Controls */}
                  <div style={{
                    background: "#0d0805",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#8a7565" }}>{t("الرصيد الدفتري الحالي", "Current Book Balance")}</div>
                      <div style={{ fontSize: "20px", fontWeight: 900, color: isLow ? "#ef4444" : "#cca043" }}>
                        {item.quantity} <span style={{ fontSize: "12px", color: "#8a7565" }}>{translateUnit(item.unit)}</span>
                      </div>
                      <div style={{ fontSize: "10.5px", color: "#7a5c3e" }}>
                        {t("الحد الأدنى:", "Min Level:")} {item.minStock} {translateUnit(item.unit)}
                      </div>
                    </div>

                    {/* Quick +/- buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        onClick={() => handleQuickQty(item.id, -1)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title={t("إنقاص 1", "Decrease 1")}
                      >
                        <Minus size={14} />
                      </button>

                      <button
                        onClick={() => handleQuickQty(item.id, +1)}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "10px",
                          background: "rgba(204, 160, 67, 0.15)",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          color: "#cca043",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title={t("زيادة 1", "Increase 1")}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Actions: Purchase Stock, Edit & Delete */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "6px", gap: "6px" }}>
                    <div style={{ fontSize: "12px", color: "#8a7565", fontWeight: 700 }}>
                      {t("إجمالي:", "Total:")} <span style={{ color: "#ffffff" }}>{(item.quantity * item.costPerUnit).toLocaleString(lang === "en" ? "en-US" : "ar-EG")} {t("ج", "EGP")}</span>
                    </div>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {/* Purchase button for this item */}
                      <button
                        onClick={() => {
                          playSound("click");
                          setPurchaseItem(item);
                          setPurchaseQty("");
                          setPurchasePrice(item.costPerUnit.toString());
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "10px",
                          background: "rgba(204, 160, 67, 0.12)",
                          border: "1px solid rgba(204, 160, 67, 0.3)",
                          color: "#cca043",
                          fontSize: "11.5px",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title={t("شراء وتوريد رصيد جديد وحساب متوسط التكلفة", "Buy stock and update weighted average cost")}
                      >
                        <ShoppingCart size={13} />
                        <span>{t("شراء", "Buy")}</span>
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => {
                          playSound("click");
                          setIsNew(false);
                          setModalItem({ ...item });
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "10px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "#b0957e",
                          fontSize: "11.5px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Pencil size={12} />
                        <span>{t("تعديل", "Edit")}</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "10px",
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          color: "#f87171",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                        title={t("حذف", "Delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 2: "تحديث المخزن (جرد الاستهلاك وترحيل التكاليف)"
        ══════════════════════════════════════════════════════════════ */}
        {showAuditModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              width: "100%",
              maxWidth: "880px",
              maxHeight: "90vh",
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.4)",
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
              color: "#f5ede4",
              overflow: "hidden",
            }}>
              {/* Modal Header */}
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(204, 160, 67, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#120a04",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "rgba(204, 160, 67, 0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#cca043",
                  }}>
                    <Scale size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>
                      {t("تحديث المخزن وجرد استهلاك الخامات للفترة ⚖️", "Stock Audit & Material Consumption ⚖️")}
                    </h2>
                    <div style={{ fontSize: "11.5px", color: "#8a7565" }}>
                      {t("اكتب الرصيد الفعلي الحالي في المحل — والسيستم سيحسب الاستهلاك والتكلفة ويرحلها تلقائياً للأرباح", "Enter actual physical count — system automatically computes consumption and cost to book into expenses")}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowAuditModal(false)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)", border: "none",
                    color: "#8a7565", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Period Title & Dates */}
              <div style={{
                padding: "16px 24px",
                background: "rgba(204, 160, 67, 0.05)",
                borderBottom: "1px solid rgba(204, 160, 67, 0.12)",
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "12px",
              }}>
                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#b0957e", marginBottom: "4px" }}>
                    {t("عنوان فترة الجرد", "Audit Period Title")}
                  </label>
                  <input
                    type="text"
                    value={auditTitle}
                    onChange={(e) => setAuditTitle(e.target.value)}
                    style={{
                      width: "100%", height: "38px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#b0957e", marginBottom: "4px" }}>
                    {t("من تاريخ (اختياري)", "From Date (Optional)")}
                  </label>
                  <input
                    type="date"
                    value={auditStart}
                    onChange={(e) => setAuditStart(e.target.value)}
                    style={{
                      width: "100%", height: "38px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 10px", color: "#fff", fontSize: "12px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 800, color: "#b0957e", marginBottom: "4px" }}>
                    {t("إلى تاريخ (تاريخ الجرد)", "To Date (Audit Date)")}
                  </label>
                  <input
                    type="date"
                    value={auditEnd}
                    onChange={(e) => setAuditEnd(e.target.value)}
                    style={{
                      width: "100%", height: "38px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 10px", color: "#fff", fontSize: "12px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* Items Inventory Table */}
              <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "16px 24px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(204, 160, 67, 0.2)", color: "#b0957e", textAlign: dir === "rtl" ? "right" : "left" }}>
                      <th style={{ padding: "8px 6px" }}>{t("الخامة", "Material")}</th>
                      <th style={{ padding: "8px 6px" }}>{t("الرصيد الدفتري السابق", "Previous Book Balance")}</th>
                      <th style={{ padding: "8px 6px" }}>{t("الرصيد الفعلي بعد الجرد", "Actual Count")}</th>
                      <th style={{ padding: "8px 6px" }}>{t("متوسط تكلفة الوحدة", "Avg Unit Cost")}</th>
                      <th style={{ padding: "8px 6px" }}>{t("الكمية المستهلكة", "Consumed Qty")}</th>
                      <th style={{ padding: "8px 6px" }}>{t("تكلفة الاستهلاك للفترة", "Period Consumption Cost")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const actual = auditInputs[item.id] !== undefined ? auditInputs[item.id] : item.quantity;
                      const consumed = Math.max(0, Math.round((item.quantity - actual) * 1000) / 1000);
                      const cost = Math.round(consumed * item.costPerUnit * 100) / 100;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            background: consumed > 0 ? "rgba(204, 160, 67, 0.04)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "12px 6px", fontWeight: 800, color: "#ffffff" }}>
                            {item.name} <span style={{ fontSize: "11px", color: "#8a7565" }}>({translateUnit(item.unit)})</span>
                          </td>
                          <td style={{ padding: "12px 6px", color: "#b0957e" }}>
                            {item.quantity} {translateUnit(item.unit)}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <input
                                type="number"
                                step="any"
                                dir="ltr"
                                value={auditInputs[item.id] !== undefined ? auditInputs[item.id] : ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                                  setAuditInputs({ ...auditInputs, [item.id]: val });
                                }}
                                style={{
                                  width: "90px",
                                  height: "36px",
                                  background: "#0d0805",
                                  border: "1px solid rgba(204, 160, 67, 0.4)",
                                  borderRadius: "8px",
                                  padding: "0 8px",
                                  color: "#ffffff",
                                  fontSize: "13.5px",
                                  fontWeight: 800,
                                  textAlign: "center",
                                  outline: "none",
                                }}
                              />
                              <span style={{ fontSize: "11px", color: "#8a7565" }}>{translateUnit(item.unit)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 6px", color: "#cca043", fontWeight: 700 }}>
                            {item.costPerUnit} {t("ج", "EGP")}
                          </td>
                          <td style={{ padding: "12px 6px", fontWeight: 900, color: consumed > 0 ? "#ef4444" : "#4ade80" }}>
                            {consumed > 0 ? `-${consumed}` : "0"} {translateUnit(item.unit)}
                          </td>
                          <td style={{ padding: "12px 6px", fontWeight: 900, color: consumed > 0 ? "#ef4444" : "#8a7565" }}>
                            {cost.toLocaleString(lang === "en" ? "en-US" : "ar-EG")} {t("ج", "EGP")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Live Consumption Cost Summary & Submit */}
              <div style={{
                padding: "18px 24px",
                borderTop: "1px solid rgba(204, 160, 67, 0.2)",
                background: "#110904",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "14px",
              }}>
                <div>
                  <div style={{ fontSize: "11.5px", color: "#8a7565" }}>
                    {t("إجمالي تكلفة الخامات المستهلكة لهذه الفترة:", "Total period consumption cost:")}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: 900, color: "#cca043" }}>
                    {calculateTotalAuditConsumptionCost().toLocaleString(lang === "en" ? "en-US" : "ar-EG")} <span style={{ fontSize: "14px" }}>{t("ج.م", "EGP")}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#4ade80", marginTop: "2px" }}>
                    {t("✓ سيتم ترحيل هذا المبلغ تلقائياً لقسم المصروفات لحساب صافي الأرباح", "✓ This cost will be automatically posted to Expenses to calculate Net Profit")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => setShowAuditModal(false)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#b0957e",
                      fontSize: "13px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>

                  <button
                    onClick={handleSubmitAudit}
                    disabled={submittingAudit}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "12px",
                      background: auditSuccess ? "#22c55e" : "#cca043",
                      border: "none",
                      color: "#180e06",
                      fontSize: "13.5px",
                      fontWeight: 900,
                      cursor: submittingAudit ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(204, 160, 67, 0.3)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {submittingAudit ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t("جاري ترحيل الجرد...", "Posting audit...")}</span>
                      </>
                    ) : auditSuccess ? (
                      <>
                        <Check size={16} />
                        <span>{t("✓ تم اعتماد وترحيل الجرد!", "✓ Audit posted successfully!")}</span>
                      </>
                    ) : (
                      <>
                        <Scale size={16} />
                        <span>{t("اعتماد الجرد وترحيل التكلفة 🚀", "Confirm Audit & Book Costs 🚀")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 3: "شراء وتوريد خامات بمتوسط التكلفة المرجح (WAC)"
        ══════════════════════════════════════════════════════════════ */}
        {purchaseItem !== null && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              width: "100%",
              maxWidth: "520px",
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.35)",
              borderRadius: "24px",
              padding: "26px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
              position: "relative",
              color: "#f5ede4",
            }}>
              <button
                onClick={() => setPurchaseItem(null)}
                style={{
                  position: "absolute", top: "18px", [dir === "rtl" ? "left" : "right"]: "18px",
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: "10px", padding: "6px", cursor: "pointer", color: "#8a7565",
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: "rgba(204, 160, 67, 0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#cca043",
                }}>
                  <ShoppingCart size={22} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>
                    {t("شراء وتوريد خامة للمخزن 🛒", "Restock Raw Material 🛒")}
                  </h2>
                  <div style={{ fontSize: "11px", color: "#8a7565" }}>
                    {t("إضافة كمية وحساب متوسط تكلفة الوحدة المرجح (WAC) أوتوماتيكياً", "Add quantity and calculate Weighted Average Cost automatically")}
                  </div>
                </div>
              </div>

              {/* Current Stats Box */}
              <div style={{
                background: "rgba(204, 160, 67, 0.08)",
                border: "1px solid rgba(204, 160, 67, 0.2)",
                borderRadius: "14px",
                padding: "12px 16px",
                marginBottom: "18px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#8a7565" }}>{t("الخامة المختارة:", "Selected Material:")}</div>
                  <div style={{ fontSize: "15px", fontWeight: 900, color: "#ffffff" }}>
                    {purchaseItem.name}
                  </div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }}>
                  <div style={{ fontSize: "11px", color: "#8a7565" }}>{t("الرصيد / التكلفة الحالية:", "Current Stock / Avg Cost:")}</div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#cca043" }}>
                    {purchaseItem.quantity} {translateUnit(purchaseItem.unit)} @ {purchaseItem.costPerUnit} {t("ج", "EGP")}
                  </div>
                </div>
              </div>

              {/* Purchase Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Select Ingredient Dropdown */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("تغيير الخامة (إن رغبت)", "Change Material (Optional)")}
                  </label>
                  <select
                    value={purchaseItem.id}
                    onChange={(e) => {
                      const selected = items.find((i) => i.id === e.target.value);
                      if (selected) {
                        setPurchaseItem(selected);
                        setPurchasePrice(selected.costPerUnit.toString());
                      }
                    }}
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                      padding: "0 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box",
                    }}
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({t("متوفر:", "Available:")} {i.quantity} {translateUnit(i.unit)})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("الكمية المشتراة", "Purchased Quantity")} ({translateUnit(purchaseItem.unit)}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={purchaseQty}
                      onChange={(e) => setPurchaseQty(e.target.value)}
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
                      {t("سعر شراء الوحدة الجديد (ج) *", "Unit Purchase Price (EGP) *")}
                    </label>
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 14px", color: "#fff", fontSize: "14px", fontWeight: 800, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Weighted Average Cost Calculation Preview */}
                {(() => {
                  const qty = parseFloat(purchaseQty) || 0;
                  const price = parseFloat(purchasePrice) || 0;
                  if (qty > 0 && price > 0) {
                    const newTotalQty = purchaseItem.quantity + qty;
                    const prevValue = Math.max(0, purchaseItem.quantity) * purchaseItem.costPerUnit;
                    const purchaseTotal = qty * price;
                    const newAvgCost = Math.round(((prevValue + purchaseTotal) / newTotalQty) * 100) / 100;

                    return (
                      <div style={{
                        background: "#0d0805",
                        border: "1px solid rgba(74, 222, 128, 0.3)",
                        borderRadius: "12px",
                        padding: "12px",
                        fontSize: "12px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7565" }}>{t("إجمالي الفاتورة:", "Invoice Total:")}</span>
                          <span style={{ color: "#ffffff", fontWeight: 800 }}>{purchaseTotal.toLocaleString(lang === "en" ? "en-US" : "ar-EG")} {t("ج", "EGP")}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ color: "#8a7565" }}>{t("الرصيد الجديد بعد التوريد:", "New Balance After Restock:")}</span>
                          <span style={{ color: "#ffffff", fontWeight: 800 }}>{newTotalQty} {translateUnit(purchaseItem.unit)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px dashed rgba(255,255,255,0.1)" }}>
                          <span style={{ color: "#cca043", fontWeight: 800 }}>{t("متوسط التكلفة المرجح الجديد:", "New Weighted Average Cost:")}</span>
                          <span style={{ color: "#4ade80", fontWeight: 900, fontSize: "13px" }}>
                            {newAvgCost} {t("ج", "EGP")} / {translateUnit(purchaseItem.unit)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#8a7565", marginBottom: "5px" }}>
                      {t("رقم الفاتورة (اختياري)", "Invoice No. (Optional)")}
                    </label>
                    <input
                      type="text"
                      value={purchaseInvoice}
                      onChange={(e) => setPurchaseInvoice(e.target.value)}
                      placeholder="INV-..."
                      style={{
                        width: "100%", height: "40px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                        padding: "0 12px", color: "#fff", fontSize: "12.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, color: "#8a7565", marginBottom: "5px" }}>
                      {t("اسم المورد / المحل (اختياري)", "Supplier / Store Name (Optional)")}
                    </label>
                    <input
                      type="text"
                      value={purchaseSupplier}
                      onChange={(e) => setPurchaseSupplier(e.target.value)}
                      placeholder={t("شركة...", "Supplier...")}
                      style={{
                        width: "100%", height: "40px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                        padding: "0 12px", color: "#fff", fontSize: "12.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                {/* Record as Expense Checkbox */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.03)",
                }}>
                  <input
                    type="checkbox"
                    id="recExpense"
                    checked={recordPurchaseExpense}
                    onChange={(e) => setRecordPurchaseExpense(e.target.checked)}
                    style={{ width: "17px", height: "17px", accentColor: "#cca043", cursor: "pointer" }}
                  />
                  <label htmlFor="recExpense" style={{ fontSize: "12px", color: "#f5ede4", cursor: "pointer" }}>
                    {t("تسجيل هذه الفاتورة كمصروف في تقارير الأرباح والمصروفات فوراً", "Record this purchase as an Expense in Financial Reports immediately")}
                  </label>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                  <button
                    onClick={() => setPurchaseItem(null)}
                    style={{
                      flex: 1, height: "44px", borderRadius: "12px",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#b0957e", fontSize: "13px", fontWeight: 800, cursor: "pointer",
                    }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>

                  <button
                    onClick={handleSubmitPurchase}
                    disabled={submittingPurchase || !purchaseQty || !purchasePrice}
                    style={{
                      flex: 2, height: "44px", borderRadius: "12px",
                      background: purchaseSuccess ? "#22c55e" : "#cca043", border: "none",
                      color: "#180e06", fontSize: "13.5px", fontWeight: 900,
                      cursor: submittingPurchase ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                      opacity: (!purchaseQty || !purchasePrice) ? 0.5 : 1,
                    }}
                  >
                    {submittingPurchase ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>{t("جاري التوريد...", "Restocking...")}</span>
                      </>
                    ) : purchaseSuccess ? (
                      <>
                        <Check size={16} />
                        <span>{t("✓ تم التوريد وحساب التكلفة!", "✓ Restocked & WAC Updated!")}</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        <span>{t("تأكيد التوريد وتحديث المخزن", "Confirm Restock")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 4: "تقارير الجرد السابقة الشاملة"
        ══════════════════════════════════════════════════════════════ */}
        {showHistoryModal && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              width: "100%",
              maxWidth: "840px",
              maxHeight: "90vh",
              background: "#160d05",
              border: "1px solid rgba(204, 160, 67, 0.4)",
              borderRadius: "24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.85)",
              color: "#f5ede4",
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(204, 160, 67, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#120a04",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "12px",
                    background: "rgba(204, 160, 67, 0.18)",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#cca043",
                  }}>
                    <History size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>
                      {t("تقرير شامل لفترات الجرد السابقة 📋", "Historical Stock Audit Reports 📋")}
                    </h2>
                    <div style={{ fontSize: "11.5px", color: "#8a7565" }}>
                      {t("أرشيف كامل لجميع جلسات جرد الاستهلاك وتكاليفها التي تم ترحيلها", "Full archive of reconciliation sessions and posted consumption costs")}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowHistoryModal(false)}
                  style={{
                    width: "34px", height: "34px", borderRadius: "10px",
                    background: "rgba(255,255,255,0.06)", border: "none",
                    color: "#8a7565", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Audits List */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {loadingHistory ? (
                  <div style={{ textAlign: "center", padding: "60px", color: "#8a7565" }}>
                    <Loader2 size={36} className="animate-spin" color="#cca043" style={{ margin: "0 auto 12px" }} />
                    <p>{t("جاري تحميل الأرشيف...", "Loading archive...")}</p>
                  </div>
                ) : historyAudits.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "60px", color: "#8a7565" }}>
                    <Scale size={48} style={{ margin: "0 auto 12px auto", opacity: 0.3 }} />
                    <h3 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "17px" }}>{t("لا توجد جلسات جرد مسجلة حتى الآن", "No recorded audit sessions yet")}</h3>
                    <p style={{ margin: 0, fontSize: "13px" }}>{t("اضغط على \"تحديث المخزن (جرد الاستهلاك)\" لإجراء أول جرد", "Click \"Stock Audit (Reconcile)\" to start your first session")}</p>
                  </div>
                ) : (
                  historyAudits.map((audit) => {
                    const isExpanded = expandedAuditId === audit.id;
                    let auditItems: any[] = [];
                    try {
                      auditItems = JSON.parse(audit.items);
                    } catch {
                      // ignore
                    }

                    return (
                      <div
                        key={audit.id}
                        style={{
                          background: "#0d0805",
                          border: "1px solid rgba(204, 160, 67, 0.2)",
                          borderRadius: "16px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                          style={{
                            padding: "16px 20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            background: isExpanded ? "rgba(204, 160, 67, 0.08)" : "transparent",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "15px", fontWeight: 900, color: "#ffffff", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>{audit.title}</span>
                              <span style={{
                                padding: "2px 8px", borderRadius: "6px",
                                background: "rgba(74, 222, 128, 0.15)", color: "#4ade80", fontSize: "10.5px", fontWeight: 800,
                              }}>
                                {t("✓ تم الترحيل للمصروفات", "✓ Posted to Expenses")}
                              </span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "#8a7565", marginTop: "3px" }}>
                              {t("التاريخ:", "Date:")} {audit.periodEnd || audit.createdAt.split("T")[0]} {audit.recordedBy ? `— ${t("بواسطة:", "By:")} ${audit.recordedBy}` : ""} — ({audit.itemsCount} {t("خامة", "Items")})
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ textAlign: dir === "rtl" ? "left" : "right" }}>
                              <div style={{ fontSize: "11px", color: "#8a7565" }}>{t("تكلفة الاستهلاك:", "Consumption Cost:")}</div>
                              <div style={{ fontSize: "17px", fontWeight: 900, color: "#cca043" }}>
                                {audit.totalCost.toLocaleString(lang === "en" ? "en-US" : "ar-EG")} {t("ج.م", "EGP")}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={18} color="#cca043" /> : <ChevronDown size={18} color="#8a7565" />}
                          </div>
                        </div>

                        {/* Expanded Item Breakdown */}
                        {isExpanded && (
                          <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(204, 160, 67, 0.15)", background: "#120a04", overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                              <thead>
                                <tr style={{ color: "#8a7565", textAlign: dir === "rtl" ? "right" : "left", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                  <th style={{ padding: "6px" }}>{t("الخامة", "Material")}</th>
                                  <th style={{ padding: "6px" }}>{t("الرصيد قبل", "Prev Qty")}</th>
                                  <th style={{ padding: "6px" }}>{t("الرصيد بعد", "Actual Qty")}</th>
                                  <th style={{ padding: "6px" }}>{t("المستهلك", "Consumed")}</th>
                                  <th style={{ padding: "6px" }}>{t("متوسط التكلفة", "Avg Cost")}</th>
                                  <th style={{ padding: "6px" }}>{t("التكلفة", "Cost")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {auditItems.map((item: any, idx: number) => (
                                  <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: "8px 6px", fontWeight: 800, color: "#ffffff" }}>
                                      {item.name} <span style={{ fontSize: "10px", color: "#8a7565" }}>({translateUnit(item.unit)})</span>
                                    </td>
                                    <td style={{ padding: "8px 6px", color: "#b0957e" }}>{item.prevQty}</td>
                                    <td style={{ padding: "8px 6px", color: "#cca043", fontWeight: 700 }}>{item.actualQty}</td>
                                    <td style={{ padding: "8px 6px", color: item.consumedQty > 0 ? "#ef4444" : "#4ade80", fontWeight: 800 }}>
                                      {item.consumedQty > 0 ? `-${item.consumedQty}` : "0"} {translateUnit(item.unit)}
                                    </td>
                                    <td style={{ padding: "8px 6px", color: "#8a7565" }}>{item.costPerUnit} {t("ج", "EGP")}</td>
                                    <td style={{ padding: "8px 6px", fontWeight: 900, color: item.totalCost > 0 ? "#ef4444" : "#8a7565" }}>
                                      {item.totalCost?.toLocaleString(lang === "en" ? "en-US" : "ar-EG")} {t("ج", "EGP")}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            MODAL 1: "إضافة / تعديل خامة"
        ══════════════════════════════════════════════════════════════ */}
        {modalItem !== null && (
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
                onClick={() => setModalItem(null)}
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
                  background: "rgba(204, 160, 67, 0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#cca043",
                }}>
                  <Package size={20} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#ffffff" }}>
                    {isNew ? t("إضافة خامة جديدة للمخزن", "Add New Material to Stock") : t("تعديل بيانات الخامة", "Edit Material Details")}
                  </h2>
                  <div style={{ fontSize: "11px", color: "#8a7565" }}>
                    {t("أدخل بيانات الرصيد وسعر التكلفة والحد الأدنى", "Enter balance, unit cost, and minimum alert level")}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("اسم الخامة / الصنف *", "Material / Item Name *")}
                  </label>
                  <input
                    type="text"
                    value={modalItem.name || ""}
                    onChange={(e) => setModalItem({ ...modalItem, name: e.target.value })}
                    placeholder={t("مثلاً: نوتيلا كبير، لوتس، دقيق وافل...", "e.g., Nutella large, Lotus, Waffle flour...")}
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
                      {t("وحدة القياس", "Unit of Measure")}
                    </label>
                    <select
                      value={modalItem.unit || "كيلو"}
                      onChange={(e) => setModalItem({ ...modalItem, unit: e.target.value })}
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 12px", color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box",
                      }}
                    >
                      {COMMON_UNITS.map((u) => (
                        <option key={u} value={u}>{translateUnit(u)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("متوسط التكلفة للوحدة (ج)", "Unit Cost (EGP)")}
                    </label>
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={modalItem.costPerUnit || 0}
                      onChange={(e) => setModalItem({ ...modalItem, costPerUnit: +e.target.value })}
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 12px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("الكمية المتوفرة حالياً", "Current Quantity")}
                    </label>
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={modalItem.quantity ?? 0}
                      onChange={(e) => setModalItem({ ...modalItem, quantity: +e.target.value })}
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 12px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                      {t("الحد الأدنى للتنبيه", "Min Stock Alert Level")}
                    </label>
                    <input
                      type="number"
                      step="any"
                      dir="ltr"
                      value={modalItem.minStock ?? 1}
                      onChange={(e) => setModalItem({ ...modalItem, minStock: +e.target.value })}
                      style={{
                        width: "100%", height: "42px", background: "#0d0805",
                        border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "12px",
                        padding: "0 12px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    onClick={() => setModalItem(null)}
                    style={{
                      flex: 1, height: "44px", borderRadius: "12px",
                      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#b0957e", fontSize: "13px", fontWeight: 800, cursor: "pointer",
                    }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>

                  <button
                    onClick={handleSaveItem}
                    disabled={savingItem}
                    style={{
                      flex: 2, height: "44px", borderRadius: "12px",
                      background: "#cca043", border: "none",
                      color: "#180e06", fontSize: "13.5px", fontWeight: 900,
                      cursor: savingItem ? "wait" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                    }}
                  >
                    {savingItem ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{savingItem ? t("جاري الحفظ...", "Saving...") : isNew ? t("إضافة الخامة", "Add Material") : t("حفظ التعديلات", "Save Changes")}</span>
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
