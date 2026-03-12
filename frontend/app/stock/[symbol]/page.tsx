"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import StockHeader from "@/components/stocks/StockHeader";
import CandlestickChart from "@/components/charts/CandlestickChart";
import TechnicalIndicators from "@/components/stocks/TechnicalIndicators";
import PredictionCard from "@/components/predictions/PredictionCard";
import NewsPanel from "@/components/news/NewsPanel";
import ChatInterface from "@/components/ai/ChatInterface";
import { useStore } from "@/lib/store";
import { useRealtimeQuote } from "@/hooks/useStockData";

function Section({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {label && (
        <p
          className="text-xs font-medium tracking-widest uppercase font-mono"
          style={{ color: "var(--text-muted)" }}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

export default function StockPage() {
  const params            = useParams();
  const rawSymbol         = (params.symbol as string).toUpperCase();
  const setSelectedSymbol = useStore((s) => s.setSelectedSymbol);
  const loadKeys          = useStore((s) => s.loadApiKeysFromSession);

  // Sync this symbol into the global store so the chat uses it
  useEffect(() => {
    setSelectedSymbol(rawSymbol);
    loadKeys();
  }, [rawSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: quote, isLoading: quoteLoading } = useRealtimeQuote(rawSymbol);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

          {/* ── LEFT (60%) ─────────────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-5">

            {/* Stock header */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <StockHeader quote={quote} isLoading={quoteLoading} />
            </div>

            <Section label="Price Chart">
              <CandlestickChart symbol={rawSymbol} />
            </Section>

            <Section label="Technical Indicators">
              <TechnicalIndicators symbol={rawSymbol} />
            </Section>

            <Section label="ML Prediction">
              <PredictionCard symbol={rawSymbol} />
            </Section>

            <Section label="Recent News">
              <NewsPanel symbol={rawSymbol} />
            </Section>
          </div>

          {/* ── RIGHT (40%) sticky ─────────────────────────────────────── */}
          <div className="lg:col-span-2 lg:sticky lg:top-20">
            <ChatInterface symbol={rawSymbol} />
          </div>
        </div>
      </main>
    </div>
  );
}
