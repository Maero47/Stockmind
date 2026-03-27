"use client";

import useSWR from "swr";
import { usePortfolio } from "./usePortfolio";
import { getQuote, getExchangeRates } from "@/lib/api";
import type { PortfolioPosition, StockQuote } from "@/lib/types";

export interface EnrichedPosition extends PortfolioPosition {
  currentPrice: number | null;
  marketValue: number;
  marketValueUsd: number;
  totalCost: number;
  totalCostUsd: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  dailyChange: number | null;
  allocation: number;
  currency: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  dailyChange: number;
  dailyChangePct: number;
  positionCount: number;
}

async function fetchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
  const results = await Promise.allSettled(symbols.map((s) => getQuote(s)));
  const map: Record<string, StockQuote> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") map[symbols[i]] = r.value;
  });
  return map;
}

export function usePortfolioStats() {
  const { positions, isLoading: positionsLoading } = usePortfolio();

  const symbols = positions.map((p) => p.symbol);
  const symbolKey = symbols.sort().join(",");

  const { data: quotes, isLoading: quotesLoading } = useSWR(
    symbolKey ? `portfolio-quotes:${symbolKey}` : null,
    () => fetchQuotes(symbols),
    { refreshInterval: 30_000, revalidateOnFocus: false }
  );

  const nonUsdCurrencies = quotes
    ? [...new Set(Object.values(quotes).map((q) => q.currency).filter((c) => c && c !== "USD"))]
    : [];
  const fxKey = nonUsdCurrencies.sort().join(",");
  const needsFx = nonUsdCurrencies.length > 0;

  const { data: fxRates, isLoading: fxLoading } = useSWR(
    fxKey ? `fx-rates:${fxKey}` : null,
    () => getExchangeRates(nonUsdCurrencies),
    { refreshInterval: 600_000, revalidateOnFocus: false }
  );

  const fxReady = !needsFx || !!fxRates;

  const enriched: EnrichedPosition[] = [];
  let totalValueUsd = 0;
  let totalCostUsd = 0;
  let dailyChangeUsd = 0;

  for (const pos of positions) {
    const q = quotes?.[pos.symbol];
    const price = q?.price ?? null;
    const currency = q?.currency ?? "USD";
    const rate = currency === "USD" ? 1 : (fxRates?.[currency] ?? 0);

    const cost = pos.quantity * pos.avg_buy_price;
    const value = price ? pos.quantity * price : cost;
    const pnl = price ? value - cost : 0;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const daily = q?.change_pct ?? null;

    const valueUsd = value * rate;
    const costUsd = cost * rate;

    totalValueUsd += valueUsd;
    totalCostUsd += costUsd;
    if (daily !== null && price) {
      dailyChangeUsd += (daily / 100) * valueUsd;
    }

    enriched.push({
      ...pos,
      currentPrice: price,
      marketValue: value,
      marketValueUsd: valueUsd,
      totalCost: cost,
      totalCostUsd: costUsd,
      unrealizedPnl: pnl,
      unrealizedPnlPct: pnlPct,
      dailyChange: daily,
      allocation: 0,
      currency,
    });
  }

  for (const e of enriched) {
    e.allocation = totalValueUsd > 0 ? (e.marketValueUsd / totalValueUsd) * 100 : 0;
  }

  const summary: PortfolioSummary = {
    totalValue: totalValueUsd,
    totalCost: totalCostUsd,
    totalPnl: totalValueUsd - totalCostUsd,
    totalPnlPct: totalCostUsd > 0 ? ((totalValueUsd - totalCostUsd) / totalCostUsd) * 100 : 0,
    dailyChange: dailyChangeUsd,
    dailyChangePct: totalValueUsd > 0 ? (dailyChangeUsd / totalValueUsd) * 100 : 0,
    positionCount: positions.length,
  };

  return {
    positions: enriched,
    summary,
    isLoading: positionsLoading || quotesLoading || (needsFx && fxLoading),
  };
}
