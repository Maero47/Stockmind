"use client";

import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import StockSearch from "@/components/stocks/StockSearch";
import StockHeader from "@/components/stocks/StockHeader";
import CandlestickChart from "@/components/charts/CandlestickChart";
import TechnicalIndicators from "@/components/stocks/TechnicalIndicators";
import PredictionCard from "@/components/predictions/PredictionCard";
import NewsPanel from "@/components/news/NewsPanel";
import ChatInterface from "@/components/ai/ChatInterface";
import { useStore } from "@/lib/store";
import { useQuote } from "@/hooks/useStockData";

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs font-medium tracking-widest uppercase font-mono"
           style={{ color: "var(--text-muted)" }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const selectedSymbol  = useStore((s) => s.selectedSymbol);
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const loadKeys        = useStore((s) => s.loadApiKeysFromSession);

  const { data: quote, isLoading: quoteLoading } = useQuote(selectedSymbol);

  // Hydrate API keys from sessionStorage on first render
  useEffect(() => { loadKeys(); }, []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 pt-20 pb-12">
        {/* ── Top search bar ─────────────────────────────────────────── */}
        <div className="max-w-lg mb-6">
          <StockSearch
            size="compact"
            placeholder={`Switch symbol… currently ${selectedSymbol}`}
          />
        </div>

        {/* ── Two-column grid ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

          {/* ── LEFT COLUMN (60%) ─────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Stock header */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <StockHeader quote={quote} isLoading={quoteLoading} />

            </div>

            {/* Candlestick chart */}
            <Section label="Price Chart">
              <CandlestickChart symbol={selectedSymbol} />
            </Section>

            {/* Technical indicators */}
            <Section label="Technical Indicators">
              <TechnicalIndicators symbol={selectedSymbol} />
            </Section>

            {/* ML Prediction */}
            <Section label="ML Prediction">
              <PredictionCard symbol={selectedSymbol} />
            </Section>

            {/* News */}
            <Section label="Recent News">
              <NewsPanel symbol={selectedSymbol} />
            </Section>
          </div>

          {/* ── RIGHT COLUMN (40%) — sticky ───────────────────────────── */}
          <div className="lg:col-span-2 lg:sticky lg:top-20">
            <ChatInterface symbol={selectedSymbol} />
          </div>
        </div>
      </main>
    </div>
  );
}
