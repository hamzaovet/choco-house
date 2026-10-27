"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { playSound } from "@/lib/sounds";
import ErpLayout from "@/components/ErpLayout";
import ImageUploader from "@/components/ImageUploader";
import {
  UtensilsCrossed, Plus, X, Pencil, Trash2, Eye, EyeOff,
  Sparkles, Gift, Check, Loader2
} from "lucide-react";

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  category: string;
  basePrice: number;
  image?: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

const CATEGORIES = ["وافل", "تشيز كيك", "بان كيك", "ميلك شيك", "سموزي", "بوبا"];

export default function MenuAdminPage() {
  const router = useRouter();
  const { isAuthenticated, currentUser, permissions, loading: authLoading } = useStaff();
  const { lang, t, dir } = useLanguage();

  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterCat, setFilterCat]     = useState("الكل");
  const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving]           = useState(false);

  const translateCategory = (cat: string) => {
    if (lang !== "en") return cat;
    const map: Record<string, string> = {
      "الكل": "All",
      "وافل": "Waffles",
      "تشيز كيك": "Cheesecake",
      "بان كيك": "Pancakes",
      "ميلك شيك": "Milkshakes",
      "سموزي": "Smoothies",
      "بوبا": "Boba",
    };
    return map[cat] || cat;
  };

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      loadProducts();
    }
  }, [authLoading, currentUser, router]);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability(p: Product) {
    playSound("click");
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      if (res.ok) {
        setProducts((prev) => prev.map((it) => it.id === p.id ? { ...it, isAvailable: !it.isAvailable } : it));
      }
    } catch {}
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editProduct?.nameAr || !editProduct?.category) return;
    setSaving(true);
    try {
      const method = editProduct.id ? "PATCH" : "POST";
      const url    = editProduct.id ? `/api/products/${editProduct.id}` : "/api/products";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProduct),
      });

      if (res.ok) {
        playSound("success");
        setEditProduct(null);
        loadProducts();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(p: Product) {
    if (!confirm(t(`هل أنت متأكد من حذف ${p.nameAr}؟`, `Are you sure you want to delete ${p.nameEn || p.nameAr}?`))) return;
    playSound("alert");
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((it) => it.id !== p.id));
      }
    } catch {}
  }

  const filtered = filterCat === "الكل" ? products : products.filter((p) => p.category === filterCat);

  return (
    <ErpLayout activeItem="menu">
      <div>
        {/* ── Page Header ── */}
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
              {t("المنيو والأسعار 🍫", "Menu & Prices 🍫")}
            </h1>
            <p style={{
              fontSize: "13.5px",
              color: "#8a7565",
              margin: 0,
              fontWeight: 600,
            }}>
              {t("إدارة وتعديل أصناف المنيو، الأسعار، والإتاحة لحظياً", "Manage menu items, prices, and instant availability")}
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => { playSound("click"); router.push("/offers-admin"); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "rgba(204, 160, 67, 0.12)",
                border: "1px solid rgba(204, 160, 67, 0.35)",
                color: "#cca043",
                padding: "9px 16px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Gift size={15} color="#cca043" />
              <span>{t("إدارة العروض الخاصة", "Special Offers")}</span>
            </button>

            <button
              onClick={() => {
                setEditProduct({
                  nameAr: "",
                  nameEn: "",
                  category: CATEGORIES[0],
                  basePrice: 160,
                  isAvailable: true,
                  sortOrder: 0,
                });
                playSound("click");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                background: "#cca043",
                color: "#180e06",
                padding: "9px 18px",
                borderRadius: "12px",
                border: "none",
                fontSize: "13.5px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(204, 160, 67, 0.3)",
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>{t("منتج جديد +", "+ New Item")}</span>
            </button>
          </div>
        </div>

        {/* ── Category Filter Pills ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "10px",
          marginBottom: "24px",
        }}>
          {["الكل", ...CATEGORIES].map((c) => {
            const isSelected = filterCat === c;
            return (
              <button
                key={c}
                onClick={() => { setFilterCat(c); playSound("click"); }}
                style={{
                  padding: "8px 18px",
                  borderRadius: "100px",
                  border: isSelected ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected ? "#cca043" : "rgba(255, 255, 255, 0.04)",
                  color: isSelected ? "#180e06" : "#b0957e",
                  fontSize: "13px",
                  fontWeight: isSelected ? 900 : 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {translateCategory(c)}
              </button>
            );
          })}
        </div>

        {/* ── Products Grid ── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px", color: "#8a7565" }}>
            <p>{t("جاري تحميل المنيو...", "Loading menu...")}</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "18px",
          }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "rgba(24, 13, 7, 0.85)",
                  border: "1px solid rgba(204, 160, 67, 0.18)",
                  borderRadius: "18px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  opacity: p.isAvailable ? 1 : 0.6,
                  transition: "all 0.2s ease",
                }}
              >
                {/* Product Image */}
                <div style={{
                  width: "100%",
                  height: "150px",
                  background: "#180d06",
                  position: "relative",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{ position: "absolute", fontSize: "40px", opacity: 0.35 }}>🍫</div>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.nameAr}
                      style={{ width: "100%", height: "100%", objectFit: "cover", position: "relative", zIndex: 1 }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}

                  {/* Category Pill Tag */}
                  <span style={{
                    position: "absolute",
                    top: "10px",
                    [dir === "rtl" ? "right" : "left"]: "10px",
                    background: "rgba(18, 10, 5, 0.85)",
                    border: "1px solid rgba(204, 160, 67, 0.3)",
                    padding: "3px 10px",
                    borderRadius: "100px",
                    color: "#cca043",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}>
                    {translateCategory(p.category)}
                  </span>
                </div>

                {/* Body Details */}
                <div style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  justifyContent: "space-between",
                }}>
                  <div>
                    <h3 style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: "#ffffff",
                      margin: "0 0 4px 0",
                      lineHeight: 1.3,
                    }}>
                      {lang === "en" ? (p.nameEn || p.nameAr) : p.nameAr}
                    </h3>
                    <p style={{
                      fontSize: "12px",
                      color: "#8a7565",
                      margin: "0 0 10px 0",
                      fontFamily: "monospace",
                    }}>
                      {lang === "en" ? p.nameAr : (p.nameEn || p.category)}
                    </p>
                    <div style={{ fontSize: "18px", color: "#cca043", fontWeight: 900 }}>
                      {p.basePrice} <span style={{ fontSize: "13px" }}>{t("ج", "EGP")}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "14px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                  }}>
                    {/* Availability toggle */}
                    <button
                      onClick={() => toggleAvailability(p)}
                      style={{
                        flex: 1,
                        height: "36px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: 800,
                        background: p.isAvailable ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: p.isAvailable ? "#4ade80" : "#f87171",
                      }}
                    >
                      {p.isAvailable ? <><Eye size={13} /> {t("متاح", "Available")}</> : <><EyeOff size={13} /> {t("مخفي", "Hidden")}</>}
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => { setEditProduct(p); playSound("click"); }}
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "#f5ede4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                      title={t("تعديل", "Edit")}
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => deleteProduct(p)}
                      style={{
                        width: "36px",
                        height: "36px",
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
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Add / Edit Product Modal ── */}
        {editProduct !== null && (
          <div style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}>
            <div style={{
              width: "100%",
              maxWidth: "440px",
              background: "#1a0f07",
              border: "1px solid rgba(204, 160, 67, 0.3)",
              borderRadius: "24px",
              padding: "26px",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              position: "relative",
            }}>
              <button
                onClick={() => setEditProduct(null)}
                style={{
                  position: "absolute", top: "18px", [dir === "rtl" ? "left" : "right"]: "18px",
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: "10px", padding: "6px", cursor: "pointer", color: "#8a7565",
                }}
              >
                <X size={18} />
              </button>

              <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#ffffff", margin: "0 0 18px 0" }}>
                {editProduct.id ? t("✏️ تعديل صنف", "✏️ Edit Item") : t("➕ إضافة صنف جديد", "➕ Add New Item")}
              </h3>

              <form onSubmit={saveProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("اسم الصنف بالعربي *", "Arabic Name *")}
                  </label>
                  <input
                    type="text"
                    value={editProduct.nameAr || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, nameAr: e.target.value })}
                    required
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 14px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("اسم الصنف بالإنجليزي", "English Name")}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editProduct.nameEn || ""}
                    onChange={(e) => setEditProduct({ ...editProduct, nameEn: e.target.value })}
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 14px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("التصنيف *", "Category *")}
                  </label>
                  <select
                    value={editProduct.category || CATEGORIES[0]}
                    onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 14px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{translateCategory(cat)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#b0957e", marginBottom: "5px" }}>
                    {t("السعر (جنيه) *", "Price (EGP) *")}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={editProduct.basePrice || 0}
                    onChange={(e) => setEditProduct({ ...editProduct, basePrice: +e.target.value })}
                    required
                    style={{
                      width: "100%", height: "42px", background: "#0d0805",
                      border: "1px solid rgba(204, 160, 67, 0.25)", borderRadius: "10px",
                      padding: "0 14px", color: "#fff", fontSize: "13.5px", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <ImageUploader
                  label={t("صورة المنتج (رفع مباشر عبر ImgBB)", "Product Image (Direct ImgBB Upload)")}
                  value={editProduct.image || ""}
                  onChange={(url) => setEditProduct({ ...editProduct, image: url })}
                />

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1, height: "44px",
                      background: "#cca043", color: "#180e06",
                      fontWeight: 900, fontSize: "14px",
                      borderRadius: "12px", border: "none", cursor: "pointer",
                    }}
                  >
                    {saving ? t("جاري الحفظ...", "Saving...") : t("حفظ الصنف 🍫", "Save Item 🍫")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditProduct(null)}
                    style={{
                      padding: "0 18px", height: "44px",
                      background: "rgba(255,255,255,0.06)", color: "#b0957e",
                      fontWeight: 700, fontSize: "13px",
                      borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                    }}
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErpLayout>
  );
}
