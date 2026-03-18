"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { useAlerts } from "@/hooks/useAlerts";
import AlertsPanel from "./AlertsPanel";

export default function AlertButton({ symbol }: { symbol: string }) {
  const user = useStore((s) => s.user);
  const { alerts } = useAlerts();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeCount = alerts.filter((a) => a.symbol === symbol && !a.triggered).length;

  // Request notification permission the first time the popover is opened
  async function handleOpen() {
    setOpen((p) => !p);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      await Notification.requestPermission();
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        title="Price alerts"
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all"
        style={{
          border: `1px solid ${open || activeCount > 0 ? "var(--accent-amber)" : "var(--border)"}`,
          backgroundColor: open || activeCount > 0 ? "rgba(255,179,0,0.12)" : "transparent",
          color: open || activeCount > 0 ? "var(--accent-amber)" : "var(--text-muted)",
        }}
      >
        <Bell size={12} fill={activeCount > 0 ? "currentColor" : "none"} />
        {activeCount > 0 ? activeCount : "Alert"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 rounded-xl p-4 z-50"
          style={{
            width: 320,
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <p className="text-xs font-mono font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
            PRICE ALERTS · {symbol}
          </p>
          <AlertsPanel symbol={symbol} />
        </div>
      )}
    </div>
  );
}
