"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { EnrichedPosition } from "@/hooks/usePortfolioStats";

const COLORS = [
  "#00E676", "#2979FF", "#FF6D00", "#AA00FF", "#FFD600",
  "#00BCD4", "#FF1744", "#76FF03", "#F50057", "#00E5FF",
];

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  positions: EnrichedPosition[];
  totalValue: number;
}

export default function AllocationChart({ positions, totalValue }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!positions.length) return null;

  const sorted = [...positions].sort((a, b) => b.marketValueUsd - a.marketValueUsd);
  const data = sorted.map((p) => ({
    name: p.symbol,
    value: p.marketValueUsd,
    pct: p.allocation,
  }));

  const active = hovered !== null ? data[hovered] : null;

  const fmtTotal = totalValue >= 1_000_000
    ? `$${(totalValue / 1_000_000).toFixed(2)}M`
    : totalValue >= 1_000
    ? `$${(totalValue / 1_000).toFixed(1)}K`
    : `$${fmt(totalValue)}`;

  return (
    <div
      className="rounded-xl p-5 h-full w-full flex flex-col"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-[10px] font-medium tracking-widest uppercase mb-2 shrink-0"
        style={{ color: "var(--text-muted)" }}
      >
        Allocation
      </p>

      {/* Donut */}
      <div className="flex items-center justify-center">
        <div className="relative shrink-0" style={{ width: "260px", height: "260px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                dataKey="value"
                stroke="none"
                animationBegin={0}
                animationDuration={600}
                onMouseEnter={(_, i) => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    opacity={hovered !== null && hovered !== i ? 0.4 : 1}
                    style={{ transition: "opacity 0.15s" }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {active ? (
              <>
                <span className="text-xs font-bold font-mono" style={{ color: COLORS[hovered! % COLORS.length] }}>
                  {active.name}
                </span>
                <span className="text-lg font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  ${fmt(active.value)}
                </span>
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {fmt(active.pct)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-lg font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {fmtTotal}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend — scrollable when many assets */}
      <div
        className="shrink-0 mt-2 overflow-y-auto space-y-0.5 pr-1"
        style={{ maxHeight: "160px" }}
      >
        {data.map((d, i) => (
          <div
            key={d.name}
            className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ backgroundColor: hovered === i ? "rgba(255,255,255,0.04)" : "transparent" }}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</span>
            <span className="ml-auto font-mono" style={{ color: "var(--text-muted)" }}>{fmt(d.pct)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
