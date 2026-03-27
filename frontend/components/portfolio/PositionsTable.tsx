"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Pencil, Trash2, Briefcase, ArrowUpRight } from "lucide-react";
import type { EnrichedPosition } from "@/hooks/usePortfolioStats";
import { currencySymbol } from "@/lib/currency";

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

interface Props {
  positions: EnrichedPosition[];
  onEdit: (position: EnrichedPosition) => void;
  onDelete: (id: number) => void;
}

export default function PositionsTable({ positions, onEdit, onDelete }: Props) {
  if (!positions.length) {
    return (
      <div
        className="rounded-xl p-16 text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: "rgba(41,121,255,0.08)" }}
        >
          <Briefcase size={24} style={{ color: "#2979FF" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No positions yet</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Search for a stock above and add your first position to start tracking your portfolio
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Asset", "Shares", "Avg Cost", "Price", "Market Value", "P&L", "Today", "Weight", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p, idx) => {
              const pnlPos = p.unrealizedPnl >= 0;
              const dailyPos = (p.dailyChange ?? 0) >= 0;
              const isLast = idx === positions.length - 1;
              const cs = currencySymbol(p.currency);
              return (
                <tr
                  key={p.id}
                  className="transition-colors group"
                  style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.015)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <td className="px-4 py-3.5">
                    <Link href={`/stock/${p.symbol}`} className="flex items-center gap-1.5 group/link">
                      <span className="font-mono font-bold text-sm" style={{ color: "var(--accent-green)" }}>
                        {p.symbol}
                      </span>
                      <ArrowUpRight
                        size={10}
                        className="opacity-0 group-hover/link:opacity-100 transition-opacity"
                        style={{ color: "var(--text-muted)" }}
                      />
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 font-mono" style={{ color: "var(--text-primary)" }}>
                    {fmt(p.quantity, p.quantity % 1 === 0 ? 0 : 4)}
                  </td>
                  <td className="px-4 py-3.5 font-mono" style={{ color: "var(--text-secondary)" }}>
                    {cs}{fmt(p.avg_buy_price)}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                    {p.currentPrice ? `${cs}${fmt(p.currentPrice)}` : "--"}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                    {cs}{fmt(p.marketValue)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col">
                      <span className="font-mono font-medium" style={{ color: pnlPos ? "var(--accent-green)" : "var(--accent-red)" }}>
                        {pnlPos ? "+" : ""}{cs}{fmt(p.unrealizedPnl)}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: pnlPos ? "var(--accent-green)" : "var(--accent-red)", opacity: 0.7 }}>
                        {pnlPos ? "+" : ""}{fmt(p.unrealizedPnlPct)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono">
                    {p.dailyChange !== null ? (
                      <span className="flex items-center gap-1" style={{ color: dailyPos ? "var(--accent-green)" : "var(--accent-red)" }}>
                        {dailyPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {dailyPos ? "+" : ""}{fmt(p.dailyChange)}%
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>--</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div
                      className="flex items-center gap-1.5"
                    >
                      <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${Math.min(p.allocation, 100)}%`, backgroundColor: "var(--accent-green)", opacity: 0.6 }}
                        />
                      </div>
                      <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {fmt(p.allocation, 1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(p)}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="p-1.5 rounded-md transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent-red)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {positions.map((p, idx) => {
          const pnlPos = p.unrealizedPnl >= 0;
          const isLast = idx === positions.length - 1;
          const cs = currencySymbol(p.currency);
          return (
            <div
              key={p.id}
              className="p-4"
              style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <Link href={`/stock/${p.symbol}`} className="flex items-center gap-1">
                  <span className="font-mono font-bold text-sm" style={{ color: "var(--accent-green)" }}>{p.symbol}</span>
                  <ArrowUpRight size={10} style={{ color: "var(--text-muted)" }} />
                </Link>
                <div className="flex items-center gap-1">
                  <button onClick={() => onEdit(p)} className="p-1.5" style={{ color: "var(--text-muted)" }}><Pencil size={12} /></button>
                  <button onClick={() => onDelete(p.id)} className="p-1.5" style={{ color: "var(--text-muted)" }}><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs font-mono">
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Shares </span>
                  <span style={{ color: "var(--text-primary)" }}>{fmt(p.quantity, p.quantity % 1 === 0 ? 0 : 4)}</span>
                </div>
                <div className="text-right">
                  <span style={{ color: "var(--text-muted)" }}>Value </span>
                  <span style={{ color: "var(--text-primary)" }}>{cs}{fmt(p.marketValue)}</span>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Avg </span>
                  <span style={{ color: "var(--text-secondary)" }}>{cs}{fmt(p.avg_buy_price)}</span>
                </div>
                <div className="text-right">
                  <span style={{ color: "var(--text-muted)" }}>P&L </span>
                  <span style={{ color: pnlPos ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {pnlPos ? "+" : ""}{fmt(p.unrealizedPnlPct)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
