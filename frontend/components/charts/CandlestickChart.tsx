"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  type IChartApi,
} from "lightweight-charts";
import { Maximize2, X, TrendingUp, BarChart2, Minus as MinusIcon, Trash2, Download, CandlestickChart as CandleIcon } from "lucide-react";
import type { OHLCVBar, TimePeriod, TimeInterval } from "@/lib/types";
import { useHistory } from "@/hooks/useStockData";

// ── Period config ─────────────────────────────────────────────────────────────

const PERIODS: { label: string; period: TimePeriod; interval: TimeInterval; fetch: TimePeriod }[] = [
  { label: "1D",  period: "1d",  interval: "5m",  fetch: "5d"  },
  { label: "1W",  period: "5d",  interval: "60m", fetch: "1mo" },
  { label: "1M",  period: "1mo", interval: "1d",  fetch: "3mo" },
  { label: "3M",  period: "3mo", interval: "1d",  fetch: "6mo" },
  { label: "1Y",  period: "1y",  interval: "1d",  fetch: "2y"  },
];

const OVERLAYS = ["EMA9", "EMA21", "BB"] as const;
type Overlay = (typeof OVERLAYS)[number];
type ChartType = "candlestick" | "line";

// ── Indicator math ────────────────────────────────────────────────────────────

function calcEMA(values: number[], period: number): (number | null)[] {
  const k = 2 / (period + 1);
  const out: (number | null)[] = Array(values.length).fill(null);
  let ema: number | null = null;
  for (let i = 0; i < values.length; i++) {
    ema = ema === null ? values[i] : values[i] * k + ema * (1 - k);
    if (i >= period - 1) out[i] = ema;
  }
  return out;
}

function calcBB(values: number[], period = 20) {
  return values.map((_, i) => {
    if (i < period - 1) return { upper: null, lower: null, middle: null };
    const slice = values.slice(i - period + 1, i + 1);
    if (slice.some((v) => Number.isNaN(v))) return { upper: null, lower: null, middle: null };
    const mean  = slice.reduce((a, b) => a + b, 0) / period;
    const std   = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
    return { upper: mean + 2 * std, lower: mean - 2 * std, middle: mean };
  });
}

function toChartTime(ts: string, isDaily: boolean): any {
  if (isDaily) return ts.slice(0, 10);
  return Math.floor(new Date(ts).getTime() / 1000);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

const T = {
  bg:    "#0D1117",
  grid:  "rgba(255,255,255,0.04)",
  text:  "#8B949E",
  border:"rgba(255,255,255,0.08)",
  green: "#00E676",
  red:   "#FF3D57",
  ema9:  "#2979FF",
  ema21: "#FFB300",
  bb:    "#9C27B0",
};

// ── Drawing types ─────────────────────────────────────────────────────────────

type DrawTool = "cursor" | "trendline" | "hline" | "ray";
interface Drawing {
  id: string; type: "trendline" | "hline" | "ray";
  x1: number; y1: number; x2: number; y2: number;
}

// ── Chart instance manager ────────────────────────────────────────────────────

function useChart(
  containerRef: React.RefObject<HTMLDivElement | null>,
  height:       number,
  bars:         OHLCVBar[],
  overlays:     Set<Overlay>,
  chartType:    ChartType,
  interval:     TimeInterval,
  period:       TimePeriod,
): React.RefObject<IChartApi | null> {
  const chart = useRef<IChartApi | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !bars.length) return;

    const validBars = bars.filter(
      (b) => b.open  != null && !Number.isNaN(b.open)  &&
             b.high  != null && !Number.isNaN(b.high)  &&
             b.low   != null && !Number.isNaN(b.low)   &&
             b.close != null && !Number.isNaN(b.close)
    );
    if (!validBars.length) return;

    const isDaily = interval === "1d" || interval === "1wk" || interval === "1mo";
    const t = (ts: string) => toChartTime(ts, isDaily);

    // Fresh chart every render — eliminates stale series state
    if (chart.current) { chart.current.remove(); chart.current = null; }

    const c = createChart(el, {
      autoSize: true,
      height,
      layout: {
        background: { type: ColorType.Solid, color: T.bg },
        textColor: T.text, fontFamily: "monospace", fontSize: 11,
      },
      grid: { vertLines: { color: T.grid }, horzLines: { color: T.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1F2937" },
        horzLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#1F2937" },
      },
      rightPriceScale: { borderColor: T.border, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: {
        borderColor: T.border, timeVisible: true, secondsVisible: false,
        fixLeftEdge: true, fixRightEdge: true,
      },
    });
    chart.current = c;

    // Volume
    const volS = c.addSeries(HistogramSeries, {
      color: "rgba(255,255,255,0.08)", priceFormat: { type: "volume" }, priceScaleId: "vol",
    });
    c.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    volS.setData(
      validBars.map((b) => ({
        time: t(b.timestamp), value: b.volume ?? 0,
        color: b.close >= b.open ? "rgba(0,230,118,0.3)" : "rgba(255,61,87,0.3)",
      }))
    );

    // Main price series
    if (chartType === "candlestick") {
      const s = c.addSeries(CandlestickSeries, {
        upColor: T.green, downColor: T.red,
        borderUpColor: T.green, borderDownColor: T.red,
        wickUpColor: T.green, wickDownColor: T.red,
      });
      s.setData(validBars.map((b) => ({
        time: t(b.timestamp), open: b.open, high: b.high, low: b.low, close: b.close,
      })));
    } else {
      const s = c.addSeries(LineSeries, {
        color: T.green, lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
      });
      s.setData(validBars.map((b) => ({ time: t(b.timestamp), value: b.close })));
    }

    // Overlays
    const closes = validBars.map((b) => b.close);
    const times  = validBars.map((b) => t(b.timestamp));
    const ovData = (vals: (number | null)[]) =>
      vals.reduce<{ time: any; value: number }[]>((acc, v, i) => {
        if (v != null && !Number.isNaN(v)) acc.push({ time: times[i], value: v });
        return acc;
      }, []);

    if (overlays.has("EMA9")) {
      const d = ovData(calcEMA(closes, 9));
      if (d.length) {
        c.addSeries(LineSeries, { color: T.ema9, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(d);
      }
    }
    if (overlays.has("EMA21")) {
      const d = ovData(calcEMA(closes, 21));
      if (d.length) {
        c.addSeries(LineSeries, { color: T.ema21, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(d);
      }
    }
    if (overlays.has("BB")) {
      const bb = calcBB(closes, 20);
      const up = ovData(bb.map((b) => b.upper));
      const lo = ovData(bb.map((b) => b.lower));
      const md = ovData(bb.map((b) => b.middle));
      if (up.length) {
        c.addSeries(LineSeries, { color: T.bb, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false }).setData(up);
        c.addSeries(LineSeries, { color: T.bb, lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false }).setData(lo);
        c.addSeries(LineSeries, { color: "rgba(156,39,176,0.4)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(md);
      }
    }

    // Zoom to display period (fetch may include extra lookback bars for indicator warm-up)
    const cutoff = new Date();
    switch (period) {
      case "1d":  cutoff.setDate(cutoff.getDate() - 1); break;
      case "5d":  cutoff.setDate(cutoff.getDate() - 7); break;
      case "1mo": cutoff.setMonth(cutoff.getMonth() - 1); cutoff.setDate(cutoff.getDate() - 5); break;
      case "3mo": cutoff.setMonth(cutoff.getMonth() - 3); cutoff.setDate(cutoff.getDate() - 5); break;
      case "1y":  cutoff.setFullYear(cutoff.getFullYear() - 1); cutoff.setDate(cutoff.getDate() - 5); break;
      default:    cutoff.setFullYear(cutoff.getFullYear() - 2); break;
    }
    const cutoffMs = cutoff.getTime();
    const firstIdx = validBars.findIndex((b) => new Date(b.timestamp).getTime() >= cutoffMs);
    if (firstIdx > 0) {
      c.timeScale().setVisibleRange({
        from: t(validBars[firstIdx].timestamp),
        to: t(validBars[validBars.length - 1].timestamp),
      });
    } else {
      c.timeScale().fitContent();
    }

    return () => { c.remove(); chart.current = null; };
  }, [bars, chartType, overlays, interval, period, height, containerRef]);

  return chart;
}

// ── Controls bar ──────────────────────────────────────────────────────────────

const OV_COLORS: Record<Overlay, string> = { EMA9: "#2979FF", EMA21: "#FFB300", BB: "#9C27B0" };

function Controls({
  periodIdx, setPeriodIdx, overlays, toggleOverlay,
  chartType, setChartType,
  onExport, onExpand, onClose,
  showCustom, customStart, customEnd, onCustomStart, onCustomEnd,
}: {
  periodIdx: number; setPeriodIdx: (i: number) => void;
  overlays: Set<Overlay>; toggleOverlay: (o: Overlay) => void;
  chartType: ChartType; setChartType: (t: ChartType) => void;
  onExport?: () => void;
  onExpand?: () => void; onClose?: () => void;
  showCustom?: boolean;
  customStart?: string; customEnd?: string;
  onCustomStart?: (v: string) => void; onCustomEnd?: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-1">
        {PERIODS.map(({ label }, i) => (
          <button key={label} onClick={() => setPeriodIdx(i)}
            className="px-3 py-2 sm:px-2.5 sm:py-1 rounded text-xs font-mono font-medium transition-all min-w-[40px] sm:min-w-0"
            style={{
              backgroundColor: i === periodIdx && !showCustom ? "var(--accent-green)" : "transparent",
              color:  i === periodIdx && !showCustom ? "#080C14" : "var(--text-secondary)",
              border: i === periodIdx && !showCustom ? "none" : "1px solid var(--border)",
            }}>
            {label}
          </button>
        ))}
        {showCustom && (
          <>
            <input type="date" value={customStart ?? ""} onChange={(e) => onCustomStart?.(e.target.value)}
              className="text-xs font-mono rounded px-2 py-1 outline-none"
              style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>→</span>
            <input type="date" value={customEnd ?? ""} onChange={(e) => onCustomEnd?.(e.target.value)}
              className="text-xs font-mono rounded px-2 py-1 outline-none"
              style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Chart type toggle */}
        <div className="flex rounded overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button onClick={() => setChartType("candlestick")} title="Candlestick"
            className="p-2.5 sm:p-1.5 flex items-center transition-colors"
            style={{ backgroundColor: chartType === "candlestick" ? "rgba(0,230,118,0.15)" : "transparent", color: chartType === "candlestick" ? "var(--accent-green)" : "var(--text-muted)" }}>
            <CandleIcon size={14} className="sm:w-3 sm:h-3" />
          </button>
          <button onClick={() => setChartType("line")} title="Line"
            className="p-2.5 sm:p-1.5 flex items-center transition-colors"
            style={{ borderLeft: "1px solid var(--border)", backgroundColor: chartType === "line" ? "rgba(0,230,118,0.15)" : "transparent", color: chartType === "line" ? "var(--accent-green)" : "var(--text-muted)" }}>
            <TrendingUp size={14} className="sm:w-3 sm:h-3" />
          </button>
        </div>
        {/* Overlays */}
        {OVERLAYS.map((o) => {
          const active = overlays.has(o);
          return (
            <button key={o} onClick={() => toggleOverlay(o)}
              className="px-2.5 py-1.5 sm:px-2 sm:py-0.5 rounded text-xs font-mono transition-all"
              style={{
                backgroundColor: active ? `${OV_COLORS[o]}22` : "transparent",
                color:  active ? OV_COLORS[o] : "var(--text-muted)",
                border: `1px solid ${active ? OV_COLORS[o] + "55" : "var(--border)"}`,
              }}>
              {o}
            </button>
          );
        })}
        {onExport && (
          <button onClick={onExport} title="Export PNG"
            className="p-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <Download size={12} />
          </button>
        )}
        {onExpand && (
          <button onClick={onExpand} title="Expand"
            className="p-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <Maximize2 size={12} />
          </button>
        )}
        {onClose && (
          <button onClick={onClose} title="Close"
            className="p-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Drawing canvas (fullscreen only) ─────────────────────────────────────────

const TOOL_ICONS: Record<DrawTool, React.ReactNode> = {
  cursor:    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 0l16 12-7 2-4 8z"/></svg>,
  trendline: <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="21" x2="21" y2="3"/></svg>,
  hline:     <MinusIcon size={13} />,
  ray:       <svg width="13" height="13" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none"><line x1="3" y1="21" x2="21" y2="3"/><circle cx="21" cy="3" r="2" fill="currentColor"/></svg>,
};

function DrawingCanvas({ tool, drawings, setDrawings, width, height }: {
  tool: DrawTool; drawings: Drawing[]; setDrawings: React.Dispatch<React.SetStateAction<Drawing[]>>;
  width: number; height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const active    = useRef(false);
  const startPt   = useRef<{ x: number; y: number } | null>(null);
  const curPt     = useRef<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    const line = (x1: number, y1: number, x2: number, y2: number, color: string) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash([]); ctx.stroke();
      [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(({ x, y }) => {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });
    };

    drawings.forEach((d) => {
      if (d.type === "hline") {
        line(0, d.y1, width, d.y1, "rgba(100,200,255,0.85)");
      } else if (d.type === "trendline") {
        line(d.x1, d.y1, d.x2, d.y2, "rgba(255,200,0,0.85)");
      } else if (d.type === "ray") {
        const dx = d.x2 - d.x1, dy = d.y2 - d.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const s = (Math.max(width, height) * 2) / len;
          line(d.x1, d.y1, d.x1 + dx * s, d.y1 + dy * s, "rgba(255,100,200,0.85)");
        }
      }
    });

    if (active.current && startPt.current && curPt.current && tool !== "cursor") {
      const { x: x1, y: y1 } = startPt.current;
      const { x: x2, y: y2 } = curPt.current;
      ctx.beginPath(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
      tool === "hline" ? (ctx.moveTo(0, y1), ctx.lineTo(width, y1)) : (ctx.moveTo(x1, y1), ctx.lineTo(x2, y2));
      ctx.stroke(); ctx.setLineDash([]);
    }
  }, [drawings, tool, width, height]);

  useEffect(() => { redraw(); }, [redraw]);

  const pos = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const touchPos = (e: React.TouchEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const t = e.touches[0] ?? e.changedTouches[0];
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };

  const finishDraw = (end: { x: number; y: number }) => {
    if (!active.current || !startPt.current) return;
    active.current = false;
    const { x: x1, y: y1 } = startPt.current;
    if (Math.abs(end.x - x1) < 3 && Math.abs(end.y - y1) < 3 && tool !== "hline") { redraw(); return; }
    const id = `${Date.now()}`;
    if (tool === "hline") setDrawings((p) => [...p, { id, type: "hline", x1: 0, y1, x2: width, y2: y1 }]);
    else if (tool === "trendline") setDrawings((p) => [...p, { id, type: "trendline", x1, y1, x2: end.x, y2: end.y }]);
    else if (tool === "ray") setDrawings((p) => [...p, { id, type: "ray", x1, y1, x2: end.x, y2: end.y }]);
    startPt.current = curPt.current = null;
  };

  return (
    <canvas ref={canvasRef} width={width} height={height}
      style={{ position: "absolute", inset: 0, cursor: tool === "cursor" ? "default" : "crosshair", zIndex: 10, pointerEvents: tool === "cursor" ? "none" : "all", touchAction: tool === "cursor" ? "auto" : "none" }}
      onMouseDown={(e) => { if (tool === "cursor") return; active.current = true; startPt.current = curPt.current = pos(e); }}
      onMouseMove={(e) => { if (!active.current) return; curPt.current = pos(e); redraw(); }}
      onMouseUp={(e) => finishDraw(pos(e))}
      onMouseLeave={() => { if (active.current) { active.current = false; redraw(); } }}
      onTouchStart={(e) => { if (tool === "cursor") return; e.preventDefault(); active.current = true; startPt.current = curPt.current = touchPos(e); }}
      onTouchMove={(e) => { if (!active.current) return; e.preventDefault(); curPt.current = touchPos(e); redraw(); }}
      onTouchEnd={(e) => { e.preventDefault(); finishDraw(touchPos(e)); }}
    />
  );
}

function DrawToolbar({ tool, setTool, onClear }: { tool: DrawTool; setTool: (t: DrawTool) => void; onClear: () => void; }) {
  const tools: { id: DrawTool; label: string }[] = [
    { id: "cursor", label: "Cursor" }, { id: "trendline", label: "Trend Line" },
    { id: "hline",  label: "H-Line"  }, { id: "ray",      label: "Ray"        },
  ];
  return (
    <div className="flex items-center gap-1">
      {tools.map((t) => (
        <button key={t.id} title={t.label} onClick={() => setTool(t.id)}
          className="p-1.5 rounded transition-colors flex items-center justify-center"
          style={{
            border: `1px solid ${tool === t.id ? "var(--accent-green)" : "var(--border)"}`,
            backgroundColor: tool === t.id ? "rgba(0,230,118,0.15)" : "transparent",
            color: tool === t.id ? "var(--accent-green)" : "var(--text-muted)",
          }}>
          {TOOL_ICONS[t.id]}
        </button>
      ))}
      <button title="Clear drawings" onClick={onClear}
        className="p-1.5 rounded transition-colors ml-1"
        style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ── Fullscreen modal ──────────────────────────────────────────────────────────

function FullscreenChart({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const [periodIdx,  setPeriodIdx]  = useState(2);
  const [overlays,   setOverlays]   = useState<Set<Overlay>>(new Set());
  const [chartType,  setChartType]  = useState<ChartType>("candlestick");
  const [drawTool,   setDrawTool]   = useState<DrawTool>("cursor");
  const [drawings,   setDrawings]   = useState<Drawing[]>([]);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });
  const [customStart, setCustomStart] = useState("");
  const [customEnd,   setCustomEnd]   = useState("");
  const [showCustom,  setShowCustom]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef      = useRef<HTMLDivElement>(null);

  const { period, interval, fetch: fetchPeriod } = PERIODS[periodIdx];
  const useStart = showCustom && customStart ? customStart : undefined;
  const useEnd   = showCustom && customEnd   ? customEnd   : undefined;
  const usePeriod = useStart ? period : fetchPeriod;
  const { data, isLoading } = useHistory(symbol, usePeriod, interval, useStart, useEnd);
  const bars = data?.bars ?? [];

  const toggleOverlay = useCallback((o: Overlay) =>
    setOverlays((p) => { const s = new Set(p); s.has(o) ? s.delete(o) : s.add(o); return s; }), []);

  const chartH = typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.72) : 600;
  const chartRef = useChart(containerRef, chartH, bars, overlays, chartType, interval, period);

  const handleExport = useCallback(() => {
    const canvas = chartRef.current?.takeScreenshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    const label = showCustom && customStart ? `${customStart}_${customEnd}` : PERIODS[periodIdx].label;
    a.download = `${symbol}-${label}.png`;
    a.click();
  }, [chartRef, symbol, periodIdx, showCustom, customStart, customEnd]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasSize({ w: el.clientWidth, h: chartH }));
    ro.observe(el);
    setCanvasSize({ w: el.clientWidth, h: chartH });
    return () => ro.disconnect();
  }, [chartH]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handlePeriodIdx = (i: number) => { setPeriodIdx(i); setShowCustom(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.88)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-7xl rounded-2xl overflow-hidden flex flex-col"
        style={{ backgroundColor: "#0D1117", border: "1px solid rgba(255,255,255,0.12)", maxHeight: "94vh" }}>

        <div className="px-5 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3">
            <TrendingUp size={14} style={{ color: "#00E676" }} />
            <span className="font-semibold text-sm" style={{ color: "#F0F6FC" }}>{symbol}</span>
            <span className="text-xs font-mono" style={{ color: "#8B949E" }}>
              {showCustom && customStart && customEnd
                ? `${customStart} → ${customEnd}`
                : `${PERIODS[periodIdx].label} · ${PERIODS[periodIdx].interval}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Custom date range toggle */}
            <button
              onClick={() => setShowCustom((p) => !p)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{
                border: `1px solid ${showCustom ? "var(--accent-green)" : "rgba(255,255,255,0.1)"}`,
                color: showCustom ? "#00E676" : "#8B949E",
                backgroundColor: showCustom ? "rgba(0,230,118,0.08)" : "transparent",
              }}>
              Custom range
            </button>
            <span className="text-xs hidden sm:block" style={{ color: "#8B949E" }}>Scroll to zoom · Drag to pan · Esc to close</span>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#8B949E" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 pt-3 pb-0 shrink-0 flex items-center justify-between gap-3 flex-wrap">
          <Controls
            periodIdx={periodIdx} setPeriodIdx={handlePeriodIdx}
            overlays={overlays} toggleOverlay={toggleOverlay}
            chartType={chartType} setChartType={setChartType}
            onExport={handleExport} onClose={onClose}
            showCustom={showCustom}
            customStart={customStart} customEnd={customEnd}
            onCustomStart={setCustomStart} onCustomEnd={setCustomEnd}
          />
          <DrawToolbar tool={drawTool} setTool={setDrawTool} onClear={() => setDrawings([])} />
        </div>

        <div className="flex-1 relative px-5 pb-4 min-h-0">
          <div ref={wrapRef} className="relative w-full h-full" style={{ minHeight: chartH }}>
            <div ref={containerRef} className="w-full" style={{ height: chartH }} />
            {isLoading && !bars.length && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(13,17,23,0.7)" }}>
                <span className="text-xs font-mono animate-pulse" style={{ color: "#8B949E" }}>Loading…</span>
              </div>
            )}
            {canvasSize.w > 0 && (
              <DrawingCanvas tool={drawTool} drawings={drawings} setDrawings={setDrawings} width={canvasSize.w} height={canvasSize.h} />
            )}
          </div>
        </div>

        {bars.length > 0 && (
          <div className="px-5 py-2 flex items-center gap-4 text-xs font-mono shrink-0"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)", color: "#8B949E" }}>
            <span>{bars.length} bars</span>
            <span>H: <span style={{ color: "#00E676" }}>${Math.max(...bars.map(b => b.high)).toFixed(2)}</span></span>
            <span>L: <span style={{ color: "#FF3D57" }}>${Math.min(...bars.map(b => b.low)).toFixed(2)}</span></span>
            <span className="ml-auto flex items-center gap-2">
              <span style={{ color: "rgba(255,200,0,0.8)" }}>— Trend</span>
              <span style={{ color: "rgba(100,200,255,0.8)" }}>— H-Line</span>
              <span style={{ color: "rgba(255,100,200,0.8)" }}>— Ray</span>
              <BarChart2 size={10} className="ml-1" />
              {["1d","5d"].includes(period) ? "Finnhub" : "yfinance"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CandlestickChart({ symbol }: { symbol: string }) {
  const [periodIdx, setPeriodIdx] = useState(2);
  const [overlays,  setOverlays]  = useState<Set<Overlay>>(new Set());
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [expanded,  setExpanded]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { period, interval, fetch: fetchPeriod } = PERIODS[periodIdx];
  const { data, isLoading }  = useHistory(symbol, fetchPeriod, interval);
  const bars = data?.bars ?? [];

  const toggleOverlay = useCallback((o: Overlay) =>
    setOverlays((p) => { const s = new Set(p); s.has(o) ? s.delete(o) : s.add(o); return s; }), []);

  const chartRef = useChart(containerRef, 320, bars, overlays, chartType, interval, period);

  const handleExport = useCallback(() => {
    const canvas = chartRef.current?.takeScreenshot();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${symbol}-${PERIODS[periodIdx].label}.png`;
    a.click();
  }, [chartRef, symbol, periodIdx]);

  return (
    <>
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
        <Controls
          periodIdx={periodIdx} setPeriodIdx={setPeriodIdx}
          overlays={overlays} toggleOverlay={toggleOverlay}
          chartType={chartType} setChartType={setChartType}
          onExport={handleExport} onExpand={() => setExpanded(true)}
        />

        <div className="relative rounded-lg overflow-hidden" style={{ height: 320 }}>
          <div ref={containerRef} className="w-full h-full"
            onClick={() => setExpanded(true)} style={{ cursor: "pointer" }} title="Click to expand" />

          {isLoading && !bars.length && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: "rgba(13,17,23,0.75)" }}>
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--accent-green)", borderTopColor: "transparent" }} />
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                  {PERIODS[periodIdx].label} data…
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {expanded && <FullscreenChart symbol={symbol} onClose={() => setExpanded(false)} />}
    </>
  );
}
