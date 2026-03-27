"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Globe } from "lucide-react";
import { useSearch } from "@/hooks/useStockData";

const MARKETS = [
  { key: "",       label: "All" },
  { key: "us",     label: "US" },
  { key: "bist",   label: "BIST" },
  { key: "lse",    label: "LSE" },
  { key: "eu",     label: "EU" },
  { key: "asia",   label: "Asia" },
  { key: "crypto", label: "Crypto" },
] as const;

const POPULAR: Record<string, { symbol: string; name: string }[]> = {
  "": [
    { symbol: "AAPL",    name: "Apple Inc." },
    { symbol: "MSFT",    name: "Microsoft Corp." },
    { symbol: "NVDA",    name: "NVIDIA Corp." },
    { symbol: "TSLA",    name: "Tesla Inc." },
    { symbol: "AMZN",    name: "Amazon.com Inc." },
    { symbol: "BTC-USD", name: "Bitcoin USD" },
  ],
  us: [
    { symbol: "AAPL",  name: "Apple Inc." },
    { symbol: "MSFT",  name: "Microsoft Corp." },
    { symbol: "NVDA",  name: "NVIDIA Corp." },
    { symbol: "TSLA",  name: "Tesla Inc." },
    { symbol: "AMZN",  name: "Amazon.com Inc." },
    { symbol: "SPY",   name: "S&P 500 ETF" },
  ],
  bist: [
    { symbol: "THYAO.IS",  name: "Turk Hava Yollari" },
    { symbol: "GARAN.IS",  name: "Garanti Bankasi" },
    { symbol: "AKBNK.IS",  name: "Akbank" },
    { symbol: "ASELS.IS",  name: "Aselsan" },
    { symbol: "KCHOL.IS",  name: "Koc Holding" },
    { symbol: "BIMAS.IS",  name: "BIM Birlesik Magazalar" },
  ],
  lse: [
    { symbol: "SHEL.L",  name: "Shell plc" },
    { symbol: "AZN.L",   name: "AstraZeneca" },
    { symbol: "HSBA.L",  name: "HSBC Holdings" },
    { symbol: "BP.L",    name: "BP plc" },
  ],
  eu: [
    { symbol: "SAP.DE",   name: "SAP SE" },
    { symbol: "ASML.AS",  name: "ASML Holding" },
    { symbol: "MC.PA",    name: "LVMH" },
    { symbol: "SIE.DE",   name: "Siemens AG" },
  ],
  asia: [
    { symbol: "7203.T",   name: "Toyota Motor" },
    { symbol: "9984.T",   name: "SoftBank Group" },
    { symbol: "0700.HK",  name: "Tencent Holdings" },
    { symbol: "2330.TW",  name: "TSMC" },
  ],
  crypto: [
    { symbol: "BTC-USD",  name: "Bitcoin USD" },
    { symbol: "ETH-USD",  name: "Ethereum USD" },
    { symbol: "SOL-USD",  name: "Solana USD" },
    { symbol: "BNB-USD",  name: "Binance Coin USD" },
  ],
};

interface Props {
  value: string;
  onChange: (symbol: string) => void;
}

export default function SymbolInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [market, setMarket] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results } = useSearch(value, market || undefined);

  const popularList = POPULAR[market] ?? POPULAR[""];
  const suggestions =
    value.length === 0
      ? popularList
      : results && results.length > 0
      ? results.map((r) => ({ symbol: r.symbol, name: r.name }))
      : popularList.filter(
          (s) =>
            s.symbol.toLowerCase().includes(value.toLowerCase()) ||
            s.name.toLowerCase().includes(value.toLowerCase())
        );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center rounded-lg overflow-hidden transition-all"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: focused ? "1px solid var(--accent-green)" : "1px solid var(--border-bright)",
        }}
      >
        <Search size={13} className="ml-3 shrink-0" style={{ color: focused ? "var(--accent-green)" : "var(--text-muted)" }} />
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value.toUpperCase()); setOpen(true); }}
          onFocus={() => { setFocused(true); setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search..."
          className="w-full bg-transparent outline-none px-2 py-2 text-sm font-mono"
          style={{ color: "var(--text-primary)" }}
        />
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Market filter */}
          <div className="flex items-center gap-1 px-2 pt-2 pb-1.5 overflow-x-auto"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Globe size={10} className="shrink-0" style={{ color: "var(--text-muted)" }} />
            {MARKETS.map((m) => (
              <button
                key={m.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setMarket(m.key); }}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: market === m.key ? "rgba(0,230,118,0.15)" : "transparent",
                  color: market === m.key ? "var(--accent-green)" : "var(--text-muted)",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="max-h-[200px] overflow-y-auto">
            <p className="px-3 pt-1.5 pb-1 text-[10px] font-medium tracking-wider uppercase"
              style={{ color: "var(--text-muted)" }}>
              {value.length === 0 ? "Popular" : "Results"}
            </p>
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s.symbol}
                type="button"
                onMouseDown={() => { onChange(s.symbol); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors"
                style={{ backgroundColor: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span className="font-mono text-xs font-semibold w-16" style={{ color: "var(--accent-green)" }}>
                  {s.symbol}
                </span>
                <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {s.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
