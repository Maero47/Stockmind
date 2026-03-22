"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "sm_install_dismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 rounded-xl p-4 flex items-center gap-3"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border-bright)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "rgba(0,230,118,0.1)" }}
      >
        <Download size={18} style={{ color: "var(--accent-green)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          Install StockMind
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Add to home screen for a native experience
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
        style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
      >
        Install
      </button>
      <button onClick={handleDismiss} className="p-1 shrink-0" style={{ color: "var(--text-muted)" }}>
        <X size={14} />
      </button>
    </div>
  );
}
