"use client";

import { useIndicators } from "@/hooks/useStockData";

function badge(signal: string, color: string) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {signal}
    </span>
  );
}

function IndicatorCard({
  label, value, sub, signal, color, extra,
}: {
  label: string;
  value: string;
  sub?: string;
  signal: string;
  color: string;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
        {badge(signal, color)}
      </div>
      <span className="font-mono text-xl font-medium tabular-nums" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
      {sub && <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{sub}</span>}
      {extra}
    </div>
  );
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

interface Props { symbol: string }

export default function TechnicalIndicators({ symbol }: Props) {
  const { data: ind, isLoading } = useIndicators(symbol);

  if (isLoading || !ind) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => (
          <div
            key={i}
            className="h-28 rounded-xl animate-pulse"
            style={{ backgroundColor: "var(--bg-surface)" }}
          />
        ))}
      </div>
    );
  }

  const rsi       = typeof ind.rsi       === "number" ? ind.rsi       : null;
  const macd      = typeof ind.macd      === "number" ? ind.macd      : null;
  const macdSig   = typeof ind.macd_signal === "number" ? ind.macd_signal : null;
  const macdDiff  = typeof ind.macd_diff === "number" ? ind.macd_diff : null;
  const bbPct     = typeof ind.bb_pct    === "number" ? ind.bb_pct    : null;
  const volRatio  = typeof ind.vol_ratio === "number" ? ind.vol_ratio : null;
  const stochK    = typeof ind.stoch_k   === "number" ? ind.stoch_k   : null;

  // RSI
  const rsiSignal = rsi == null ? "—" : rsi >= 70 ? "Overbought" : rsi <= 30 ? "Oversold" : "Neutral";
  const rsiColor  = rsi == null ? "var(--text-muted)" : rsi >= 70 ? "var(--accent-red)" : rsi <= 30 ? "var(--accent-green)" : "var(--text-secondary)";

  // MACD
  const macdSignal = macdDiff == null ? "—" : macdDiff > 0 ? "Bullish" : "Bearish";
  const macdColor  = macdDiff == null ? "var(--text-muted)" : macdDiff > 0 ? "var(--accent-green)" : "var(--accent-red)";

  // Bollinger
  const bbPct100 = bbPct != null ? bbPct * 100 : null;
  const bbSignal = bbPct100 == null ? "—" : bbPct100 >= 80 ? "Near Upper" : bbPct100 <= 20 ? "Near Lower" : "Mid Band";
  const bbColor  = bbPct100 == null ? "var(--text-muted)" : bbPct100 >= 80 ? "var(--accent-amber)" : bbPct100 <= 20 ? "var(--accent-blue)" : "var(--text-secondary)";

  // Volume
  const volSignal = volRatio == null ? "—" : volRatio >= 1.5 ? "High" : volRatio <= 0.5 ? "Low" : "Normal";
  const volColor  = volRatio == null ? "var(--text-muted)" : volRatio >= 1.5 ? "var(--accent-amber)" : "var(--text-secondary)";

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* RSI */}
      <IndicatorCard
        label="RSI (14)"
        value={rsi != null ? rsi.toFixed(1) : "—"}
        signal={rsiSignal}
        color={rsiColor}
        extra={rsi != null && <MiniBar pct={rsi} color={rsiColor} />}
      />

      {/* MACD */}
      <IndicatorCard
        label="MACD"
        value={macd != null ? macd.toFixed(3) : "—"}
        sub={macdSig != null ? `Signal: ${macdSig.toFixed(3)}` : undefined}
        signal={macdSignal}
        color={macdColor}
        extra={
          macdDiff != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Hist</span>
              <span
                className="font-mono text-xs"
                style={{ color: macdDiff > 0 ? "var(--accent-green)" : "var(--accent-red)" }}
              >
                {macdDiff > 0 ? "+" : ""}{macdDiff.toFixed(3)}
              </span>
            </div>
          )
        }
      />

      {/* Bollinger Bands */}
      <IndicatorCard
        label="Bollinger Bands"
        value={bbPct100 != null ? `${bbPct100.toFixed(0)}%` : "—"}
        sub="Position within bands"
        signal={bbSignal}
        color={bbColor}
        extra={bbPct100 != null && <MiniBar pct={bbPct100} color={bbColor} />}
      />

      {/* Volume */}
      <IndicatorCard
        label="Volume Ratio"
        value={volRatio != null ? `${volRatio.toFixed(2)}×` : "—"}
        sub={
          volRatio != null
            ? volRatio >= 1
              ? `+${((volRatio - 1) * 100).toFixed(0)}% vs 20d avg`
              : `${((volRatio - 1) * 100).toFixed(0)}% vs 20d avg`
            : undefined
        }
        signal={volSignal}
        color={volColor}
        extra={
          stochK != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Stoch %K</span>
              <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                {stochK.toFixed(1)}
              </span>
            </div>
          )
        }
      />
    </div>
  );
}
