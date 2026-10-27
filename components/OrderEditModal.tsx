"use client";

import React, { useState, useEffect } from "react";
import { playSound } from "@/lib/sounds";
import { 
  X, Plus, Minus, Trash2, Edit3, ShoppingBag, 
  MapPin, Phone, FileText, Check, Loader2, Printer, 
  AlertTriangle, DollarSign
} from "lucide-react";

interface OrderItem {
  productId?: string;
  nameAr?: string;
  nameEn?: string;
  qty: number;
  unitPrice: number;
  extras?: string[];
}

interface Product {
  id: string;
  nameAr: string;
  nameEn?: string;
  price: number;
  category?: string;
}

interface OrderEditModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: (updated: any) => void;
  onPrintReceipt?: (order: any) => void;
  lang?: "ar" | "en";
}

export default function OrderEditModal({
  order,
  isOpen,
  onClose,
  onOrderUpdated,
  onPrintReceipt,
  lang = "ar",
}: OrderEditModalProps) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [deliveryFee, setDeliveryFee] = useState<number>(15);
  const [deposit, setDeposit] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedOrder, setSavedOrder] = useState<any>(null);

  // Sync state when order opens
  useEffect(() => {
    if (order && isOpen) {
      let parsed: OrderItem[] = [];
      try {
        parsed = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      } catch {
        parsed = [];
      }
      setItems(Array.isArray(parsed) ? parsed : []);
      setDeliveryFee(order.deliveryFee ?? 15);
      setDeposit(order.deposit ?? 0);
      setNotes(order.notes ?? "");
      setAddress(order.address ?? "");
      setPhone(order.phone ?? "");
      setCustomerName(order.customerName ?? "");
      setSavedSuccess(false);
      setSavedOrder(null);
    }
  }, [order, isOpen]);

  // Load menu products for adding to order
  useEffect(() => {
    if (isOpen) {
      fetch("/api/products")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setAvailableProducts(data);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  // Real-time recalculations
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const total = subtotal + Number(deliveryFee || 0);
  const remaining = Math.max(0, total - Number(deposit || 0));

  function handleQtyChange(index: number, delta: number) {
    playSound("click");
    setItems((prev) => {
      const next = [...prev];
      const newQty = next[index].qty + delta;
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index);
      }
      next[index] = { ...next[index], qty: newQty };
      return next;
    });
  }

  function handleRemoveItem(index: number) {
    playSound("click");
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddItem() {
    if (!selectedProductId) return;
    const prod = availableProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;

    playSound("click");
    setItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === prod.id || item.nameAr === prod.nameAr);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].qty += 1;
        return next;
      }
      return [
        ...prev,
        {
          productId: prod.id,
          nameAr: prod.nameAr,
          nameEn: prod.nameEn || prod.nameAr,
          qty: 1,
          unitPrice: prod.price,
        },
      ];
    });
    setSelectedProductId("");
  }

  async function handleSave() {
    if (items.length === 0) {
      alert(lang === "en" ? "Order must contain at least 1 item" : "يجب أن يحتوي الطلب على صنف واحد على الأقل");
      return;
    }

    setSaving(true);
    playSound("click");
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          subtotal,
          deliveryFee: Number(deliveryFee),
          total,
          deposit: Number(deposit),
          remaining,
          notes,
          address,
          phone,
          customerName,
          isEdited: true,
          editNote: "تم تعديل الأصناف والحسابات من شاشة التحكم",
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        playSound("success");
        setSavedSuccess(true);
        setSavedOrder(updated);
        onOrderUpdated(updated);
      } else {
        alert(lang === "en" ? "Failed to save updates" : "فشل في حفظ التعديلات");
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          backgroundColor: "#160d05",
          border: "1px solid rgba(204, 160, 67, 0.35)",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 60px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#1c1107",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                background: "rgba(204, 160, 67, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#cca043",
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16.5px", fontWeight: 900, color: "#ffffff" }}>
                تعديل الأوردر #{order.orderNumber}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#8a7565" }}>
                العميل: {order.customerName} ({order.phone})
              </p>
            </div>
          </div>

          <button
            onClick={() => { playSound("click"); onClose(); }}
            style={{
              background: "transparent",
              border: "none",
              color: "#8a7565",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {savedSuccess && (
            <div
              style={{
                background: "rgba(34, 197, 94, 0.15)",
                border: "1px solid #22c55e",
                borderRadius: "14px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "#4ade80",
                fontSize: "13.5px",
                fontWeight: 800,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Check size={18} />
                <span>تم تحديث الأوردر والحسابات بنجاح! جاهز لطباعة الريسيت المعدل.</span>
              </div>
              {onPrintReceipt && savedOrder && (
                <button
                  onClick={() => onPrintReceipt(savedOrder)}
                  style={{
                    background: "#22c55e",
                    color: "#052e16",
                    border: "none",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontWeight: 900,
                    fontSize: "12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <Printer size={14} />
                  <span>طباعة الريسيت الآن</span>
                </button>
              )}
            </div>
          )}

          {/* Section 1: Items List & Quantity Controls */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: 900, color: "#cca043" }}>
                أصناف الطلب ({items.length})
              </span>
              <span style={{ fontSize: "12px", color: "#8a7565" }}>
                المجموع الجزئي: <strong>{subtotal} ج.م</strong>
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#ffffff" }}>
                      {item.nameAr || item.nameEn || "صنف"}
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#cca043" }}>
                      {item.unitPrice} ج.م للقطعة × {item.qty} = <strong>{item.unitPrice * item.qty} ج.م</strong>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => handleQtyChange(idx, -1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={14} />
                    </button>
                    <span style={{ fontWeight: 900, fontSize: "14px", minWidth: "22px", textAlign: "center" }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => handleQtyChange(idx, 1)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: "#cca043",
                        border: "none",
                        color: "#180e06",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(idx)}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "none",
                        color: "#ef4444",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: "4px",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Item from Menu */}
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                gap: "8px",
              }}
            >
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                style={{
                  flex: 1,
                  height: "38px",
                  background: "#0d0805",
                  border: "1px solid rgba(204, 160, 67, 0.3)",
                  borderRadius: "10px",
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: "12.5px",
                }}
              >
                <option value="">+ اختر صنفاً لإضافته للطلب من المنيو...</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameAr} ({p.price} ج.م)
                  </option>
                ))}
              </select>

              <button
                onClick={handleAddItem}
                disabled={!selectedProductId}
                style={{
                  background: selectedProductId ? "#cca043" : "rgba(255,255,255,0.08)",
                  color: selectedProductId ? "#180e06" : "#666",
                  border: "none",
                  borderRadius: "10px",
                  padding: "0 14px",
                  fontWeight: 900,
                  fontSize: "12.5px",
                  cursor: selectedProductId ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Plus size={15} />
                <span>إضافة</span>
              </button>
            </div>
          </div>

          {/* Section 2: Financials & Delivery Fee */}
          <div
            style={{
              background: "rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "14px",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <label style={{ fontSize: "11px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                مصاريف التوصيل (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "34px",
                  background: "#160d05",
                  border: "1px solid rgba(204, 160, 67, 0.3)",
                  borderRadius: "8px",
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                المدفوع مقدماً / العربون (ج.م)
              </label>
              <input
                type="number"
                min="0"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
                style={{
                  width: "100%",
                  height: "34px",
                  background: "#160d05",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "#cca043", display: "block", marginBottom: "4px", fontWeight: 800 }}>
                الإجمالي الجديد المطلوب
              </label>
              <div
                style={{
                  height: "34px",
                  background: "rgba(204, 160, 67, 0.15)",
                  border: "1px solid #cca043",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  padding: "0 10px",
                  color: "#e6c37a",
                  fontSize: "15px",
                  fontWeight: 900,
                }}
              >
                {total} ج.م
              </div>
            </div>
          </div>

          {/* Section 3: Customer Details & Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11.5px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                عنوان التوصيل
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: "100%",
                  height: "34px",
                  background: "#0d0805",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: "12.5px",
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "11.5px", color: "#8a7565", display: "block", marginBottom: "4px" }}>
                ملاحظات الطلب الخاصة
              </label>
              <input
                type="text"
                placeholder="أي طلب خاص (زيادة صوص، بدون مكسرات، إلخ...)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  height: "34px",
                  background: "#0d0805",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  padding: "0 10px",
                  color: "#ffffff",
                  fontSize: "12.5px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#1c1107",
          }}
        >
          <button
            onClick={() => { playSound("click"); onClose(); }}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#8a7565",
              borderRadius: "10px",
              padding: "9px 18px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: savedSuccess ? "#22c55e" : "#cca043",
              color: "#180e06",
              border: "none",
              borderRadius: "10px",
              padding: "10px 22px",
              fontSize: "13.5px",
              fontWeight: 900,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(204, 160, 67, 0.35)",
            }}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : savedSuccess ? (
              <>
                <Check size={16} />
                <span>تم الحفظ بنجاح!</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>حفظ التعديلات وتحديث الريسيت</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
