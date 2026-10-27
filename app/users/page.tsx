"use client";

import React, { useState, useEffect } from "react";
import { useStaff } from "@/context/StaffContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { playSound } from "@/lib/sounds";
import {
  Users, UserPlus, ShoppingBag, Lock, X,
  Trash2, Key, Check, ChevronDown, Eye, EyeOff
} from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  username?: string;
  phone: string;
  role: string;
  department?: string;
}

const ROLES_LIST = [
  { value: "manager",    label: "مدير / Manager" },
  { value: "cashier",    label: "كاشير / Cashier" },
  { value: "chef",       label: "شيف / Chef (مطبخ)" },
  { value: "accountant", label: "محاسب / Accountant" },
];

export default function UsersTeamPage() {
  const { isAuthenticated, currentUser, logout, loading: authLoading } = useStaff();
  const { lang, t, dir } = useLanguage();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"members" | "add">("members");
  const [members, setMembers]     = useState<StaffMember[]>([]);
  const [loading, setLoading]     = useState(true);

  // Team management toggle states
  const [managerCanManage, setManagerCanManage] = useState(true);
  const [cashierCanManage, setCashierCanManage] = useState(false);

  // Password reset modal state
  const [pwdModalUser, setPwdModalUser] = useState<StaffMember | null>(null);
  const [newPassword, setNewPassword]   = useState("");
  const [showPwd, setShowPwd]           = useState(false);
  const [pwdSaving, setPwdSaving]       = useState(false);

  // Add member form state
  const [addForm, setAddForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "manager",
    phone: "",
  });
  const [addSaving, setAddSaving] = useState(false);
  const [feedback, setFeedback]   = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!currentUser && !localStorage.getItem("choco_auth_user")) {
        router.push("/login");
        return;
      }
      if (currentUser && currentUser.role !== "owner" && currentUser.role !== "manager") {
        router.push("/dashboard");
        return;
      }
      loadMembers();
    }
  }, [authLoading, currentUser, router]);

  async function loadMembers() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/users");
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    playSound("click");
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        playSound("success");
        setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: newRole } : m));
      }
    } catch {}
  }

  async function handleDelete(userId: string, memberName: string) {
    if (!confirm(t(`هل أنت متأكد من حذف ${memberName} من الفريق؟`, `Are you sure you want to remove ${memberName} from the team?`))) return;
    playSound("alert");
    try {
      const res = await fetch(`/api/auth/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        playSound("success");
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      }
    } catch {}
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdModalUser || !newPassword.trim()) return;
    setPwdSaving(true);
    try {
      const res = await fetch(`/api/auth/users/${pwdModalUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      if (res.ok) {
        playSound("success");
        setPwdModalUser(null);
        setNewPassword("");
        alert(t("تم تغيير كلمة المرور بنجاح ✅", "Password updated successfully ✅"));
      } else {
        alert(t("حدث خطأ أثناء تغيير كلمة المرور", "Error updating password"));
      }
    } finally {
      setPwdSaving(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.username.trim() || !addForm.password.trim()) {
      setFeedback({ type: "err", text: t("يرجى ملء الاسم واسم المستخدم وكلمة المرور", "Please fill in name, username, and password") });
      return;
    }
    setAddSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          username: addForm.username.trim(),
          password: addForm.password.trim(),
          role: addForm.role,
          phone: addForm.phone.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        playSound("success");
        setAddForm({ name: "", username: "", password: "", role: "manager", phone: "" });
        setFeedback({ type: "ok", text: t("تمت إضافة العضو بنجاح 🎉", "Team member added successfully 🎉") });
        loadMembers();
        setTimeout(() => setActiveTab("members"), 1200);
      } else {
        setFeedback({ type: "err", text: data.error || t("فشل إضافة العضو", "Failed to add member") });
        playSound("alert");
      }
    } catch {
      setFeedback({ type: "err", text: t("تعذر الاتصال بالخادم", "Could not connect to server") });
    } finally {
      setAddSaving(false);
    }
  }

  // Filter members: Manager MUST NOT see Owner!
  const visibleMembers = members.filter((m) => {
    if (currentUser?.role === "manager") {
      return m.role !== "owner";
    }
    return true;
  });

  const getAvatarColor = (role: string) => {
    switch (role) {
      case "owner":      return "#ea580c"; // orange
      case "manager":    return "#0284c7"; // cyan
      case "chef":       return "#0369a1"; // deep blue
      case "accountant": return "#059669"; // emerald
      default:           return "#4f46e5"; // indigo
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":      return t("المالك / Owner", "Owner");
      case "manager":    return t("مدير / Manager", "Manager");
      case "chef":       return t("شيف / Chef", "Chef");
      case "accountant": return t("محاسب / Accountant", "Accountant");
      default:           return t("كاشير / Cashier", "Cashier");
    }
  };

  return (
    <div dir={dir} style={{
      minHeight: "100vh",
      background: "#160d05",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "var(--font-cairo), system-ui, -apple-system, sans-serif",
    }}>

      {/* ── Floating Modal Card — Exact Whacka 1:1 ── */}
      <div style={{
        width: "100%",
        maxWidth: "520px",
        background: "#ffffff",
        borderRadius: "28px",
        padding: "24px 24px 30px",
        boxShadow: "0 24px 72px rgba(0,0,0,0.6)",
        position: "relative",
        boxSizing: "border-box",
      }}>

        {/* Close Button top-left/right */}
        <button
          onClick={() => { playSound("click"); router.push("/dashboard"); }}
          style={{
            position: "absolute",
            top: "22px",
            [dir === "rtl" ? "left" : "right"]: "22px",
            background: "#f4ede4",
            border: "none",
            borderRadius: "100px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 800,
            color: "#6b5849",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#e9dfd3"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#f4ede4"; }}
        >
          {t("إغلاق", "Close")}
        </button>

        {/* ── Modal Header with Gold Round Icon ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "#cca043",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "#ffffff",
          }}>
            <Users size={22} strokeWidth={2.3} />
          </div>
          <div>
            <h2 style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#180e06",
              margin: 0,
              lineHeight: 1.2,
            }}>
              {t("الفريق", "Team")}
            </h2>
            <p style={{
              fontSize: "12.5px",
              color: "#8a7565",
              margin: "3px 0 0 0",
              fontWeight: 600,
            }}>
              {t("إدارة من يمكنه تسجيل الدخول وما يمكنه فعله.", "Manage who can sign in and assign their roles.")}
            </p>
          </div>
        </div>

        {/* ── Horizontal Navigation Tabs (Whacka Replica) ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "#faf8f5",
          padding: "5px",
          borderRadius: "16px",
          marginBottom: "20px",
          border: "1px solid #f0e6da",
        }}>
          {/* 1. Members */}
          <button
            onClick={() => { setActiveTab("members"); playSound("click"); }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "12px",
              border: activeTab === "members" ? "1px solid #cca043" : "none",
              background: activeTab === "members" ? "#ffffff" : "transparent",
              color: activeTab === "members" ? "#180e06" : "#8a7565",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: activeTab === "members" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <Users size={15} color={activeTab === "members" ? "#cca043" : "#8a7565"} />
            {t("الأعضاء", "Members")}
          </button>

          {/* 2. Add People */}
          <button
            onClick={() => { setActiveTab("add"); playSound("click"); }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "12px",
              border: activeTab === "add" ? "1px solid #cca043" : "none",
              background: activeTab === "add" ? "#ffffff" : "transparent",
              color: activeTab === "add" ? "#180e06" : "#8a7565",
              fontSize: "13px",
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: activeTab === "add" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            <UserPlus size={15} color={activeTab === "add" ? "#cca043" : "#8a7565"} />
            {t("إضافة أشخاص", "Add People")}
          </button>

          {/* 3. Orders Link */}
          <button
            onClick={() => { playSound("click"); router.push("/cashier"); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: "#8a7565",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <ShoppingBag size={15} />
            {t("الطلبات", "Orders")}
          </button>

          {/* 4. Logout */}
          <button
            onClick={() => { playSound("click"); logout(); router.push("/"); }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "8px 10px",
              borderRadius: "12px",
              border: "none",
              background: "transparent",
              color: "#dc2626",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
            title={t("تسجيل الخروج", "Logout")}
          >
            <Lock size={13} />
          </button>
        </div>

        {/* ── TAB CONTENT ── */}
        {activeTab === "members" && (
          <div>
            {/* Section 1: "يمكنهم إدارة الفريق" */}
            <div style={{
              background: "#faf8f5",
              border: "1px solid #f0e6da",
              borderRadius: "18px",
              padding: "16px 18px",
              marginBottom: "18px",
            }}>
              <p style={{
                fontSize: "13px",
                fontWeight: 900,
                color: "#180e06",
                margin: "0 0 12px 0",
              }}>
                {t("يمكنهم إدارة الفريق", "Can manage team")}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Manager Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => { setManagerCanManage(!managerCanManage); playSound("click"); }}
                      style={{
                        width: "44px",
                        height: "25px",
                        borderRadius: "100px",
                        background: managerCanManage ? "#cca043" : "#d1d5db",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background 0.2s ease",
                        padding: "2px",
                      }}
                    >
                      <div style={{
                        width: "21px",
                        height: "21px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        transform: managerCanManage ? (dir === "rtl" ? "translateX(-19px)" : "translateX(19px)") : "translateX(0)",
                        transition: "transform 0.2s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                    <Users size={15} color="#8a7565" />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#180e06" }}>
                    {t("مدير / Manager", "Manager")}
                  </span>
                </div>

                {/* Cashier Toggle */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => { setCashierCanManage(!cashierCanManage); playSound("click"); }}
                      style={{
                        width: "44px",
                        height: "25px",
                        borderRadius: "100px",
                        background: cashierCanManage ? "#cca043" : "#e5e7eb",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        transition: "background 0.2s ease",
                        padding: "2px",
                      }}
                    >
                      <div style={{
                        width: "21px",
                        height: "21px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        transform: cashierCanManage ? (dir === "rtl" ? "translateX(-19px)" : "translateX(19px)") : "translateX(0)",
                        transition: "transform 0.2s ease",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }} />
                    </button>
                    <Users size={15} color="#8a7565" />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#180e06" }}>
                    {t("كاشير / Cashier", "Cashier")}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Members List */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8a7565" }}>
                <p>{t("جاري تحميل الفريق...", "Loading team members...")}</p>
              </div>
            ) : (
              <div style={{
                background: "#faf8f5",
                border: "1px solid #f0e6da",
                borderRadius: "18px",
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}>
                {visibleMembers.map((m) => {
                  const isOwner = m.role === "owner";
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 8px",
                        borderBottom: "1px solid #f0e6da",
                      }}
                    >
                      {/* Left: Role Pill or Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isOwner ? (
                          <span style={{
                            fontSize: "12px",
                            fontWeight: 800,
                            color: "#b45309",
                            background: "#fef3c7",
                            border: "1px solid #fde68a",
                            padding: "4px 12px",
                            borderRadius: "100px",
                          }}>
                            {t("المالك", "Owner")}
                          </span>
                        ) : (
                          <>
                            {/* Role selector pill with gold border */}
                            <div style={{ position: "relative" }}>
                              <select
                                value={m.role}
                                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                                style={{
                                  appearance: "none",
                                  WebkitAppearance: "none",
                                  background: "#ffffff",
                                  border: "1.5px solid #cca043",
                                  borderRadius: "100px",
                                  padding: dir === "rtl" ? "5px 22px 5px 12px" : "5px 12px 5px 22px",
                                  fontSize: "12px",
                                  fontWeight: 800,
                                  color: "#180e06",
                                  cursor: "pointer",
                                  outline: "none",
                                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                                }}
                              >
                                {ROLES_LIST.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <ChevronDown size={11} color="#cca043" style={{
                                position: "absolute",
                                [dir === "rtl" ? "left" : "right"]: "8px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none"
                              }} />
                            </div>

                            {/* Delete User Button */}
                            <button
                              onClick={() => handleDelete(m.id, m.name)}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: "1px solid #fee2e2",
                                background: "#fff",
                                color: "#ef4444",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title={t("حذف من الفريق", "Remove from team")}
                            >
                              <Trash2 size={13} />
                            </button>

                            {/* Change Password Button */}
                            <button
                              onClick={() => { setPwdModalUser(m); setNewPassword(""); }}
                              style={{
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                border: "1px solid #f0e6da",
                                background: "#fff",
                                color: "#8a7565",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              title={t("تغيير كلمة المرور", "Change password")}
                            >
                              <Key size={13} />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Right: Avatar + User Info */}
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ textAlign: dir === "rtl" ? "right" : "left" }}>
                          <p style={{
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "#180e06",
                            margin: 0,
                            lineHeight: 1.2,
                          }}>
                            {isOwner ? "Owner" : m.name}
                          </p>
                          <p style={{
                            fontSize: "11px",
                            color: "#8a7565",
                            margin: "2px 0 0 0",
                            fontFamily: "monospace",
                          }}>
                            {m.username || m.phone}
                          </p>
                        </div>

                        {/* Smiley Avatar */}
                        <div style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: getAvatarColor(m.role),
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                        }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: ADD PEOPLE ── */}
        {activeTab === "add" && (
          <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#180e06", margin: "0 0 4px 0" }}>
              {t("➕ إضافة عضو جديد للفريق", "➕ Add New Team Member")}
            </h3>

            {feedback && (
              <div style={{
                padding: "10px 14px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 700,
                background: feedback.type === "ok" ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${feedback.type === "ok" ? "#bbf7d0" : "#fecaca"}`,
                color: feedback.type === "ok" ? "#16a34a" : "#dc2626",
              }}>
                {feedback.text}
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#3a2010", marginBottom: "5px" }}>
                {t("اسم الموظف *", "Staff Name *")}
              </label>
              <input
                type="text"
                placeholder={t("مثال: أسامة شوكو", "e.g., Osama")}
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
                style={{
                  width: "100%", height: "44px", borderRadius: "12px",
                  border: "1.5px solid #e5dac9", padding: "0 14px",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#3a2010", marginBottom: "5px" }}>
                {t("اسم المستخدم للدخول (Username) *", "Username *")}
              </label>
              <input
                type="text"
                placeholder={t("مثال: osama", "e.g., osama")}
                value={addForm.username}
                onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                required
                dir="ltr"
                style={{
                  width: "100%", height: "44px", borderRadius: "12px",
                  border: "1.5px solid #e5dac9", padding: "0 14px",
                  fontSize: "14px", outline: "none", boxSizing: "border-box", fontFamily: "monospace",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#3a2010", marginBottom: "5px" }}>
                {t("كلمة المرور *", "Password *")}
              </label>
              <input
                type="password"
                placeholder={t("كلمة مرور الدخول", "Login Password")}
                value={addForm.password}
                onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                required
                dir="ltr"
                style={{
                  width: "100%", height: "44px", borderRadius: "12px",
                  border: "1.5px solid #e5dac9", padding: "0 14px",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#3a2010", marginBottom: "5px" }}>
                {t("الدور الوظيفي والصلاحيات *", "Role & Permissions *")}
              </label>
              <select
                value={addForm.role}
                onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                style={{
                  width: "100%", height: "44px", borderRadius: "12px",
                  border: "1.5px solid #e5dac9", padding: "0 14px",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                  fontFamily: "var(--font-cairo), system-ui, sans-serif",
                }}
              >
                {ROLES_LIST.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 800, color: "#3a2010", marginBottom: "5px" }}>
                {t("رقم الموبايل (اختياري)", "Phone Number (Optional)")}
              </label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={addForm.phone}
                onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                dir="ltr"
                style={{
                  width: "100%", height: "44px", borderRadius: "12px",
                  border: "1.5px solid #e5dac9", padding: "0 14px",
                  fontSize: "14px", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={addSaving}
              style={{
                width: "100%", height: "48px",
                background: "#cca043",
                color: "#ffffff",
                fontWeight: 800, fontSize: "15px",
                borderRadius: "100px",
                border: "none", cursor: addSaving ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(204,160,67,0.35)",
                marginTop: "6px",
              }}
            >
              {addSaving ? t("جاري الإضافة...", "Adding...") : t("حفظ وإضافة العضو", "Save & Add Member")}
            </button>
          </form>
        )}
      </div>

      {/* ── PASSWORD RESET QUICK MODAL ── */}
      {pwdModalUser && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 60,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
        }}>
          <div style={{
            width: "100%", maxWidth: "380px",
            background: "#ffffff", borderRadius: "24px",
            padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            position: "relative",
          }}>
            <button
              onClick={() => setPwdModalUser(null)}
              style={{
                position: "absolute", top: "16px", [dir === "rtl" ? "left" : "right"]: "16px",
                background: "none", border: "none", cursor: "pointer", color: "#8a7565",
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#180e06", margin: "0 0 6px 0" }}>
              {t(`تغيير كلمة مرور ${pwdModalUser.name}`, `Change Password for ${pwdModalUser.name}`)}
            </h3>
            <p style={{ fontSize: "12px", color: "#8a7565", margin: "0 0 16px 0" }}>
              {t("اسم المستخدم:", "Username:")} <strong>{pwdModalUser.username}</strong>
            </p>

            <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type={showPwd ? "text" : "password"}
                  placeholder={t("كلمة المرور الجديدة", "New Password")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                  dir="ltr"
                  style={{
                    width: "100%", height: "44px", borderRadius: "12px",
                    border: "1.5px solid #cca043", padding: "0 40px 0 14px",
                    fontSize: "14px", outline: "none", boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: "absolute",
                    [dir === "rtl" ? "left" : "right"]: "12px",
                    top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#8a7565",
                  }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="submit"
                  disabled={pwdSaving}
                  style={{
                    flex: 1, height: "42px",
                    background: "#cca043", color: "#ffffff",
                    fontWeight: 800, fontSize: "14px",
                    borderRadius: "100px", border: "none", cursor: "pointer",
                  }}
                >
                  {pwdSaving ? t("جاري الحفظ...", "Saving...") : t("حفظ كلمة المرور", "Save Password")}
                </button>
                <button
                  type="button"
                  onClick={() => setPwdModalUser(null)}
                  style={{
                    padding: "0 18px", height: "42px",
                    background: "#f4ede4", color: "#6b5849",
                    fontWeight: 700, fontSize: "13px",
                    borderRadius: "100px", border: "none", cursor: "pointer",
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
  );
}
