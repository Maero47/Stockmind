"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import type { AlertDirection } from "@/lib/types";

export default function AllAlertsPanel() {
  const { alerts, create, remove, isLoading } = useAlerts();
  const [symbol, setSymbol]   = useState("");
  const [price, setPrice]     = useState("");
  const [dir, setDir]         = useState<AlertDirection>("above");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setNotifPerm("unsupported");
    } else {
      setNotifPerm(Notification.permission);
    }
  }, []);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPerm(result);
  }

  const active    = alerts.filter((a) => !a.triggered);
  const triggered = alerts.filter((a) => a.triggered);

  async function handleCreate() {
    const sym = symbol.trim().toUpperCase();
    const p   = parseFloat(price);
    if (!sym) { setError("Enter a symbol"); return; }
    if (!p || isNaN(p) || p <= 0) { setError("Enter a valid price"); return; }
    setError("");
    setSaving(true);
    try {
      await create(sym, p, dir);
      setSymbol("");
      setPrice("");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to create alert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Notification permission banner ───────────────────────────── */}
      {notifPerm === "default" && (
        <div
          className="flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl"
          style={{ backgroundColor: "rgba(255,179,0,0.08)", border: "1px solid rgba(255,179,0,0.25)" }}
        >
          <div className="flex items-center gap-3">
            <BellRing size={16} style={{ color: "var(--accent-amber)" }} />
            <p className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              Enable browser notifications to get alerted even when you switch tabs.
            </p>
          </div>
          <button
            type="button"
            onClick={requestNotifPermission}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold"
            style={{ backgroundColor: "var(--accent-amber)", color: "#080C14" }}
          >
            Enable
          </button>
        </div>
      )}

      {notifPerm === "denied" && (
        <div
          className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
          style={{ backgroundColor: "rgba(255,61,87,0.08)", border: "1px solid rgba(255,61,87,0.2)" }}
        >
          <BellOff size={16} style={{ color: "var(--accent-red)" }} />
          <p className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            Browser notifications are blocked. You'll still see in-app alerts when viewing the stock.
            To re-enable: click the lock icon in your browser's address bar.
          </p>
        </div>
      )}

      {notifPerm === "granted" && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ backgroundColor: "rgba(0,230,118,0.07)", border: "1px solid rgba(0,230,118,0.15)" }}
        >
          <Bell size={14} style={{ color: "var(--accent-green)" }} />
          <p className="text-xs font-mono" style={{ color: "var(--accent-green)" }}>
            Browser notifications enabled — you'll be alerted even when StockMind is in the background.
          </p>
        </div>
      )}

      {/* ── Create new alert ─────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-xs font-mono font-medium tracking-widest" style={{ color: "var(--text-muted)" }}>
          NEW ALERT
        </p>

        <div className="flex flex-wrap gap-3">
          {/* Symbol input */}
          <input
            type="text"
            placeholder="Symbol (e.g. AAPL)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className="flex-1 min-w-[120px] px-3 py-2 rounded-lg text-sm font-mono bg-transparent outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />

          {/* Direction toggle */}
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setDir("above")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold"
              style={{
                backgroundColor: dir === "below" ? "rgba(255,61,87,0.18)" : "var(--bg-subtle)",
                color: dir === "below" ? "var(--accent-red)" : "var(--text-muted)",
                border: dir === "below" ? "1.5px solid var(--accent-red)" : "1.5px solid transparent",
              }}
            >
              <ArrowDown size={12} /> Below
            </button>
          </div>

          {/* Price input */}
          <input
            type="number"
            placeholder="Target price ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1 min-w-[140px] px-3 py-2 rounded-lg text-sm font-mono bg-transparent outline-none"
            style={{ border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />

          <button
            type="button"
            onClick={handleCreate}
            disabled={saving || !symbol || !price}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-mono font-medium"
            style={{
              backgroundColor: "var(--accent-green)",
              color: "#080C14",
              opacity: saving || !symbol || !price ? 0.5 : 1,
            }}
          >
            <Plus size={14} />
            {saving ? "Setting…" : "Set Alert"}
          </button>
        </div>

        {error && (
          <p className="text-xs font-mono" style={{ color: "var(--accent-red)" }}>{error}</p>
        )}

        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          You'll get a browser notification + in-app banner when the price is reached.
        </p>
      </div>

      {/* ── Active alerts ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-mono font-medium tracking-widest" style={{ color: "var(--text-muted)" }}>
          ACTIVE ALERTS ({active.length})
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-subtle)" }} />
            ))}
          </div>
        ) : active.length === 0 ? (
          <div
            className="rounded-xl p-8 flex flex-col items-center gap-3"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            <Bell size={28} style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No active alerts</p>
            <p className="text-xs text-center" style={{ color: "var(--text-muted)", maxWidth: 280 }}>
              Set a price alert above and you'll be notified the moment the target is hit.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {active.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={{
                  borderBottom: i < active.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Direction icon */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: a.direction === "above" ? "rgba(0,230,118,0.12)" : "rgba(255,61,87,0.12)",
                    }}
                  >
                    {a.direction === "above"
                      ? <ArrowUp size={14} style={{ color: "var(--accent-green)" }} />
                      : <ArrowDown size={14} style={{ color: "var(--accent-red)" }} />
                    }
                  </div>

                  {/* Symbol + target */}
                  <div>
                    <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {a.symbol}
                    </span>
                    <span className="font-mono text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {a.direction === "above" ? "rises above" : "falls below"}
                    </span>
                    <span className="font-mono text-sm font-semibold ml-2" style={{ color: a.direction === "above" ? "var(--accent-green)" : "var(--accent-red)" }}>
                      ${a.target_price.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(a.id)}
                    className="p-1.5 rounded-lg"
                    style={{ color: "var(--text-muted)" }}
                    title="Delete alert"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Triggered alerts ─────────────────────────────────────────── */}
      {triggered.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-mono font-medium tracking-widest" style={{ color: "var(--text-muted)" }}>
            TRIGGERED ({triggered.length})
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", opacity: 0.6 }}
          >
            {triggered.map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: i < triggered.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  >
                    {a.direction === "above"
                      ? <ArrowUp size={14} style={{ color: "var(--text-muted)" }} />
                      : <ArrowDown size={14} style={{ color: "var(--text-muted)" }} />
                    }
                  </div>
                  <div>
                    <span className="font-mono text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                      {a.symbol}
                    </span>
                    <span className="font-mono text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                      {a.direction === "above" ? "above" : "below"} ${a.target_price.toLocaleString()}
                    </span>
                    <span className="text-xs ml-2 px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "rgba(0,230,118,0.1)", color: "var(--accent-green)" }}>
                      ✓ Triggered
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
