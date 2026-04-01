"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { getBatchQuotes, type TickerQuote } from "@/lib/api";

const PAIRS = [
  "EURUSD=X", "GBPUSD=X", "USDJPY=X", "USDCHF=X",
  "AUDUSD=X", "USDCAD=X", "USDTRY=X", "EURGBP=X",
];

const DISPLAY_NAMES: Record<string, string> = {
  "EURUSD=X": "EUR/USD",
  "GBPUSD=X": "GBP/USD",
  "USDJPY=X": "USD/JPY",
  "USDCHF=X": "USD/CHF",
  "AUDUSD=X": "AUD/USD",
  "USDCAD=X": "USD/CAD",
  "USDTRY=X": "USD/TRY",
  "EURGBP=X": "EUR/GBP",
};

function TickerItem({ quote }: { quote: TickerQuote }) {
  const pct = quote.change_pct ?? 0;
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const color = isFlat ? "var(--text-muted)" : isUp ? "var(--accent-green)" : "var(--accent-red)";
  const decimals = (quote.price ?? 0) < 10 ? 4 : 2;

  return (
    <Link
      href={`/stock/${quote.symbol}`}
      className="flex items-center gap-2 px-4 shrink-0 transition-opacity hover:opacity-70"
    >
      <span className="font-mono text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
        {DISPLAY_NAMES[quote.symbol] ?? quote.symbol}
      </span>
      <span className="font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>
        {(quote.price ?? 0).toFixed(decimals)}
      </span>
      <span className="font-mono text-[11px] font-medium" style={{ color }}>
        {isUp ? "+" : ""}{pct.toFixed(2)}%
      </span>
    </Link>
  );
}

function TickerSkeleton({ symbol }: { symbol: string }) {
  return (
    <div className="flex items-center gap-2 px-4 shrink-0">
      <span className="font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
        {DISPLAY_NAMES[symbol] ?? symbol}
      </span>
      <span className="h-3 w-12 rounded animate-pulse" style={{ background: "var(--bg-subtle)" }} />
    </div>
  );
}

export default function CurrencyTicker() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const { data: quotes } = useSWR(
    "currency-ticker",
    () => getBatchQuotes(PAIRS),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const quoteMap = new Map((quotes ?? []).map((q) => [q.symbol, q]));

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let frame: number;
    let pos = 0;

    function step() {
      if (!paused && el) {
        pos += 0.5;
        if (pos >= el.scrollWidth / 2) pos = 0;
        el.scrollLeft = pos;
      }
      frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [paused]);

  return (
    <div
      className="w-full overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollRef}
        className="flex items-center py-2 overflow-hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {[...PAIRS, ...PAIRS].map((sym, i) => {
          const q = quoteMap.get(sym);
          return q
            ? <TickerItem key={`${sym}-${i}`} quote={q} />
            : <TickerSkeleton key={`${sym}-${i}`} symbol={sym} />;
        })}
      </div>
    </div>
  );
}
