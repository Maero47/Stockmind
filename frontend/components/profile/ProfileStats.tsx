"use client";

import { DollarSign, Briefcase, Users, UserPlus, Target } from "lucide-react";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";
import { useFollows } from "@/hooks/useFollows";

function Stat({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof DollarSign; color: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold font-mono" style={{ color: "var(--text-primary)" }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

function formatValue(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

interface Props {
  userId: string;
  isOwn?: boolean;
  predictionsCount?: number;
}

export default function ProfileStats({ userId, isOwn, predictionsCount = 0 }: Props) {
  const { summary, positions } = usePortfolioStats();
  const { counts } = useFollows(userId);

  const topHolding = positions.length > 0
    ? positions.reduce((a, b) => ((a.marketValue ?? 0) > (b.marketValue ?? 0) ? a : b)).symbol
    : "--";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {isOwn ? (
        <>
          <Stat label="Portfolio Value" value={summary.totalValue > 0 ? formatValue(summary.totalValue) : "--"} icon={DollarSign} color="var(--accent-green)" />
          <Stat label="Top Holding" value={topHolding} icon={Briefcase} color="var(--accent-blue)" />
        </>
      ) : (
        <>
          <Stat label="Predictions" value={predictionsCount} icon={Target} color="var(--accent-green)" />
        </>
      )}
      <Stat label="Followers" value={counts.followers} icon={Users} color={isOwn ? "var(--accent-amber)" : "var(--accent-blue)"} />
      <Stat label="Following" value={counts.following} icon={UserPlus} color="#AA00FF" />
    </div>
  );
}
