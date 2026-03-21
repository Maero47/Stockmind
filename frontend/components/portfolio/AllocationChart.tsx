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

  const sorted = [...positions].sort((a, b) => b.marketValue - a.marketValue);
  const data = sorted.map((p) => ({
    name: p.symbol,
    value: p.marketValue,
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
      className="rounded-xl p-5 h-full"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <p
        className="text-[10px] font-medium tracking-widest uppercase mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Allocation
      </p>

      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[220px] aspect-square">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="30%"
                outerRadius="46%"
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
                <span className="text-[10px] font-bold font-mono" style={{ color: COLORS[hovered! % COLORS.length] }}>
                  {active.name}
                </span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  ${fmt(active.value)}
                </span>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
                  {fmt(active.pct)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total</span>
                <span className="text-sm font-bold font-mono" style={{ color: "var(--text-primary)" }}>
                  {fmtTotal}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="w-full mt-4 space-y-1">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs px-1 py-1 rounded-md transition-colors cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ backgroundColor: hovered === i ? "rgba(255,255,255,0.04)" : "transparent" }}
            >
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>{d.name}</span>
              <span className="ml-auto font-mono" style={{ color: "var(--text-muted)" }}>{fmt(d.pct)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
