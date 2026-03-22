"use client";

import Link from "next/link";
import { Bookmark, X, TrendingUp, TrendingDown, Minus, GripVertical } from "lucide-react";
import { Reorder } from "framer-motion";
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
    <div className="flex items-center gap-2">
      <GripVertical
        size={14}
        className="shrink-0 cursor-grab active:cursor-grabbing"
        style={{ color: "var(--text-muted)" }}
      />
      <div
        className="glass-card p-4 flex items-center justify-between gap-3 group flex-1"
        style={{ position: "relative" }}
      >
        <Link href={`/stock/${symbol}`} className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-semibold" style={{ color: "var(--accent-green)" }}>
                {symbol}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                {quote?.name ?? "\u2014"}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {price != null ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "\u2014"}
              </p>
              <p className="flex items-center justify-end gap-1 text-xs font-mono" style={{ color }}>
                <Icon size={11} />
                {changePct != null ? `${isPos ? "+" : ""}${changePct.toFixed(2)}%` : "\u2014"}
              </p>
            </div>
          </div>
        </Link>
        <button
          onClick={onRemove}
          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-2 -mr-1 rounded"
          style={{ color: "var(--text-muted)" }}
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function WatchlistTab() {
  const { items, isLoading, remove, reorder, symbols } = useWatchlist();

  if (isLoading) {
    return (
      <div className="space-y-3">
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
    <Reorder.Group
      axis="y"
      values={symbols}
      onReorder={reorder}
      className="space-y-2"
      as="div"
    >
      {symbols.map((sym) => (
        <Reorder.Item key={sym} value={sym} as="div">
          <WatchlistCard symbol={sym} onRemove={() => remove(sym)} />
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}
