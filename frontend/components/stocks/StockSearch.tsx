"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSearch } from "@/hooks/useStockData";

// Static fallback shown before the user types anything
const POPULAR = [
  { symbol: "AAPL",  name: "Apple Inc." },
  { symbol: "MSFT",  name: "Microsoft Corp." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "NVDA",  name: "NVIDIA Corp." },
  { symbol: "TSLA",  name: "Tesla Inc." },
  { symbol: "META",  name: "Meta Platforms" },
  { symbol: "AMZN",  name: "Amazon.com Inc." },
  { symbol: "SPY",   name: "S&P 500 ETF" },
  { symbol: "BTC-USD", name: "Bitcoin USD" },
  { symbol: "ETH-USD", name: "Ethereum USD" },
];

interface Props {
  size?: "hero" | "compact";
  placeholder?: string;
}

export default function StockSearch({
  size = "hero",
  placeholder = "Search stocks or crypto… AAPL, BTC, TSLA",
}: Props) {
  const router            = useRouter();
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Live search — only fires when query >= 1 char
  const { data: liveResults, isLoading: searching } = useSearch(query);

  // What to show in the dropdown
  const suggestions =
    query.length === 0
      ? POPULAR
      : liveResults && liveResults.length > 0
      ? liveResults.map((r) => ({ symbol: r.symbol, name: r.name }))
      : POPULAR.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const navigate = (symbol: string) => {
    const upper = symbol.toUpperCase();
    setQuery("");
    setOpen(false);
    setSelectedSymbol(upper);
    if (size === "hero") {
      router.push(`/dashboard`);
    }
    // In compact (dashboard) mode just update the symbol in the store
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim().toUpperCase();
    if (trimmed) navigate(trimmed);
  };

  const isHero = size === "hero";

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center rounded-xl transition-all duration-200"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: focused
              ? "1px solid var(--accent-green)"
              : "1px solid var(--border-bright)",
            boxShadow: focused
              ? "0 0 0 3px rgba(0,230,118,0.08), 0 4px 24px rgba(0,0,0,0.4)"
              : "0 4px 24px rgba(0,0,0,0.3)",
          }}
        >
          <Search
            size={isHero ? 18 : 16}
            className="ml-4 shrink-0"
            style={{ color: focused ? "var(--accent-green)" : "var(--text-muted)" }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => { setFocused(true); setOpen(true); }}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            className={`flex-1 bg-transparent outline-none text-text-primary placeholder-text-muted ${
              isHero ? "px-4 py-4 text-base" : "px-3 py-3 text-sm"
            }`}
          />
          {searching && (
            <span
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3 shrink-0"
              style={{ borderColor: "var(--accent-green)" }}
            />
          )}
          <button
            type="submit"
            className={`mr-2 flex items-center gap-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              isHero ? "px-4 py-2" : "px-3 py-1.5"
            }`}
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            {isHero ? <><span>Analyze</span> <ArrowRight size={14} /></> : <ArrowRight size={14} />}
          </button>
        </div>
      </form>

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
          }}
        >
          {query.length === 0 && (
            <p
              className="px-4 pt-2.5 pb-1 text-xs font-medium tracking-wider uppercase"
              style={{ color: "var(--text-muted)" }}
            >
              Popular
            </p>
          )}
          {suggestions.slice(0, 8).map((s) => (
            <button
              key={s.symbol}
              type="button"
              onMouseDown={() => navigate(s.symbol)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-bg-subtle transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-text-primary w-16">
                  {s.symbol}
                </span>
                <span className="text-sm text-text-secondary truncate">{s.name}</span>
              </div>
              <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
