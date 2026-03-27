"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Clock, X, User, Globe } from "lucide-react";
import { useStore } from "@/lib/store";
import { useSearch } from "@/hooks/useStockData";
import { useUserSearch } from "@/hooks/useUserSearch";
import { safeImageUrl } from "@/lib/sanitize";

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
    { symbol: "GOOGL",   name: "Alphabet Inc." },
    { symbol: "NVDA",    name: "NVIDIA Corp." },
    { symbol: "TSLA",    name: "Tesla Inc." },
    { symbol: "META",    name: "Meta Platforms" },
    { symbol: "AMZN",    name: "Amazon.com Inc." },
    { symbol: "SPY",     name: "S&P 500 ETF" },
  ],
  us: [
    { symbol: "AAPL",  name: "Apple Inc." },
    { symbol: "MSFT",  name: "Microsoft Corp." },
    { symbol: "GOOGL", name: "Alphabet Inc." },
    { symbol: "NVDA",  name: "NVIDIA Corp." },
    { symbol: "TSLA",  name: "Tesla Inc." },
    { symbol: "META",  name: "Meta Platforms" },
    { symbol: "AMZN",  name: "Amazon.com Inc." },
    { symbol: "SPY",   name: "S&P 500 ETF" },
  ],
  bist: [
    { symbol: "THYAO.IS",  name: "Turk Hava Yollari" },
    { symbol: "GARAN.IS",  name: "Garanti Bankasi" },
    { symbol: "AKBNK.IS",  name: "Akbank" },
    { symbol: "ASELS.IS",  name: "Aselsan" },
    { symbol: "KCHOL.IS",  name: "Koc Holding" },
    { symbol: "SISE.IS",   name: "Turkiye Sise ve Cam" },
    { symbol: "EREGL.IS",  name: "Eregli Demir Celik" },
    { symbol: "BIMAS.IS",  name: "BIM Birlesik Magazalar" },
  ],
  lse: [
    { symbol: "SHEL.L",  name: "Shell plc" },
    { symbol: "AZN.L",   name: "AstraZeneca" },
    { symbol: "HSBA.L",  name: "HSBC Holdings" },
    { symbol: "ULVR.L",  name: "Unilever" },
    { symbol: "BP.L",    name: "BP plc" },
    { symbol: "RIO.L",   name: "Rio Tinto" },
    { symbol: "LSEG.L",  name: "London Stock Exchange" },
    { symbol: "BARC.L",  name: "Barclays" },
  ],
  eu: [
    { symbol: "SAP.DE",   name: "SAP SE" },
    { symbol: "SIE.DE",   name: "Siemens AG" },
    { symbol: "MC.PA",    name: "LVMH" },
    { symbol: "ASML.AS",  name: "ASML Holding" },
    { symbol: "TTE.PA",   name: "TotalEnergies" },
    { symbol: "OR.PA",    name: "L'Oreal" },
    { symbol: "AIR.PA",   name: "Airbus" },
    { symbol: "BMW.DE",   name: "BMW AG" },
  ],
  asia: [
    { symbol: "7203.T",   name: "Toyota Motor" },
    { symbol: "9984.T",   name: "SoftBank Group" },
    { symbol: "0700.HK",  name: "Tencent Holdings" },
    { symbol: "9988.HK",  name: "Alibaba Group" },
    { symbol: "005930.KS", name: "Samsung Electronics" },
    { symbol: "RELIANCE.NS", name: "Reliance Industries" },
    { symbol: "6758.T",   name: "Sony Group" },
    { symbol: "2330.TW",  name: "TSMC" },
  ],
  crypto: [
    { symbol: "BTC-USD",  name: "Bitcoin USD" },
    { symbol: "ETH-USD",  name: "Ethereum USD" },
    { symbol: "SOL-USD",  name: "Solana USD" },
    { symbol: "BNB-USD",  name: "Binance Coin USD" },
    { symbol: "XRP-USD",  name: "Ripple USD" },
    { symbol: "ADA-USD",  name: "Cardano USD" },
    { symbol: "DOGE-USD", name: "Dogecoin USD" },
    { symbol: "AVAX-USD", name: "Avalanche USD" },
  ],
};

const RECENT_KEY = "sm_recent_searches";
const MAX_RECENT = 10;

function getRecent(): { symbol: string; name: string }[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecent(symbol: string, name: string) {
  const prev = getRecent().filter((r) => r.symbol !== symbol);
  localStorage.setItem(RECENT_KEY, JSON.stringify([{ symbol, name }, ...prev].slice(0, MAX_RECENT)));
}

function removeRecent(symbol: string) {
  const prev = getRecent().filter((r) => r.symbol !== symbol);
  localStorage.setItem(RECENT_KEY, JSON.stringify(prev));
}

interface Props {
  size?: "hero" | "compact";
  placeholder?: string;
}

export default function StockSearch({
  size = "hero",
  placeholder = "Search stocks, crypto, or people…",
}: Props) {
  const router            = useRouter();
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const [recent,  setRecent]  = useState<{ symbol: string; name: string }[]>([]);
  const [market,  setMarket]  = useState("");
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: liveResults, isLoading: searching } = useSearch(query, market || undefined);
  const { users: userResults } = useUserSearch(query);

  // Load recent on mount
  useEffect(() => { setRecent(getRecent()); }, []);

  // Cmd+K / "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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

  const popularList = POPULAR[market] ?? POPULAR[""];
  const suggestions =
    query.length === 0
      ? popularList
      : liveResults && liveResults.length > 0
      ? liveResults.map((r) => ({ symbol: r.symbol, name: r.name }))
      : popularList.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query.toLowerCase()) ||
            s.name.toLowerCase().includes(query.toLowerCase())
        );

  const navigate = (symbol: string, name = "") => {
    const upper = symbol.toUpperCase();
    saveRecent(upper, name || upper);
    setRecent(getRecent());
    setQuery("");
    setOpen(false);
    setSelectedSymbol(upper);
    if (size === "hero") router.push("/dashboard");
  };

  const navigateToProfile = (userId: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/profile/${userId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0 && query.trim()) {
      navigate(suggestions[0].symbol, suggestions[0].name);
    }
  };

  const handleRemoveRecent = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    removeRecent(symbol);
    setRecent(getRecent());
  };

  const isHero    = size === "hero";
  const showRecent = query.length === 0 && recent.length > 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center rounded-xl transition-all duration-200"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: focused ? "1px solid var(--accent-green)" : "1px solid var(--border-bright)",
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
          {/* Cmd+K hint — only in hero, only when not focused */}
          {isHero && !focused && (
            <span className="mr-3 hidden sm:flex items-center gap-1 text-xs font-mono"
              style={{ color: "var(--text-muted)" }}>
              <kbd className="px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--bg-subtle)" }}>⌘K</kbd>
            </span>
          )}
          {searching && (
            <span className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mr-3 shrink-0"
              style={{ borderColor: "var(--accent-green)" }} />
          )}
          <button
            type="submit"
            className={`mr-2 flex items-center gap-1.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              isHero ? "px-4 py-2" : "px-3 py-1.5"
            }`}
            style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
          >
            {isHero ? <><span>Analyze</span><ArrowRight size={14} /></> : <ArrowRight size={14} />}
          </button>
        </div>
      </form>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-y-auto z-50"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            maxHeight: "400px",
          }}
        >
          {/* Market filter */}
          <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1.5 overflow-x-auto"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <Globe size={12} className="shrink-0" style={{ color: "var(--text-muted)" }} />
            {MARKETS.map((m) => (
              <button
                key={m.key}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setMarket(m.key); }}
                className="px-2.5 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap transition-all"
                style={{
                  backgroundColor: market === m.key ? "rgba(0,230,118,0.15)" : "transparent",
                  color: market === m.key ? "var(--accent-green)" : "var(--text-muted)",
                  border: market === m.key ? "1px solid rgba(0,230,118,0.3)" : "1px solid transparent",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Recent searches */}
          {showRecent && (
            <>
              <p className="px-4 pt-2.5 pb-1 text-xs font-medium tracking-wider uppercase"
                style={{ color: "var(--text-muted)" }}>
                Recent
              </p>
              {recent.slice(0, 5).map((r) => (
                <button key={r.symbol} type="button" onMouseDown={() => navigate(r.symbol, r.name)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="flex items-center gap-3">
                    <Clock size={13} style={{ color: "var(--text-muted)" }} />
                    <span className="font-mono text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {r.symbol}
                    </span>
                    <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                      {r.name}
                    </span>
                  </div>
                  <span onMouseDown={(e) => handleRemoveRecent(e, r.symbol)}
                    className="p-1 rounded transition-colors"
                    style={{ color: "var(--text-muted)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <X size={12} />
                  </span>
                </button>
              ))}
              <div className="mx-4 my-1" style={{ height: "1px", backgroundColor: "var(--border)" }} />
            </>
          )}

          {/* Stocks */}
          {suggestions.length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-xs font-medium tracking-wider uppercase"
                style={{ color: "var(--text-muted)" }}>
                {query.length === 0 ? "Popular" : "Stocks"}
              </p>
              {suggestions.slice(0, query.length > 0 && userResults.length > 0 ? 5 : 8).map((s) => (
                <button key={s.symbol} type="button" onMouseDown={() => navigate(s.symbol, s.name)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium w-16" style={{ color: "var(--text-primary)" }}>
                      {s.symbol}
                    </span>
                    <span className="text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                      {s.name}
                    </span>
                  </div>
                  <ArrowRight size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              ))}
            </>
          )}

          {/* People */}
          {query.length >= 2 && userResults.length > 0 && (
            <>
              <div className="mx-4 my-1" style={{ height: "1px", backgroundColor: "var(--border)" }} />
              <p className="px-4 pt-2 pb-1 text-xs font-medium tracking-wider uppercase"
                style={{ color: "var(--text-muted)" }}>
                People
              </p>
              {userResults.map((u) => (
                <button key={u.user_id} type="button" onMouseDown={() => navigateToProfile(u.user_id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: `${u.avatar_color}20`,
                        color: u.avatar_color,
                        border: `1px solid ${u.avatar_color}40`,
                      }}
                    >
                      {safeImageUrl(u.avatar_url) ? (
                        <img src={safeImageUrl(u.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.display_name[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {u.display_name}
                    </span>
                  </div>
                  <User size={12} style={{ color: "var(--text-muted)" }} />
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
