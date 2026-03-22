"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Send } from "lucide-react";
import SymbolInput from "@/components/portfolio/SymbolInput";
import type { PredictionDirection } from "@/lib/types";

interface Props {
  onCreate: (input: { symbol: string; direction: PredictionDirection; target_price?: number; note?: string }) => Promise<void>;
}

export default function PostPrediction({ onCreate }: Props) {
  const [symbol, setSymbol] = useState("");
  const [direction, setDirection] = useState<PredictionDirection>("bullish");
  const [targetPrice, setTargetPrice] = useState("");
  const [note, setNote] = useState("");
  const [posting, setPosting] = useState(false);

  async function handleSubmit() {
    if (!symbol.trim() || posting) return;
    setPosting(true);
    try {
      await onCreate({
        symbol: symbol.trim(),
        direction,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
        note: note.trim() || undefined,
      });
      setSymbol("");
      setTargetPrice("");
      setNote("");
    } catch {
      // silent
    }
    setPosting(false);
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium tracking-widest uppercase font-mono mb-3" style={{ color: "var(--text-muted)" }}>
        Post Prediction
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SymbolInput value={symbol} onChange={setSymbol} />
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-bright)" }}>
            <button
              type="button"
              onClick={() => setDirection("bullish")}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-all"
              style={{
                backgroundColor: direction === "bullish" ? "rgba(0,230,118,0.15)" : "transparent",
                color: direction === "bullish" ? "var(--accent-green)" : "var(--text-muted)",
              }}
            >
              <TrendingUp size={12} /> Bullish
            </button>
            <button
              type="button"
              onClick={() => setDirection("bearish")}
              className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-all"
              style={{
                backgroundColor: direction === "bearish" ? "rgba(255,23,68,0.15)" : "transparent",
                color: direction === "bearish" ? "var(--accent-red, #FF1744)" : "var(--text-muted)",
                borderLeft: "1px solid var(--border-bright)",
              }}
            >
              <TrendingDown size={12} /> Bearish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="Target price (optional)"
            step="0.01"
            min="0"
            className="rounded-lg px-3 py-2 text-sm font-mono outline-none"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)", color: "var(--text-primary)" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!symbol.trim() || posting}
            className="flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            <Send size={12} />
            {posting ? "Posting..." : "Post"}
          </button>
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          placeholder="Share your reasoning... (optional)"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
          style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)", color: "var(--text-primary)" }}
        />
        {note.length > 0 && (
          <p className="text-[10px] text-right" style={{ color: "var(--text-muted)" }}>{note.length}/280</p>
        )}
      </div>
    </div>
  );
}
