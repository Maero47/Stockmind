"use client";

import Link from "next/link";
import { Bookmark, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useQuote } from "@/hooks/useStockData";

function WatchlistCard({ symbol, onRemove }: { symbol: string; onRemove: () => void }) {
  const { data: quote } = useQuote(symbol);

  const price     = quote?.price ?? null;
  const changePct = quote?.change_pct ?? null;
  const isPos     = (changePct ?? 0) > 0;
  const isFlat    = (changePct ?? 0) === 0;
  const color     = isFlat ? "var(--text-muted)" : isPos ? "var(--accent-green)" : "var(--accent-red)";
  const Icon      = isFlat ? Minus : isPos ? TrendingUp : TrendingDown;

  return (
    <div
      className="glass-card p-4 flex items-center justify-between gap-3 group"
      style={{ position: "relative" }}
    >
      <Link href={`/stock/${symbol}`} className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-semibold" style={{ color: "var(--accent-green)" }}>
              {symbol}
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
              {quote?.name ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>
              {price != null ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
            </p>
            <p className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color }}>
              <Icon size={11} />
              {changePct != null ? `${isPos ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
            </p>
          </div>
        </div>
      </Link>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
        style={{ color: "var(--text-muted)" }}
        title="Remove"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function WatchlistTab() {
  const { items, isLoading, remove } = useWatchlist();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse h-20" style={{ background: "var(--bg-subtle)" }} />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Bookmark size={40} style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No symbols in your watchlist yet.
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Click <strong style={{ color: "var(--text-secondary)" }}>Watch</strong> on any stock page to add it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => (
        <WatchlistCard key={item.symbol} symbol={item.symbol} onRemove={() => remove(item.symbol)} />
      ))}
    </div>
  );
}
