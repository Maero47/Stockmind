"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import StockSearch from "@/components/stocks/StockSearch";
import StockHeader from "@/components/stocks/StockHeader";
import CandlestickChart from "@/components/charts/CandlestickChart";
import TechnicalIndicators from "@/components/stocks/TechnicalIndicators";
import PredictionCard from "@/components/predictions/PredictionCard";
import NewsPanel from "@/components/news/NewsPanel";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatRoom from "@/components/community/ChatRoom";
import MobileChatPanel from "@/components/layout/MobileChatPanel";
import WatchlistTab from "@/components/watchlist/WatchlistTab";
import AllAlertsPanel from "@/components/alerts/AllAlertsPanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useStore } from "@/lib/store";
import { useQuote } from "@/hooks/useStockData";
import { useSwipe } from "@/hooks/useSwipe";

type Tab = "analysis" | "watchlist" | "alerts";
type RightTab = "ai" | "community";

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
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [rightTab, setRightTab] = useState<RightTab>("ai");

  const TABS: Tab[] = ["analysis", "watchlist", "alerts"];
  const swipeLeft = useCallback(() => {
    setActiveTab((t) => TABS[Math.min(TABS.indexOf(t) + 1, TABS.length - 1)]);
  }, []);
  const swipeRight = useCallback(() => {
    setActiveTab((t) => TABS[Math.max(TABS.indexOf(t) - 1, 0)]);
  }, []);
  const swipe = useSwipe(swipeLeft, swipeRight);

  // Hydrate API keys from sessionStorage on first render
  useEffect(() => { loadKeys(); }, []);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 pt-20 pb-24 md:pb-12">
        {/* ── Top bar: search + tabs ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex-1 max-w-lg">
            <StockSearch
              size="compact"
              placeholder={`Switch symbol… currently ${selectedSymbol}`}
            />
          </div>
          {/* Tab switcher */}
          <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}>
            {(["analysis", "watchlist", "alerts"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-md text-xs font-mono font-medium capitalize transition-all"
                style={{
                  backgroundColor: activeTab === tab ? "var(--accent-green)" : "transparent",
                  color: activeTab === tab ? "#080C14" : "var(--text-muted)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Swipeable tab content ─────────────────────────────────── */}
        <div {...swipe}>
        {/* ── Watchlist tab ───────────────────────────────────────────── */}
        {activeTab === "watchlist" && <WatchlistTab />}

        {/* ── Alerts tab ──────────────────────────────────────────────── */}
        {activeTab === "alerts" && <AllAlertsPanel />}

        {/* ── Analysis tab ────────────────────────────────────────────── */}
        {activeTab === "analysis" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

            {/* ── LEFT COLUMN (60%) ─────────────────────────────────────── */}
            <div className="lg:col-span-3 space-y-5">

              {/* Stock header */}
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <ErrorBoundary label="Stock header failed to load">
                  <StockHeader quote={quote} isLoading={quoteLoading} />
                </ErrorBoundary>
              </div>

              {/* Candlestick chart */}
              <Section label="Price Chart">
                <ErrorBoundary label="Chart failed to load">
                  <CandlestickChart symbol={selectedSymbol} />
                </ErrorBoundary>
              </Section>

              {/* Technical indicators */}
              <Section label="Technical Indicators">
                <ErrorBoundary label="Indicators failed to load">
                  <TechnicalIndicators symbol={selectedSymbol} />
                </ErrorBoundary>
              </Section>

              {/* ML Prediction */}
              <Section label="ML Prediction">
                <ErrorBoundary label="Prediction failed to load">
                  <PredictionCard symbol={selectedSymbol} />
                </ErrorBoundary>
              </Section>

              {/* News */}
              <Section label="Recent News">
                <ErrorBoundary label="News failed to load">
                  <NewsPanel symbol={selectedSymbol} />
                </ErrorBoundary>
              </Section>
            </div>

            {/* ── RIGHT COLUMN (40%) — desktop only, sticky ────────────── */}
            <div className="hidden lg:block lg:col-span-2 lg:sticky lg:top-20">
              <div
                className="flex gap-1 rounded-lg p-1 mb-3"
                style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setRightTab("ai")}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
                  style={{
                    backgroundColor: rightTab === "ai" ? "var(--accent-green)" : "transparent",
                    color: rightTab === "ai" ? "#080C14" : "var(--text-muted)",
                  }}
                >
                  AI Analysis
                </button>
                <button
                  onClick={() => setRightTab("community")}
                  className="flex-1 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
                  style={{
                    backgroundColor: rightTab === "community" ? "var(--accent-blue)" : "transparent",
                    color: rightTab === "community" ? "#080C14" : "var(--text-muted)",
                  }}
                >
                  Community
                </button>
              </div>
              {rightTab === "ai" && <ChatInterface symbol={selectedSymbol} />}
              {rightTab === "community" && <ChatRoom symbol={selectedSymbol} />}
            </div>

            {/* ── Mobile chat FAB + overlay ─────────────────────────────── */}
            <MobileChatPanel symbol={selectedSymbol} />
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
