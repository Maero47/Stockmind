"use client";

import useSWR from "swr";
import { getQuote, getRealtimeQuote, getHistory, getIndicators, getPrediction, getNews, searchStocks } from "@/lib/api";
import type { TimePeriod, TimeInterval } from "@/lib/types";

// Homepage cards — yfinance, 30s refresh
export function useQuote(symbol: string) {
  return useSWR(
    symbol ? `quote:${symbol}` : null,
    () => getQuote(symbol),
    { refreshInterval: 30_000, dedupingInterval: 25_000 }
  );
}

// Stock detail page — Finnhub REST for metadata (change%, high/low, etc.)
// Price itself comes from WebSocket (Binance for crypto, Finnhub WS for stocks)
export function useRealtimeQuote(symbol: string) {
  return useSWR(
    symbol ? `realtime:${symbol}` : null,
    () => getRealtimeQuote(symbol),
    { refreshInterval: 30_000, dedupingInterval: 25_000 }
  );
}

export function useHistory(
  symbol: string,
  period: TimePeriod = "1mo",
  interval: TimeInterval = "1d"
) {
  return useSWR(
    symbol ? `hist:${symbol}:${period}:${interval}` : null,
    () => getHistory(symbol, period, interval),
    { refreshInterval: 60_000 }
  );
}

export function useIndicators(symbol: string) {
  return useSWR(
    symbol ? `indicators:${symbol}` : null,
    () => getIndicators(symbol),
    { refreshInterval: 60_000 }
  );
}

export function usePrediction(symbol: string) {
  return useSWR(
    symbol ? `prediction:${symbol}` : null,
    () => getPrediction(symbol),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Don't retry on 404 — symbol simply isn't supported for ML prediction
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (err?.message?.includes("404") || err?.message?.includes("Not Found")) return;
        if (retryCount >= 2) return;
        setTimeout(() => revalidate({ retryCount }), 3000);
      },
    }
  );
}

export function useNews(symbol: string) {
  return useSWR(
    symbol ? `news:${symbol}` : null,
    () => getNews(symbol),
    { refreshInterval: 300_000 } // refresh every 5 min
  );
}

export function useSearch(query: string) {
  return useSWR(
    query.length >= 1 ? `search:${query}` : null,
    () => searchStocks(query),
    { revalidateOnFocus: false }
  );
}
