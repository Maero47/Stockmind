"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import StockHeader from "@/components/stocks/StockHeader";
import CandlestickChart from "@/components/charts/CandlestickChart";
import TechnicalIndicators from "@/components/stocks/TechnicalIndicators";
import PredictionCard from "@/components/predictions/PredictionCard";
import NewsPanel from "@/components/news/NewsPanel";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatRoom from "@/components/community/ChatRoom";
import MobileChatPanel from "@/components/layout/MobileChatPanel";
import { useStore } from "@/lib/store";
import { useRealtimeQuote } from "@/hooks/useStockData";

type RightTab = "ai" | "community";

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
  const clearChat         = useStore((s) => s.clearChat);
  const loadKeys          = useStore((s) => s.loadApiKeysFromSession);
  const [rightTab, setRightTab] = useState<RightTab>("ai");

  useEffect(() => {
    setSelectedSymbol(rawSymbol);
    clearChat();
    loadKeys();
  }, [rawSymbol]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: quote, isLoading: quoteLoading } = useRealtimeQuote(rawSymbol);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 pt-20 pb-24 md:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">

          {/* LEFT (60%) */}
          <div className="lg:col-span-3 space-y-5">
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

          {/* RIGHT (40%) — desktop only, sticky */}
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

            {rightTab === "ai" && <ChatInterface key={rawSymbol} symbol={rawSymbol} />}
            {rightTab === "community" && <ChatRoom symbol={rawSymbol} />}
          </div>

          {/* Mobile chat FAB + overlay */}
          <MobileChatPanel symbol={rawSymbol} />
        </div>
      </main>
    </div>
  );
}
