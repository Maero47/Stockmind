"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Wifi, WifiOff } from "lucide-react";
import type { StockQuote } from "@/lib/types";
import { useBinanceTicker } from "@/hooks/useBinanceTicker";
import { useFinnhubTicker } from "@/hooks/useFinnhubTicker";
import { useAlerts } from "@/hooks/useAlerts";
import { usePriceAlertChecker } from "@/hooks/usePriceAlertChecker";
import WatchlistButton from "@/components/watchlist/WatchlistButton";
import AlertButton from "@/components/alerts/AlertButton";
import AlertToast from "@/components/alerts/AlertToast";
import type { AlertToastData } from "@/components/alerts/AlertToast";

function fmt(n: number | null, dp = 2) {
  return n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
function fmtLarge(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
function fmtVol(n: number | null) {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// ── Flash hook ────────────────────────────────────────────────────────────────

function useFlash(price: number | null | undefined) {
  const [flashClass, setFlashClass] = useState("");
  const prevPrice = useRef<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (price == null) return;
    const prev = prevPrice.current;
    prevPrice.current = price;
    if (prev == null) return; // first value, no flash

    if (timerRef.current) clearTimeout(timerRef.current);
    setFlashClass(""); // reset first so animation re-triggers

    requestAnimationFrame(() => {
      const cls = price > prev ? "flash-up" : price < prev ? "flash-down" : "flash-neutral";
      setFlashClass(cls);
      timerRef.current = setTimeout(() => setFlashClass(""), 700);
    });
  }, [price]);

  return flashClass;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  quote:     StockQuote | undefined;
  isLoading: boolean;
}

export default function StockHeader({ quote, isLoading }: Props) {
  const symbol = quote?.symbol ?? "";

  // Binance WebSocket for crypto — live sub-second updates
  const { data: binance, connected: binanceConnected, isCrypto } = useBinanceTicker(symbol);

  // Finnhub WebSocket for stocks — real-time trade ticks
  const { tick: finnhubTick, connected: finnhubConnected, isStock } = useFinnhubTicker(symbol);

  // Price: Binance for crypto, Finnhub trade tick for stocks, REST fallback for both
  const livePrice = isCrypto && binance
    ? binance.price
    : isStock && finnhubTick
      ? finnhubTick.price
      : quote?.price ?? null;

  const price     = livePrice;
  const change    = isCrypto && binance ? binance.change    : quote?.change    ?? null;
  const changePct = isCrypto && binance ? binance.changePct : quote?.change_pct ?? null;
  const high      = isCrypto && binance ? binance.high      : quote?.day_high   ?? null;
  const low       = isCrypto && binance ? binance.low       : quote?.day_low    ?? null;
  const volume    = isCrypto && binance ? binance.volume    : quote?.volume     ?? null;

  // Live connection state: show indicator for both crypto and stocks
  const isLive      = isCrypto || isStock;
  const wsConnected = isCrypto ? binanceConnected : finnhubConnected;

  const flashClass = useFlash(price);

  // Price alerts + in-app toast
  const { alerts, trigger } = useAlerts();
  const [activeToast, setActiveToast] = useState<AlertToastData | null>(null);
  const onTrigger = useCallback((id: number) => trigger(id), [trigger]);
  const onToast   = useCallback((data: AlertToastData) => setActiveToast(data), []);
  usePriceAlertChecker(symbol, price, alerts, onTrigger, onToast);

  if (isLoading || !quote) {
    return (
      <div className="animate-pulse space-y-2 mb-6">
        <div className="h-4 w-32 rounded" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-10 w-56 rounded" style={{ background: "var(--bg-subtle)" }} />
        <div className="flex gap-4 mt-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-5 w-20 rounded" style={{ background: "var(--bg-subtle)" }} />
          ))}
        </div>
      </div>
    );
  }

  const isPos  = (changePct ?? 0) > 0;
  const isFlat = (changePct ?? 0) === 0;
  const changeColor = isFlat
    ? "var(--text-secondary)"
    : isPos ? "var(--accent-green)" : "var(--accent-red)";

  const ChangeIcon = isFlat ? Minus : isPos ? TrendingUp : TrendingDown;

  return (
    <div className="mb-6">
      {/* Symbol + name */}
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs font-medium tracking-widest" style={{ color: "var(--accent-green)" }}>
            {quote.symbol}
          </span>
          <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {quote.exchange && `${quote.exchange} · `}{quote.sector || quote.name}
          </span>
        </div>
        {/* Actions: watchlist + alerts + live indicator */}
        <div className="flex items-center gap-2">
          <WatchlistButton symbol={symbol} />
          <AlertButton symbol={symbol} />
          {isLive && (
            <span className="flex items-center gap-1 text-xs font-mono" style={{ color: wsConnected ? "var(--accent-green)" : "var(--text-muted)" }}>
              {wsConnected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {wsConnected ? "LIVE" : "connecting…"}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="text-sm mb-3 truncate" style={{ color: "var(--text-secondary)" }}>
        {quote.name}
      </p>

      {/* Big price with flash */}
      <div className="flex items-end gap-4 flex-wrap">
        <span
          key={price}
          className={`font-mono text-4xl font-bold tabular-nums leading-none px-1 -mx-1 ${flashClass}`}
          style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}
        >
          ${fmt(price)}
        </span>
        <span
          className="flex items-center gap-1.5 font-mono text-lg font-medium tabular-nums"
          style={{ color: changeColor }}
        >
          <ChangeIcon size={16} />
          {isPos ? "+" : ""}{fmt(change)} ({isPos ? "+" : ""}{fmt(changePct)}%)
        </span>
      </div>

      {/* Stats row */}
      <div
        className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {[
          { label: "Market Cap", value: fmtLarge(quote.market_cap) },
          { label: "Volume",     value: fmtVol(volume) },
          { label: "P/E Ratio",  value: quote.pe_ratio ? fmt(quote.pe_ratio, 1) : "—" },
          { label: "52W High",   value: `$${fmt(quote.week_52_high)}` },
          { label: "52W Low",    value: `$${fmt(quote.week_52_low)}` },
          { label: "Day Range",  value: `$${fmt(low)} – $${fmt(high)}` },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
            <span className="font-mono text-sm" style={{ color: "var(--text-primary)" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* In-app toast for alert triggers */}
      <AlertToast toast={activeToast} onClose={() => setActiveToast(null)} />
    </div>
  );
}
