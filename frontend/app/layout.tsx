import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";
import AuthListener from "@/components/AuthListener";
import PWARegister from "@/components/PWARegister";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "StockMind AI — Intelligent Market Analysis",
  description:
    "AI-powered stock and crypto analysis. Bring your own API key. Real-time data, technical indicators, and ML predictions.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StockMind",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${dmMono.variable} antialiased`}>
        <PWARegister />
        <AuthListener />
        {children}
      </body>
    </html>
  );
}
