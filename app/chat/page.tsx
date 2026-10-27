"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStaff } from "@/context/StaffContext";
import { playSound } from "@/lib/sounds";
import { Plus, X, Loader2, MessageCircle, Send } from "lucide-react";

interface Message {
  id: string;
  senderName: string;
  senderRole?: string;
  text: string;
  createdAt: string;
}

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, permissions, loading: authLoading, currentUser } = useStaff();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !permissions.canViewChat) { router.push("/login"); return; }
      loadMessages();
      const t = setInterval(loadMessages, 8000);
      return () => clearInterval(t);
    }
  }, [authLoading, isAuthenticated, permissions, router]);

  async function loadMessages() {
    const res = await fetch("/api/chat?isStaffView=1");
    const data = await res.json();
    if (Array.isArray(data)) {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setLoading(false);
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    setSending(true);
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderRole: currentUser.role,
          text: text.trim(),
        }),
      });
      playSound("chat");
      setText("");
      await loadMessages();
    } finally {
      setSending(false);
    }
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: "text-[#c8860a]",
    cashier: "text-blue-400",
    chef: "text-orange-400",
    accountant: "text-emerald-400",
  };

  if (authLoading || loading) return <div className="min-h-screen bg-[#0d0805] flex items-center justify-center"><Loader2 className="animate-spin text-[#c8860a]" size={40} /></div>;

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-[#0d0805]">
      <div className="p-4 border-b border-[#3d1f0a] bg-[#120a04] flex items-center gap-3">
        <MessageCircle className="text-[#c8860a]" size={22} />
        <div>
          <h1 className="font-black text-white">شات الفريق 💬</h1>
          <p className="text-xs text-[#9c7a5e]">التواصل الداخلي بين موظفي Choco House</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderName === currentUser?.name;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 ${isMe ? "bg-[#c8860a] text-[#0d0805]" : "bg-[#1a0f07] border border-[#3d1f0a] text-white"}`}>
                {!isMe && (
                  <p className={`text-[10px] font-bold mb-1 ${ROLE_COLORS[msg.senderRole || ""] || "text-[#9c7a5e]"}`}>
                    {msg.senderName}
                  </p>
                )}
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-[#0d0805]/60" : "text-[#9c7a5e]"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-[#3d1f0a] bg-[#120a04] flex gap-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة..."
          className="flex-1 h-11 rounded-xl bg-[#1a0f07] border border-[#3d1f0a] focus:border-[#c8860a] px-4 text-white text-sm outline-none transition-colors" />
        <button type="submit" disabled={sending || !text.trim()}
          className="btn-gold w-11 h-11 rounded-xl flex items-center justify-center disabled:opacity-50">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
