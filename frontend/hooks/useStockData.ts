"use client";

import useSWR from "swr";
import { getQuote, getRealtimeQuote, getHistory, getIndicators, getPrediction, getNews, searchStocks } from "@/lib/api";
import type { TimePeriod, TimeInterval } from "@/lib/types";
import { useStore } from "@/lib/store";

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
  interval: TimeInterval = "1d",
  start?: string,
  end?: string,
) {
  const key = start && end
    ? `hist:${symbol}:${start}:${end}:${interval}`
    : `hist:${symbol}:${period}:${interval}`;
  return useSWR(
    symbol ? key : null,
    () => getHistory(symbol, period, interval, start, end),
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

// Symbols where prediction returned 404 — skip future requests this session
const _noPredict = new Set<string>();

export function usePrediction(symbol: string) {
  const user = useStore((s) => s.user);
  return useSWR(
    symbol && user && !_noPredict.has(symbol) ? `prediction:${symbol}` : null,
    () => getPrediction(symbol),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
        if (err?.message?.includes("404") || err?.message?.includes("Not Found")) {
          _noPredict.add(symbol);
          return;
        }
        if (err?.message?.includes("401") || err?.message?.includes("Unauthorized")) return;
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

export function useSearch(query: string, market?: string) {
  return useSWR(
    query.length >= 1 ? `search:${query}:${market ?? ""}` : null,
    () => searchStocks(query, market),
    { revalidateOnFocus: false }
  );
}
