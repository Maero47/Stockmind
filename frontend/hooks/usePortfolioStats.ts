"use client";

import useSWR from "swr";
import { usePortfolio } from "./usePortfolio";
import { getQuote } from "@/lib/api";
import type { PortfolioPosition, StockQuote } from "@/lib/types";

export interface EnrichedPosition extends PortfolioPosition {
  currentPrice: number | null;
  marketValue: number;
  totalCost: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  dailyChange: number | null;
  allocation: number;
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

  const enriched: EnrichedPosition[] = [];
  let totalValue = 0;
  let totalCost = 0;
  let dailyChangeTotal = 0;

  for (const pos of positions) {
    const q = quotes?.[pos.symbol];
    const price = q?.price ?? null;
    const cost = pos.quantity * pos.avg_buy_price;
    const value = price ? pos.quantity * price : cost;
    const pnl = price ? value - cost : 0;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const daily = q?.change_pct ?? null;

    totalValue += value;
    totalCost += cost;
    if (daily !== null && price) {
      dailyChangeTotal += (daily / 100) * value;
    }

    enriched.push({
      ...pos,
      currentPrice: price,
      marketValue: value,
      totalCost: cost,
      unrealizedPnl: pnl,
      unrealizedPnlPct: pnlPct,
      dailyChange: daily,
      allocation: 0,
    });
  }

  for (const e of enriched) {
    e.allocation = totalValue > 0 ? (e.marketValue / totalValue) * 100 : 0;
  }

  const summary: PortfolioSummary = {
    totalValue,
    totalCost,
    totalPnl: totalValue - totalCost,
    totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    dailyChange: dailyChangeTotal,
    dailyChangePct: totalValue > 0 ? (dailyChangeTotal / totalValue) * 100 : 0,
    positionCount: positions.length,
  };

  return {
    positions: enriched,
    summary,
    isLoading: positionsLoading || quotesLoading,
  };
}
