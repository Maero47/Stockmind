"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import SymbolInput from "./SymbolInput";

interface Props {
  onAdd: (symbol: string, quantity: number, avgBuyPrice: number, boughtAt: string, notes?: string) => Promise<void>;
}

export default function AddPositionForm({ onAdd }: Props) {
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const qty = parseFloat(quantity);
    const avg = parseFloat(price);
    if (!sym || isNaN(qty) || qty <= 0 || isNaN(avg) || avg <= 0 || !date) return;

    setSaving(true);
    await onAdd(sym, qty, avg, date, notes.trim() || undefined);
    setSymbol("");
    setQuantity("");
    setPrice("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setSaving(false);
  }

  const inputStyle = {
    backgroundColor: "var(--bg-elevated)",
    border: "1px solid var(--border-bright)",
    color: "var(--text-primary)",
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Symbol</span>
          <SymbolInput value={symbol} onChange={setSymbol} />
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Shares</span>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
            min="0.0001"
            step="any"
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Avg Price ($)</span>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="150.00"
            min="0.01"
            step="any"
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Buy Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={inputStyle}
            required
          />
        </div>
        <div>
          <span className="block text-[10px] font-medium uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>Notes</span>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving || !symbol.trim() || !quantity || !price}
            className="w-full py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 flex items-center justify-center gap-1.5"
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Position
          </button>
        </div>
      </div>
    </form>
  );
}
