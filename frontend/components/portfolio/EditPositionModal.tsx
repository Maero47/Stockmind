"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2 } from "lucide-react";
import type { EnrichedPosition } from "@/hooks/usePortfolioStats";
import { currencySymbol } from "@/lib/currency";

interface Props {
  position: EnrichedPosition;
  onSave: (id: number, updates: { quantity?: number; avg_buy_price?: number; notes?: string }) => Promise<void>;
  onClose: () => void;
}

export default function EditPositionModal({ position, onSave, onClose }: Props) {
  const [quantity, setQuantity] = useState(String(position.quantity));
  const [price, setPrice] = useState(String(position.avg_buy_price));
  const [notes, setNotes] = useState(position.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const qty = parseFloat(quantity);
    const avg = parseFloat(price);
    if (isNaN(qty) || qty <= 0 || isNaN(avg) || avg <= 0) return;

    setSaving(true);
    await onSave(position.id, { quantity: qty, avg_buy_price: avg, notes: notes.trim() || undefined });
    setSaving(false);
    onClose();
  }

  const inputStyle = {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border-bright)",
    color: "var(--text-primary)",
  };

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold font-mono"
              style={{ color: "var(--accent-green)" }}
            >
              {position.symbol}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Edit Position</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Shares</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="0.0001"
              step="any"
              className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
              style={inputStyle}
              autoFocus
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Avg Buy Price ({currencySymbol(position.currency).trim()})</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0.01"
              step="any"
              className="w-full rounded-lg px-3 py-2.5 text-sm font-mono outline-none"
              style={inputStyle}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-medium uppercase tracking-wider mb-1.5 block" style={{ color: "var(--text-muted)" }}>Notes</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            {saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
