"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import type { Variants } from "framer-motion";
import useSWR from "swr";
import CryptoMovers from "@/components/crypto/CryptoMovers";
import {
  Brain, BarChart2, Cpu, ArrowRight, Zap, ShieldCheck,
  TrendingUp, TrendingDown, Bitcoin, Layers, RefreshCw,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import StockSearch from "@/components/stocks/StockSearch";
import StockCard from "@/components/stocks/StockCard";
import { getTrending, type TrendingCategory } from "@/lib/api";
import { useStore } from "@/lib/store";

// ── Quick-chip symbols ────────────────────────────────────────────────────────

const QUICK_CHIPS = ["AAPL", "MSFT", "BTC-USD", "NVDA", "TSLA", "ETH-USD"];

// ── Features data ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-AI Support",
    description:
      "Bring your own key for OpenAI, Anthropic Claude, Groq, or Gemini. Switch providers instantly. You pay the AI company directly — we charge you nothing.",
    color: "var(--accent-blue)",
    gradient: "rgba(41,121,255,0.08)",
  },
  {
    icon: BarChart2,
    title: "Real-Time Data",
    description:
      "Live prices, OHLCV history, RSI, MACD, Bollinger Bands, and EMA signals. Data sourced from global markets via yfinance and ccxt.",
    color: "var(--accent-green)",
    gradient: "rgba(0,230,118,0.08)",
  },
  {
    icon: Cpu,
    title: "ML Predictions",
    description:
      "XGBoost classifier trained on 2 years of daily data predicts next-day direction. Transparent feature importances tell you exactly why.",
    color: "var(--accent-amber)",
    gradient: "rgba(255,179,0,0.08)",
  },
];

// ── Animation variants ────────────────────────────────────────────────────────

const EASE_CURVE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.09, ease: EASE_CURVE },
  }),
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" as const } },
};

// ── Section wrapper with scroll trigger ──────────────────────────────────────

function ScrollSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={className}>
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={fadeIn}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ── Trending section ──────────────────────────────────────────────────────────

const CATEGORIES: { id: TrendingCategory; label: string; icon: React.ElementType; color: string }[] = [
  { id: "stocks",  label: "Most Active", icon: BarChart2,    color: "var(--accent-green)" },
  { id: "crypto",  label: "Crypto",      icon: Bitcoin,      color: "#F7931A" },
  { id: "gainers", label: "Gainers",     icon: TrendingUp,   color: "#00E676" },
  { id: "losers",  label: "Losers",      icon: TrendingDown, color: "#FF3D57" },
  { id: "etf",     label: "ETFs",        icon: Layers,       color: "var(--accent-blue)" },
];

function TrendingSection() {
  const [category, setCategory] = useState<TrendingCategory>("stocks");

  const { data, isLoading, mutate } = useSWR(
    `trending:${category}`,
    () => getTrending(category),
    { refreshInterval: 300_000, revalidateOnFocus: false }
  );

  const symbols    = data?.symbols ?? [];
  const activeColor = CATEGORIES.find((c) => c.id === category)?.color ?? "var(--accent-green)";

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-medium tracking-[0.25em] uppercase"
            style={{ color: activeColor }}>
            Market Overview
          </span>
          <div className="w-16 h-px hidden sm:block"
            style={{ background: `linear-gradient(to right, ${activeColor}80, transparent)` }} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
            const active = id === category;
            return (
              <button key={id} onClick={() => setCategory(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: active ? `${color}18` : "var(--bg-surface)",
                  border: `1px solid ${active ? color + "55" : "var(--border)"}`,
                  color: active ? color : "var(--text-secondary)",
                }}>
                <Icon size={11} />
                {label}
              </button>
            );
          })}
          <button onClick={() => mutate()}
            className="p-1.5 rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
            title="Refresh">
            <RefreshCw size={11} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {isLoading && symbols.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card h-52 animate-pulse"
              style={{ backgroundColor: "var(--bg-surface)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {symbols.map((sym, i) => (
            <CardFadeUp key={sym} index={i}>
              <StockCard symbol={sym} />
            </CardFadeUp>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const user = useStore((s) => s.user);

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-20 dot-grid"
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center"
          aria-hidden
        >
          <div
            className="w-[700px] h-[500px] rounded-full blur-[140px] opacity-20"
            style={{ background: "radial-gradient(ellipse, var(--accent-green) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              backgroundColor: "rgba(0,230,118,0.08)",
              border: "1px solid rgba(0,230,118,0.2)",
              color: "var(--accent-green)",
            }}
          >
            <Zap size={11} />
            Powered by LangChain · XGBoost · yfinance
          </motion.div>

          {/* Headline */}
          <motion.h1
            custom={0}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
          >
            AI-Powered{" "}
            <br className="hidden sm:block" />
            Market{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--accent-green) 0%, #00bcd4 100%)",
              }}
            >
              Intelligence
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Analyze any stock or crypto with cutting-edge AI.
            <br />
            <span style={{ color: "var(--text-muted)" }}>
              Bring your own API key — pay nothing to us.
            </span>
          </motion.p>

          {user && (
            <>
              {/* Search bar */}
              <motion.div
                custom={2}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="w-full max-w-[600px] mx-auto mb-5"
              >
                <StockSearch size="hero" />
              </motion.div>

              {/* Quick chips */}
              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="flex flex-wrap justify-center gap-2"
              >
                {QUICK_CHIPS.map((sym) => (
                  <Link
                    key={sym}
                    href={`/stock/${sym}`}
                    className="px-3 py-1 rounded-md font-mono text-xs font-medium transition-all duration-200"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-bright)",
                      color: "var(--text-secondary)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent-green)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(0,230,118,0.3)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)";
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-bright)";
                    }}
                  >
                    {sym}
                  </Link>
                ))}
              </motion.div>
            </>
          )}
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
            className="w-px h-6"
            style={{ background: "linear-gradient(to bottom, var(--text-muted), transparent)" }}
          />
        </motion.div>
      </section>

      {user && (
        <>
          {/* ── Trending grid ────────────────────────────────────────────── */}
          <TrendingSection />

          {/* ── Crypto movers ────────────────────────────────────────────── */}
          <CryptoMovers />
        </>
      )}

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section
        className="max-w-7xl mx-auto px-6 py-20"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <ScrollSection>
          <div className="text-center mb-12">
            <p
              className="font-mono text-xs font-medium tracking-[0.25em] uppercase mb-3"
              style={{ color: "var(--accent-blue)" }}
            >
              Why StockMind
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need to analyze{" "}
              <span style={{ color: "var(--text-secondary)" }}>any market</span>
            </h2>
          </div>
        </ScrollSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <FeatureCard key={feat.title} feat={feat} index={i} />
          ))}
        </div>
      </section>

      {/* ── Security note strip ──────────────────────────────────────────── */}
      <ScrollSection className="max-w-7xl mx-auto px-6 pb-16">
        <div
          className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-xl text-sm"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <ShieldCheck size={14} style={{ color: "var(--accent-green)" }} />
            Keys are encrypted and stored securely
          </div>
          <div
            className="w-px h-4 hidden sm:block"
            style={{ backgroundColor: "var(--border-bright)" }}
          />
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <ShieldCheck size={14} style={{ color: "var(--accent-green)" }} />
            Sent directly to AI providers, never logged
          </div>
          <div
            className="w-px h-4 hidden sm:block"
            style={{ backgroundColor: "var(--border-bright)" }}
          />
          <div className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            <ShieldCheck size={14} style={{ color: "var(--accent-green)" }} />
            Managed per session via Supabase
          </div>
        </div>
      </ScrollSection>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative px-6 py-28 overflow-hidden" style={{ borderTop: "1px solid var(--border)" }}>
        {/* Green glow */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="w-[600px] h-[300px] rounded-full blur-[120px] opacity-15"
            style={{ background: "radial-gradient(ellipse, var(--accent-green) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <ScrollSection>
            <p
              className="font-mono text-xs font-medium tracking-[0.25em] uppercase mb-4"
              style={{ color: "var(--accent-green)" }}
            >
              Get Started
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
              Ready to trade smarter?
            </h2>
            <p
              className="text-lg mb-10 max-w-md mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Set up your API key in 60 seconds and get AI-powered analysis on any stock or crypto.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-100"
                style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
              >
                Start Analyzing <ArrowRight size={15} />
              </Link>
              <Link
                href="/stock/AAPL"
                className="flex items-center gap-2 px-7 py-3.5 rounded-lg font-semibold text-sm transition-all duration-200"
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid var(--border-bright)",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border-bright)";
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "var(--bg-subtle)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                }}
              >
                View Demo
              </Link>
            </div>
          </ScrollSection>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="px-6 py-8"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Image src="/logo.png" alt="StockMind" width={120} height={34} style={{ objectFit: "contain", height: "auto", opacity: 0.6 }} />
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            Not financial advice. All information is provided for informational purposes only. StockMind does not recommend any securities or investment strategies.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CardFadeUp({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
    >
      {children}
    </motion.div>
  );
}

function FeatureCard({
  feat,
  index,
}: {
  feat: (typeof FEATURES)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const Icon = feat.icon;

  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className="glass-card p-7 flex flex-col gap-4"
      style={{ transition: "border-color 0.2s" }}
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: feat.gradient, border: `1px solid ${feat.color}22` }}
      >
        <Icon size={20} style={{ color: feat.color }} />
      </div>

      {/* Text */}
      <div>
        <h3 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
          {feat.title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {feat.description}
        </p>
      </div>

      {/* Bottom indicator */}
      <div
        className="mt-auto h-px w-full rounded"
        style={{
          background: `linear-gradient(to right, ${feat.color}55, transparent)`,
        }}
      />
    </motion.div>
  );
}
