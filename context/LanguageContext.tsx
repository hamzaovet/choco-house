"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "ar" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  dir: "rtl" | "ltr";
  t: (ar: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  toggleLang: () => {},
  dir: "rtl",
  t: (ar, en) => ar,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  useEffect(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem("choco_lang") as Language;
    if (saved === "ar" || saved === "en") {
      setLangState(saved);
      document.documentElement.dir = saved === "en" ? "ltr" : "rtl";
      document.documentElement.lang = saved;
    }

    const handleCustomChange = (e: any) => {
      const next = e?.detail || localStorage.getItem("choco_lang");
      if (next === "ar" || next === "en") {
        setLangState(next);
        document.documentElement.dir = next === "en" ? "ltr" : "rtl";
        document.documentElement.lang = next;
      }
    };

    window.addEventListener("choco_lang_change", handleCustomChange);
    return () => window.removeEventListener("choco_lang_change", handleCustomChange);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    localStorage.setItem("choco_lang", next);
    document.documentElement.dir = next === "en" ? "ltr" : "rtl";
    document.documentElement.lang = next;
    window.dispatchEvent(new CustomEvent("choco_lang_change", { detail: next }));
  };

  const toggleLang = () => {
    setLang(lang === "ar" ? "en" : "ar");
  };

  const t = (ar: string, en: string) => (lang === "en" ? en : ar);

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, dir: lang === "en" ? "ltr" : "rtl", t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
