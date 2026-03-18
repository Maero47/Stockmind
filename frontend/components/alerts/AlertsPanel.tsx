"use client";

import { useState } from "react";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import type { AlertDirection } from "@/lib/types";

export default function AlertsPanel({ symbol }: { symbol: string }) {
  const { alerts, create, remove } = useAlerts();
  const [price, setPrice]   = useState("");
  const [dir, setDir]       = useState<AlertDirection>("above");
  const [saving, setSaving] = useState(false);

  const symbolAlerts = alerts.filter((a) => a.symbol === symbol && !a.triggered);

  async function handleCreate() {
    const p = parseFloat(price);
    if (!p || isNaN(p)) return;
    setSaving(true);
    try {
      await create(symbol, p, dir);
      setPrice("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Direction picker */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => setDir("above")}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-semibold"
          style={{
            backgroundColor: dir === "above" ? "rgba(0,230,118,0.18)" : "var(--bg-subtle)",
            color: dir === "above" ? "var(--accent-green)" : "var(--text-muted)",
            border: dir === "above" ? "1.5px solid var(--accent-green)" : "1.5px solid transparent",
          }}
        >
          <ArrowUp size={12} /> Above
        </button>
        <button
          type="button"
          onClick={() => setDir("below")}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-mono font-semibold"
          style={{
            backgroundColor: dir === "below" ? "rgba(255,61,87,0.18)" : "var(--bg-subtle)",
            color: dir === "below" ? "var(--accent-red)" : "var(--text-muted)",
            border: dir === "below" ? "1.5px solid var(--accent-red)" : "1.5px solid transparent",
          }}
        >
          <ArrowDown size={12} /> Below
        </button>
      </div>

      {/* Price + Set */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Target price ($)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-mono bg-transparent outline-none"
          style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || !price}
          className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium"
          style={{
            backgroundColor: dir === "above" ? "var(--accent-green)" : "var(--accent-red)",
            color: "#080C14",
            opacity: saving || !price ? 0.5 : 1,
          }}
        >
          {saving ? "…" : "Set"}
        </button>
      </div>

      {/* Existing alerts for this symbol */}
      {symbolAlerts.length === 0 ? (
        <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
          No active alerts for {symbol}
        </p>
      ) : (
        <div className="space-y-1.5">
          {symbolAlerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ backgroundColor: "var(--bg-subtle)" }}
            >
              <div className="flex items-center gap-2 text-xs font-mono">
                {a.direction === "above"
                  ? <ArrowUp size={11} style={{ color: "var(--accent-green)" }} />
                  : <ArrowDown size={11} style={{ color: "var(--accent-red)" }} />
                }
                <span style={{ color: "var(--text-secondary)" }}>
                  {a.direction === "above" ? "Above" : "Below"}
                </span>
                <span style={{ color: "var(--text-primary)" }}>
                  ${a.target_price.toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="p-1 rounded"
                style={{ color: "var(--text-muted)" }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
