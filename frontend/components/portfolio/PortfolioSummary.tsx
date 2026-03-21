"use client";

import { DollarSign, TrendingUp, TrendingDown, Activity, Wallet } from "lucide-react";
import type { PortfolioSummary as SummaryType } from "@/hooks/usePortfolioStats";

function fmt(n: number, decimals = 2): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function StatCard({ label, value, sub, icon: Icon, accent, glow }: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof DollarSign;
  accent: string;
  glow?: string;
}) {
  return (
    <div
      className="rounded-xl p-4 relative overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
      }}
    >
      {glow && (
        <div
          className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.07] blur-2xl"
          style={{ backgroundColor: glow }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {label}
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${accent}15` }}
          >
            <Icon size={14} style={{ color: accent }} />
          </div>
        </div>
        <p className="text-xl font-bold font-mono tracking-tight" style={{ color: "var(--text-primary)" }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs font-mono mt-1" style={{ color: accent }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

interface Props {
  summary: SummaryType;
}

export default function PortfolioSummary({ summary }: Props) {
  const pnlPositive = summary.totalPnl >= 0;
  const dailyPositive = summary.dailyChange >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Portfolio Value"
        value={`$${fmt(summary.totalValue)}`}
        sub={`${summary.positionCount} position${summary.positionCount !== 1 ? "s" : ""}`}
        icon={Wallet}
        accent="#2979FF"
        glow="#2979FF"
      />
      <StatCard
        label="Total Invested"
        value={`$${fmt(summary.totalCost)}`}
        icon={DollarSign}
        accent="var(--text-secondary)"
      />
      <StatCard
        label="Unrealized P&L"
        value={`${pnlPositive ? "+" : ""}$${fmt(summary.totalPnl)}`}
        sub={`${pnlPositive ? "+" : ""}${fmt(summary.totalPnlPct)}%`}
        icon={pnlPositive ? TrendingUp : TrendingDown}
        accent={pnlPositive ? "var(--accent-green)" : "var(--accent-red)"}
        glow={pnlPositive ? "#00E676" : "#FF1744"}
      />
      <StatCard
        label="Today"
        value={`${dailyPositive ? "+" : ""}$${fmt(summary.dailyChange)}`}
        sub={`${dailyPositive ? "+" : ""}${fmt(summary.dailyChangePct)}%`}
        icon={Activity}
        accent={dailyPositive ? "var(--accent-green)" : "var(--accent-red)"}
        glow={dailyPositive ? "#00E676" : "#FF1744"}
      />
    </div>
  );
}
