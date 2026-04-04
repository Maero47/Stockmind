"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import useSWR from "swr";
import Navbar from "@/components/layout/Navbar";
import { ArrowLeftRight, ChevronDown, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { CURRENCY_LIST, currencySymbol, currencyFlag } from "@/lib/currency";
import { getExchangeRates, getHistory } from "@/lib/api";
import type { TimePeriod } from "@/lib/types";

const POPULAR_PAIRS = [
  { from: "USD", to: "EUR" },
  { from: "USD", to: "GBP" },
  { from: "USD", to: "TRY" },
  { from: "EUR", to: "GBP" },
  { from: "USD", to: "JPY" },
  { from: "GBP", to: "TRY" },
  { from: "EUR", to: "TRY" },
  { from: "USD", to: "CHF" },
];

const PERIODS: { label: string; value: TimePeriod }[] = [
  { label: "1W", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

const USD_BASE_PAIRS = new Set(["TRY", "JPY", "CHF", "CAD", "SEK", "NOK", "DKK", "PLN", "MXN", "ZAR", "INR", "KRW", "THB", "IDR", "SAR", "AED", "HKD", "SGD", "TWD", "BRL", "ILS", "CNY"]);

function buildChartPair(from: string, to: string): { symbol: string; inverted: boolean } {
  if (from === to) return { symbol: `${from}USD=X`, inverted: false };
  if (from === "USD") return { symbol: `USD${to}=X`, inverted: false };
  if (to === "USD") return { symbol: `USD${from}=X`, inverted: true };
  if (USD_BASE_PAIRS.has(to)) return { symbol: `${from}${to}=X`, inverted: false };
  return { symbol: `${to}${from}=X`, inverted: true };
}

// ── Currency Dropdown ──────────────────────────────────────────────────────

function CurrencySelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      inputRef.current?.focus();
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return CURRENCY_LIST.filter(
      (c) => c.code.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="relative" ref={ref}>
      <p className="text-[10px] uppercase tracking-widest mb-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-2 px-3 py-2.5 rounded-lg w-full transition-colors"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-bright)",
          color: "var(--text-primary)",
        }}
      >
        <span className="text-base">{currencyFlag(value)}</span>
        <span className="text-sm font-medium flex-1 text-left">{value}</span>
        <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden shadow-2xl z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            maxHeight: "240px",
          }}
        >
          <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency..."
              className="w-full bg-transparent text-sm outline-none px-2 py-1"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "192px" }}>
            {filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => { onChange(c.code); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
                style={{
                  color: c.code === value ? "var(--accent-green)" : "var(--text-secondary)",
                  backgroundColor: c.code === value ? "rgba(0,230,118,0.06)" : "transparent",
                }}
              >
                <span className="text-base">{c.flag}</span>
                <span className="font-medium">{c.code}</span>
                <span className="font-mono text-xs" style={{ color: "var(--text-muted)" }}>{c.symbol.trim()}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini Chart (SVG line) ──────────────────────────────────────────────────

function MiniChart({ symbol, period, inverted }: { symbol: string; period: TimePeriod; inverted: boolean }) {
  const { data, isLoading } = useSWR(
    symbol ? `converter-chart:${symbol}:${period}` : null,
    () => getHistory(symbol, period, "1d"),
    { refreshInterval: 60_000 }
  );

  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);

  const bars = data?.bars ?? [];

  if (isLoading || bars.length < 2) {
    return (
      <div className="w-full h-48 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {isLoading ? "Loading chart..." : "No data available"}
        </span>
      </div>
    );
  }

  const closes = bars.map((b) => inverted ? 1 / b.close : b.close);
  const dates = bars.map((b) => b.timestamp);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const w = 600;
  const h = 180;
  const pad = 8;
  const decimals = closes[0] < 10 ? 4 : 2;

  const coords = closes.map((c, i) => ({
    x: pad + (i / (closes.length - 1)) * (w - pad * 2),
    y: pad + (1 - (c - min) / range) * (h - pad * 2),
  }));

  const points = coords.map((p) => `${p.x},${p.y}`).join(" ");

  const first = closes[0];
  const last = closes[closes.length - 1];
  const changePct = ((last - first) / first) * 100;
  const isUp = changePct >= 0;
  const color = isUp ? "var(--accent-green)" : "var(--accent-red)";
  const strokeColor = isUp ? "#00E676" : "#FF3D57";

  const fillPoints = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * w;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - mouseX);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    setHover({ idx: closest, x: coords[closest].x, y: coords[closest].y });
  };

  const hoverPrice = hover !== null ? closes[hover.idx] : null;
  const hoverDate = hover !== null ? dates[hover.idx] : null;
  const hoverChange = hoverPrice !== null ? ((hoverPrice - first) / first) * 100 : null;

  const displayPrice = hoverPrice ?? last;
  const displayChange = hoverChange ?? changePct;
  const displayDate = hoverDate
    ? new Date(hoverDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {displayChange >= 0
            ? <TrendingUp size={14} style={{ color }} />
            : <TrendingDown size={14} style={{ color }} />}
          <span className="text-sm font-medium font-mono" style={{ color }}>
            {displayChange >= 0 ? "+" : ""}{displayChange.toFixed(2)}%
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>
            {displayPrice.toFixed(decimals)}
          </span>
          {displayDate && (
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {displayDate}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>H: {max.toFixed(decimals)}</span>
          <span className="mx-1">|</span>
          <span>L: {min.toFixed(decimals)}</span>
        </div>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="w-full cursor-crosshair"
        style={{ height: "180px" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={fillPoints} fill="url(#chartFill)" />
        <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {hover && (
          <>
            <line
              x1={hover.x} y1={pad} x2={hover.x} y2={h - pad}
              stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="3,3"
            />
            <circle cx={hover.x} cy={hover.y} r="4" fill={strokeColor} />
            <circle cx={hover.x} cy={hover.y} r="7" fill={strokeColor} fillOpacity="0.2" />
          </>
        )}
      </svg>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ConverterPage() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("1");
  const [chartPeriod, setChartPeriod] = useState<TimePeriod>("1mo");

  const currencies = useMemo(() => {
    const set = new Set([from, to]);
    return [...set].filter((c) => c !== "USD");
  }, [from, to]);

  const { data: rates, isLoading } = useSWR(
    currencies.length > 0 || from === "USD" || to === "USD"
      ? `fx:${from}:${to}`
      : null,
    () => getExchangeRates([from, to]),
    { refreshInterval: 30_000 }
  );

  const rate = useMemo(() => {
    if (!rates) return null;
    const fromRate = from === "USD" ? 1 : rates[from] ?? null;
    const toRate = to === "USD" ? 1 : rates[to] ?? null;
    if (fromRate === null || toRate === null || fromRate === 0) return null;
    return fromRate / toRate;
  }, [rates, from, to]);

  const converted = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || rate === null) return null;
    return num * rate;
  }, [amount, rate]);

  const inverseRate = rate && rate !== 0 ? 1 / rate : null;

  const handleSwap = () => {
    const prevFrom = from;
    const prevTo = to;
    setFrom(prevTo);
    setTo(prevFrom);
  };

  const { symbol: pairSymbol, inverted: chartInverted } = buildChartPair(from, to);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-20 pb-24 md:pb-12">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Currency Converter
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            Live exchange rates updated every 30 seconds
          </p>
        </div>

        {/* Converter Card */}
        <div
          className="rounded-xl p-5 mb-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Amount + From */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                Amount
              </p>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-bright)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <CurrencySelect value={from} onChange={setFrom} label="From" />
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-1 relative z-10">
            <button
              onClick={handleSwap}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border-bright)",
                color: "var(--accent-green)",
              }}
              title="Swap currencies"
            >
              <ArrowLeftRight size={15} style={{ transform: "rotate(90deg)" }} />
            </button>
          </div>

          {/* To + Result */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest mb-1.5 font-mono" style={{ color: "var(--text-muted)" }}>
                Converted
              </p>
              <div
                className="w-full px-3 py-2.5 rounded-lg text-sm font-mono"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  border: "1px solid var(--border-bright)",
                  color: converted !== null ? "var(--accent-green)" : "var(--text-muted)",
                  minHeight: "42px",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {isLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : converted !== null ? (
                  `${currencySymbol(to)}${converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: converted < 1 ? 6 : 2 })}`
                ) : (
                  "--"
                )}
              </div>
            </div>
            <CurrencySelect value={to} onChange={setTo} label="To" />
          </div>

          {/* Rate Info */}
          {rate !== null && (
            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  {currencyFlag(from)} 1 {from} = {currencySymbol(to)}{rate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: rate < 1 ? 6 : 4 })} {to} {currencyFlag(to)}
                </span>
                {inverseRate !== null && (
                  <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {currencyFlag(to)} 1 {to} = {currencySymbol(from)}{inverseRate.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: inverseRate < 1 ? 6 : 4 })} {from} {currencyFlag(from)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock size={10} style={{ color: "var(--text-muted)" }} />
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  Updates every 30s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Popular Pairs */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-3 font-mono" style={{ color: "var(--text-muted)" }}>
            Popular Pairs
          </p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_PAIRS.map((pair) => {
              const active = pair.from === from && pair.to === to;
              return (
                <button
                  key={`${pair.from}-${pair.to}`}
                  onClick={() => { setFrom(pair.from); setTo(pair.to); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={{
                    backgroundColor: active ? "rgba(0,230,118,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${active ? "rgba(0,230,118,0.3)" : "var(--border)"}`,
                    color: active ? "var(--accent-green)" : "var(--text-secondary)",
                  }}
                >
                  {currencyFlag(pair.from)} {pair.from}/{pair.to} {currencyFlag(pair.to)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        <div
          className="rounded-xl p-4"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {from}/{to} Chart
            </p>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setChartPeriod(p.value)}
                  className="px-2 py-1 rounded text-[11px] font-mono transition-colors"
                  style={{
                    backgroundColor: chartPeriod === p.value ? "rgba(0,230,118,0.1)" : "transparent",
                    color: chartPeriod === p.value ? "var(--accent-green)" : "var(--text-muted)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <MiniChart symbol={pairSymbol} period={chartPeriod} inverted={chartInverted} />
        </div>

        <p className="text-[10px] text-center mt-4" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Rates sourced from Yahoo Finance. For informational purposes only.
        </p>
      </main>
    </div>
  );
}
