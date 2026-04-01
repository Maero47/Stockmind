"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Brain, RefreshCw } from "lucide-react";
import { usePrediction } from "@/hooks/useStockData";
import type { SignalType } from "@/lib/types";

const SIGNAL_CONFIG: Record<
  SignalType,
  { label: string; color: string; bg: string; Icon: React.ElementType; glowClass: string }
> = {
  UP: {
    label: "BUY",
    color: "var(--accent-green)",
    bg:    "rgba(0,230,118,0.08)",
    Icon:  TrendingUp,
    glowClass: "badge-buy",
  },
  HOLD: {
    label: "HOLD",
    color: "var(--accent-amber)",
    bg:    "rgba(255,179,0,0.08)",
    Icon:  Minus,
    glowClass: "badge-hold",
  },
  DOWN: {
    label: "SELL",
    color: "var(--accent-red)",
    bg:    "rgba(255,61,87,0.08)",
    Icon:  TrendingDown,
    glowClass: "badge-sell",
  },
};

interface Props { symbol: string }

export default function PredictionCard({ symbol }: Props) {
  const { data: pred, isLoading, error, mutate } = usePrediction(symbol);
  const [spinning, setSpinning] = useState(false);

  function handleRefresh() {
    setSpinning(true);
    const minSpin = new Promise((r) => setTimeout(r, 600));
    Promise.all([mutate(), minSpin]).finally(() => setSpinning(false));
  }

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-5 animate-pulse"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-4 w-4 rounded" style={{ background: "var(--bg-subtle)" }} />
          <div className="h-4 w-28 rounded" style={{ background: "var(--bg-subtle)" }} />
        </div>
        <div className="h-16 rounded-lg mb-4" style={{ background: "var(--bg-subtle)" }} />
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-3 rounded" style={{ background: "var(--bg-subtle)", width: `${80 - i*10}%` }} />)}
        </div>
      </div>
    );
  }

  if (error || !pred) {
    const is404 = error?.message?.includes("404") || error?.message?.includes("Not Found");
    return (
      <div
        className="rounded-xl p-5"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} style={{ color: "var(--accent-amber)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>ML Prediction</span>
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {is404
            ? "ML prediction not available for this symbol."
            : "No prediction data"}
        </p>
        {!is404 && (
          <button
            onClick={handleRefresh}
            disabled={spinning}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            <RefreshCw size={11} className={spinning ? "animate-spin" : ""} /> Run Prediction
          </button>
        )}
      </div>
    );
  }

  const cfg = SIGNAL_CONFIG[pred.signal];
  const Icon = cfg.Icon;
  const confPct = pred.confidence * 100;

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} style={{ color: "var(--accent-blue)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            XGBoost ML Prediction
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={spinning}
          className="p-1 rounded transition-colors hover:bg-bg-subtle"
          title="Refresh prediction"
        >
          <RefreshCw
            size={12}
            className={spinning ? "animate-spin" : ""}
            style={{ color: "var(--text-muted)" }}
          />
        </button>
      </div>

      {/* Signal badge */}
      <div
        className={`rounded-xl p-4 flex items-center justify-between mb-4 ${cfg.glowClass}`}
        style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${cfg.color}18` }}
          >
            <Icon size={20} style={{ color: cfg.color }} />
          </div>
          <div>
            <p className="font-mono text-2xl font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>next-day direction</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-xl font-bold" style={{ color: cfg.color }}>
            {confPct.toFixed(0)}%
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>confidence</p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span style={{ color: "var(--text-muted)" }}>Model confidence</span>
          <span className="font-mono" style={{ color: cfg.color }}>{confPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: cfg.color }}
            initial={{ width: 0 }}
            animate={{ width: `${confPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          <span>50% (random)</span>
          <span>100%</span>
        </div>
      </div>

      {/* Top feature importances */}
      <div>
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Top contributing features</p>
        <div className="space-y-1.5">
          {pred.feature_importances.slice(0, 5).map((fi) => (
            <div key={fi.feature} className="flex items-center gap-2">
              <span
                className="font-mono text-xs w-28 truncate shrink-0"
                style={{ color: "var(--text-secondary)" }}
              >
                {fi.feature}
              </span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-subtle)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: `${cfg.color}80` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${fi.importance * 100 * 7}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
              <span className="font-mono text-xs w-10 text-right shrink-0" style={{ color: "var(--text-muted)" }}>
                {(fi.importance * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs mt-3 pt-3" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
        Trained on {pred.samples_trained.toLocaleString()} bars ·{" "}
        {(pred.training_accuracy * 100).toFixed(1)}% test accuracy
        <span className="ml-1 opacity-60">(50% = random)</span>
      </p>

      {/* Disclaimer */}
      <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
        This is a statistical model based on historical technical indicators. It is not financial advice.
        Past patterns do not guarantee future results. Always do your own research before making investment decisions.
      </p>
    </div>
  );
}
