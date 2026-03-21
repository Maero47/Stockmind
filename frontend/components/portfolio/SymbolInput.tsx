"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useSearch } from "@/hooks/useStockData";

const POPULAR = [
  { symbol: "AAPL",    name: "Apple Inc." },
  { symbol: "MSFT",    name: "Microsoft Corp." },
  { symbol: "GOOGL",   name: "Alphabet Inc." },
  { symbol: "NVDA",    name: "NVIDIA Corp." },
  { symbol: "TSLA",    name: "Tesla Inc." },
  { symbol: "META",    name: "Meta Platforms" },
  { symbol: "AMZN",    name: "Amazon.com Inc." },
  { symbol: "BTC-USD", name: "Bitcoin USD" },
];

interface Props {
  value: string;
  onChange: (symbol: string) => void;
}

export default function SymbolInput({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: results } = useSearch(value);

  const suggestions =
    value.length === 0
      ? POPULAR
      : results && results.length > 0
      ? results.map((r) => ({ symbol: r.symbol, name: r.name }))
      : POPULAR.filter(
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

      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 max-h-[220px] overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-medium tracking-wider uppercase"
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
              <span className="font-mono text-xs font-semibold w-14" style={{ color: "var(--accent-green)" }}>
                {s.symbol}
              </span>
              <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {s.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
