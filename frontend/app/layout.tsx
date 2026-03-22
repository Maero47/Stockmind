import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";
import AuthListener from "@/components/AuthListener";
import PWARegister from "@/components/PWARegister";
import MobileNav from "@/components/layout/MobileNav";
import InstallPrompt from "@/components/InstallPrompt";
import AlertMonitor from "@/components/alerts/AlertMonitor";
import KeyboardShortcutsModal from "@/components/ui/KeyboardShortcutsModal";
import ThemeInitializer from "@/components/ThemeInitializer";

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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=JSON.parse(localStorage.getItem("stockmind-ui")||"{}");if(t&&t.state&&t.state.theme==="light"){document.documentElement.setAttribute("data-theme","light");document.documentElement.style.colorScheme="light"}}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${geist.variable} ${dmMono.variable} antialiased`}>
        <PWARegister />
        <AuthListener />
        <ThemeInitializer />
        <AlertMonitor />
        {children}
        <MobileNav />
        <InstallPrompt />
        <KeyboardShortcutsModal />
      </body>
    </html>
  );
}
