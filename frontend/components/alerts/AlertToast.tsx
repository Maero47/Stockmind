"use client";

import { useEffect, useState } from "react";
import { Bell, X, ArrowUp, ArrowDown } from "lucide-react";

export interface AlertToastData {
  id: number;
  symbol: string;
  direction: "above" | "below";
  target_price: number;
  livePrice: number;
}

interface Props {
  toast: AlertToastData | null;
  onClose: () => void;
}

export default function AlertToast({ toast, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, 8000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isAbove = toast.direction === "above";

  return (
    <div
      className="fixed top-20 right-4 z-[9999] transition-all duration-300"
      style={{
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex items-start gap-3 p-4 rounded-xl shadow-2xl"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: `1px solid ${isAbove ? "var(--accent-green)" : "var(--accent-red)"}`,
          minWidth: 280,
          maxWidth: 340,
        }}
      >
        {/* Icon */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isAbove ? "rgba(0,230,118,0.15)" : "rgba(255,61,87,0.15)",
          }}
        >
          {isAbove
            ? <ArrowUp size={16} style={{ color: "var(--accent-green)" }} />
            : <ArrowDown size={16} style={{ color: "var(--accent-red)" }} />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Bell size={12} style={{ color: isAbove ? "var(--accent-green)" : "var(--accent-red)" }} />
            <span className="text-xs font-mono font-semibold" style={{ color: isAbove ? "var(--accent-green)" : "var(--accent-red)" }}>
              PRICE ALERT TRIGGERED
            </span>
          </div>
          <p className="text-sm font-mono font-bold" style={{ color: "var(--text-primary)" }}>
            {toast.symbol}
          </p>
          <p className="text-xs font-mono mt-0.5" style={{ color: "var(--text-secondary)" }}>
            {isAbove ? "Rose above" : "Fell below"}{" "}
            <span style={{ color: "var(--text-primary)" }}>
              ${toast.target_price.toLocaleString()}
            </span>
            {" · "}now{" "}
            <span style={{ color: isAbove ? "var(--accent-green)" : "var(--accent-red)" }}>
              ${toast.livePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </p>
        </div>

        {/* Close */}
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          className="p-1 rounded transition-colors flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
