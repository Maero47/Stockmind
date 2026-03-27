"use client";

import useSWR from "swr";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCryptoMovers } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { StockQuote } from "@/lib/types";
import { currencySymbol } from "@/lib/currency";

function fmt(price: number | null, cs = "$"): string {
  if (price == null) return "—";
  if (price >= 1000) return `${cs}${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (price >= 1)    return `${cs}${price.toFixed(2)}`;
  return `${cs}${price.toFixed(4)}`;
}

function MoverRow({ quote, type }: { quote: StockQuote; type: "gainer" | "loser" }) {
  const router         = useRouter();
  const setSymbol      = useStore((s) => s.setSelectedSymbol);
  const isGainer       = type === "gainer";
  const color          = isGainer ? "var(--accent-green)" : "var(--accent-red)";
  const pct            = quote.change_pct;
  const label          = pct != null ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "—";
  const shortName      = quote.name?.replace(/ USD$| \(.*\)/, "") ?? quote.symbol;

  function handleClick() {
    setSymbol(quote.symbol);
    router.push("/dashboard");
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all group"
      style={{ backgroundColor: "var(--bg-elevated)" }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {quote.symbol.replace("-USD", "").slice(0, 3)}
        </div>
        <div className="min-w-0 text-left">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {quote.symbol.replace("-USD", "")}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
            {shortName}
          </p>
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-2">
        <p className="text-xs font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
          {fmt(quote.price, currencySymbol(quote.currency))}
        </p>
        <p className="text-xs font-mono font-semibold" style={{ color }}>
          {label}
        </p>
      </div>
    </button>
  );
}

function Column({
  title, quotes, type, color, icon: Icon,
}: {
  title: string;
  quotes: StockQuote[];
  type: "gainer" | "loser";
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div
      className="rounded-xl p-4 flex-1"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} style={{ color }} />
        <span className="text-xs font-mono font-semibold tracking-widest uppercase" style={{ color }}>
          {title}
        </span>
      </div>
      <div className="space-y-1.5">
        {quotes.map((q) => (
          <MoverRow key={q.symbol} quote={q} type={type} />
        ))}
      </div>
    </div>
  );
}

export default function CryptoMovers() {
  const { data, isLoading } = useSWR(
    "crypto:movers",
    getCryptoMovers,
    { refreshInterval: 120_000, revalidateOnFocus: false }
  );

  return (
    <section className="max-w-7xl mx-auto px-6 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <span
          className="font-mono text-xs font-medium tracking-[0.25em] uppercase"
          style={{ color: "var(--accent-amber)" }}
        >
          Crypto Movers
        </span>
        <div
          className="w-16 h-px hidden sm:block"
          style={{ background: "linear-gradient(to right, var(--accent-amber)80, transparent)" }}
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>24h</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-xl h-52 animate-pulse"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }} />
          ))}
        </div>
      ) : !data ? null : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Column
            title="Top Gainers"
            quotes={data.gainers}
            type="gainer"
            color="var(--accent-green)"
            icon={TrendingUp}
          />
          <Column
            title="Top Losers"
            quotes={data.losers}
            type="loser"
            color="var(--accent-red)"
            icon={TrendingDown}
          />
        </div>
      )}
    </section>
  );
}
