"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { playSound } from "@/lib/sounds";
import { Plus, X, Loader2, CircleDollarSign, Calendar } from "lucide-react";

interface Expense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  category: string;
  recordedBy?: string;
  createdAt: string;
}

const CATEGORIES = ["تشغيل", "خامات", "نظافة", "توصيل", "كهرباء وغاز", "رواتب", "أخرى"];

export default function ExpensesPage() {
  const router = useRouter();
  const { isAuthenticated, permissions, loading: authLoading, currentUser } = useStaff();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10), category: CATEGORIES[0],
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !permissions.canViewExpenses) { router.push("/login"); return; }
      load();
    }
  }, [authLoading, isAuthenticated, permissions, router]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    setSaving(true);
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: +form.amount, recordedBy: currentUser?.name }),
      });
      playSound("success");
      setShowForm(false);
      setForm({ description: "", amount: "", expenseDate: new Date().toISOString().slice(0, 10), category: CATEGORIES[0] });
      await load();
    } finally {
      setSaving(false);
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const today = expenses.filter((e) => e.expenseDate === new Date().toISOString().slice(0, 10)).reduce((s, e) => s + e.amount, 0);

  if (authLoading || loading) return <div className="min-h-screen bg-[#0d0805] flex items-center justify-center"><Loader2 className="animate-spin text-[#c8860a]" size={40} /></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-[#0d0805] p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <CircleDollarSign className="text-[#c8860a]" size={24} /> المصروفات
        </h1>
        {permissions.canAddExpense && (
          <button onClick={() => { setShowForm(true); playSound("click"); }}
            className="btn-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-1.5">
            <Plus size={16} /> مصروف جديد
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#1a0f07] border border-[#3d1f0a] rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-red-400">{today.toLocaleString("ar-EG")} ج</div>
          <div className="text-xs text-[#9c7a5e] mt-1">مصروفات اليوم</div>
        </div>
        <div className="bg-[#1a0f07] border border-[#3d1f0a] rounded-2xl p-4 text-center">
          <div className="text-2xl font-black text-[#c8860a]">{total.toLocaleString("ar-EG")} ج</div>
          <div className="text-xs text-[#9c7a5e] mt-1">إجمالي المصروفات</div>
        </div>
      </div>

      {/* List */}
      <div className="bg-[#1a0f07] border border-[#3d1f0a] rounded-2xl overflow-hidden">
        {expenses.length === 0 ? (
          <div className="text-center py-12 text-[#9c7a5e]">لا توجد مصروفات مسجلة</div>
        ) : (
          <div className="divide-y divide-[#3d1f0a]">
            {expenses.map((e) => (
              <div key={e.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{e.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs bg-[#0d0805] border border-[#3d1f0a] px-2 py-0.5 rounded-lg text-[#9c7a5e]">{e.category}</span>
                    <span className="text-xs text-[#9c7a5e] flex items-center gap-1">
                      <Calendar size={11} /> {e.expenseDate}
                    </span>
                  </div>
                </div>
                <span className="font-black text-red-400 text-lg">{e.amount.toLocaleString("ar-EG")} ج</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowForm(false)} />
          <div className="relative bg-[#1a0f07] border border-[#3d1f0a] rounded-3xl p-6 mx-4 max-w-md w-full shadow-2xl animate-fadeIn">
            <button onClick={() => setShowForm(false)} className="absolute top-4 left-4 p-1.5 rounded-xl hover:bg-white/10 text-slate-400"><X size={18} /></button>
            <h3 className="font-black text-white text-lg mb-4">إضافة مصروف</h3>
            <form onSubmit={save} className="space-y-3">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="وصف المصروف *" required
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none" />
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="المبلغ (جنيه) *" required dir="ltr"
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} dir="ltr"
                className="w-full h-10 rounded-xl bg-[#0d0805] border border-[#3d1f0a] focus:border-[#c8860a] px-3 text-white text-sm outline-none" />
              <button type="submit" disabled={saving} className="w-full btn-gold py-3 rounded-xl font-black disabled:opacity-50">
                {saving ? "جاري الحفظ..." : "حفظ المصروف"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
