"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getQuote, getHistory } from "@/lib/api";
import type { StockQuote, StockHistory } from "@/lib/types";

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtLarge(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtVol(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div
      className="glass-card p-5 h-52 animate-pulse"
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      <div className="flex justify-between mb-3">
        <div className="h-4 w-16 rounded bg-bg-subtle" />
        <div className="h-3 w-10 rounded bg-bg-subtle" />
      </div>
      <div className="h-3 w-28 rounded bg-bg-subtle mb-6" />
      <div className="h-12 w-full rounded bg-bg-subtle mb-4" />
      <div className="flex justify-between">
        <div className="h-5 w-24 rounded bg-bg-subtle" />
        <div className="h-5 w-16 rounded bg-bg-subtle" />
      </div>
    </div>
  );
}

// ── Custom sparkline tooltip ──────────────────────────────────────────────────

function SparkTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-2 py-1 rounded text-xs font-mono"
      style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
    >
      ${payload[0].value.toFixed(2)}
    </div>
  );
}

// ── StockCard ─────────────────────────────────────────────────────────────────

interface Props {
  symbol: string;
}

export default function StockCard({ symbol }: Props) {
  const router = useRouter();

  const { data: quote, isLoading: quoteLoading } =
    useSWR<StockQuote>(`quote:${symbol}`, () => getQuote(symbol), {
      refreshInterval: 30_000,
      dedupingInterval: 25_000,
    });

  const { data: history, isLoading: histLoading } =
    useSWR<StockHistory>(`hist:${symbol}`, () => getHistory(symbol, "1mo", "1d"), {
      refreshInterval: 300_000,
    });

  if (quoteLoading || histLoading || !quote) return <Skeleton />;

  const isPositive = (quote.change_pct ?? 0) >= 0;
  const isFlat     = quote.change_pct === 0 || quote.change_pct == null;

  const accentColor = isFlat
    ? "var(--text-secondary)"
    : isPositive
    ? "var(--accent-green)"
    : "var(--accent-red)";

  const sparkData = (history?.bars ?? []).map((b) => ({ v: b.close }));

  return (
    <div
      className={`glass-card ${isPositive ? "glow-green" : "glow-red"} p-5 cursor-pointer select-none transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0`}
      onClick={() => router.push(`/stock/${symbol}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/stock/${symbol}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-0.5">
        <span className="font-mono text-sm font-medium text-text-primary tracking-wide">
          {symbol}
        </span>
        <span
          className="flex items-center gap-1 text-xs font-mono"
          style={{ color: accentColor }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
              style={{ backgroundColor: accentColor }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{ backgroundColor: accentColor }}
            />
          </span>
          LIVE
        </span>
      </div>

      {/* Name */}
      <p className="text-xs text-text-muted mb-3 truncate">{quote.name}</p>

      {/* Sparkline */}
      <div className="h-14 w-full mb-3 -mx-1">
        {sparkData.length > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData}>
              <defs>
                <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={accentColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={<SparkTooltip />}
                cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#grad-${symbol})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs text-text-muted">No chart data</span>
          </div>
        )}
      </div>

      {/* Price + change */}
      <div className="flex items-end justify-between">
        <span className="font-mono text-lg font-medium text-text-primary tabular-nums">
          {fmtPrice(quote.price)}
        </span>
        <span
          className="flex items-center gap-1 font-mono text-sm font-medium tabular-nums"
          style={{ color: accentColor }}
        >
          {isFlat ? (
            <Minus size={12} />
          ) : isPositive ? (
            <TrendingUp size={12} />
          ) : (
            <TrendingDown size={12} />
          )}
          {fmtPct(quote.change_pct)}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-text-muted">
          Vol: <span className="text-text-secondary">{fmtVol(quote.volume)}</span>
        </span>
        <span className="text-xs text-text-muted">
          Mkt: <span className="text-text-secondary">{fmtLarge(quote.market_cap)}</span>
        </span>
      </div>
    </div>
  );
}
