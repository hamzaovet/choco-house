"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getPermissions, RolePermissions } from "@/lib/permissions";

export interface StaffUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  department?: string;
  avatar?: string;
  username?: string;
}

interface StaffContextType {
  currentUser: StaffUser | null;
  users: StaffUser[];
  setCurrentUser: (user: StaffUser | null) => void;
  switchUserByName: (name: string) => void;
  login: (identifier: string, secret: string, mode?: "phone" | "username") => Promise<{ success: boolean; error?: string; user?: StaffUser }>;
  logout: () => void;
  isAuthenticated: boolean;
  permissions: RolePermissions;
  loading: boolean;
  refreshUsers: () => Promise<void>;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("choco_auth_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const list: StaffUser[] = await res.json();
        setUsers(list);
        const saved = localStorage.getItem("choco_auth_user");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const found = list.find((u) => u.id === parsed.id || u.phone === parsed.phone || (u.username && u.username === parsed.username));
            if (found) {
              setCurrentUser(found);
              localStorage.setItem("choco_auth_user", JSON.stringify(found));
            } else {
              setCurrentUser(parsed);
            }
          } catch {
            // keep existing parsed
          }
        }
      }
    } catch (err) {
      console.error("Failed to load staff users:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();

    const handleAuthChange = () => {
      try {
        const saved = localStorage.getItem("choco_auth_user");
        if (saved) setCurrentUser(JSON.parse(saved));
        else setCurrentUser(null);
      } catch {}
    };

    window.addEventListener("choco_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("choco_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  const login = async (identifier: string, secret: string, mode: "phone" | "username" = "username"): Promise<{ success: boolean; error?: string; user?: StaffUser }> => {
    try {
      const body = mode === "username"
        ? { username: identifier, password: secret }
        : { phone: identifier, pin: secret };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) return { success: false, error: data.error || "فشل تسجيل الدخول" };

      setCurrentUser(data.user);
      localStorage.setItem("choco_auth_user", JSON.stringify(data.user));
      window.dispatchEvent(new CustomEvent("choco_auth_change", { detail: data.user }));
      return { success: true, user: data.user };
    } catch {
      return { success: false, error: "تعذر الاتصال بالخادم" };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("choco_auth_user");
    window.dispatchEvent(new CustomEvent("choco_auth_change", { detail: null }));
  };

  const switchUserByName = (name: string) => {
    const found = users.find((u) => u.name === name);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem("choco_auth_user", JSON.stringify(found));
      window.dispatchEvent(new CustomEvent("choco_auth_change", { detail: found }));
    }
  };

  const handleSetCurrentUser = (user: StaffUser | null) => {
    setCurrentUser(user);
    if (user) localStorage.setItem("choco_auth_user", JSON.stringify(user));
    else localStorage.removeItem("choco_auth_user");
    window.dispatchEvent(new CustomEvent("choco_auth_change", { detail: user }));
  };

  const permissions = getPermissions(currentUser?.role);
  const isAuthenticated = !!currentUser;

  return (
    <StaffContext.Provider
      value={{
        currentUser,
        users,
        setCurrentUser: handleSetCurrentUser,
        switchUserByName,
        login,
        logout,
        isAuthenticated,
        permissions,
        loading,
        refreshUsers: loadUsers,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error("useStaff must be used within StaffProvider");
  return ctx;
}
