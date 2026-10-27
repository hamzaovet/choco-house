import type { Metadata } from "next";
import { Playfair_Display, Cairo } from "next/font/google";
import "./globals.css";
import { StaffProvider } from "@/context/StaffContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SoundAlertToggle from "@/components/SoundAlertToggle";

/* Playfair Display — for English brand name & CH logo */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

/* Cairo — for crisp, elegant Arabic typography matching Whacka */
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Choco House Desserts | شوكو هاوس للحلويات",
  description: "أشهى الحلويات والوافل والميلك شيك في السادس من أكتوبر - طلب أونلاين وتوصيل سريع",
  icons: {
    icon: "/choco-logo.svg",
    apple: "/choco-logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${playfair.variable} ${cairo.variable}`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[#0d0805] text-[#f5ede4] antialiased selection:bg-[#c8860a] selection:text-white"
        style={{ fontFamily: "var(--font-cairo), system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif" }}
        suppressHydrationWarning
      >
        <LanguageProvider>
          <StaffProvider>
            <div className="flex min-h-screen flex-col justify-between">
              <div>
                <Navbar />
                <main>{children}</main>
              </div>
              <Footer />
            </div>
            <SoundAlertToggle />
          </StaffProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
