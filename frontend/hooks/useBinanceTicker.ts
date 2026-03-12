"use client";

import { useState, useEffect, useRef } from "react";

// yfinance symbol → Binance stream symbol
const BINANCE_MAP: Record<string, string> = {
  "BTC-USD":  "btcusdt",
  "ETH-USD":  "ethusdt",
  "SOL-USD":  "solusdt",
  "BNB-USD":  "bnbusdt",
  "XRP-USD":  "xrpusdt",
  "DOGE-USD": "dogeusdt",
  "ADA-USD":  "adausdt",
  "AVAX-USD": "avaxusdt",
};

export interface BinanceTicker {
  price:     number;
  change:    number;
  changePct: number;
  high:      number;
  low:       number;
  volume:    number;
  open:      number;
}

export function toBinanceStream(symbol: string): string | null {
  return BINANCE_MAP[symbol.toUpperCase()] ?? null;
}

export function useBinanceTicker(symbol: string) {
  const [data,      setData]      = useState<BinanceTicker | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const stream = toBinanceStream(symbol);

  useEffect(() => {
    if (!stream || typeof window === "undefined") return;

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@ticker`);
      wsRef.current = ws;

      ws.onopen  = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!dead) reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data as string);
          setData({
            price:     parseFloat(d.c),
            change:    parseFloat(d.p),
            changePct: parseFloat(d.P),
            high:      parseFloat(d.h),
            low:       parseFloat(d.l),
            volume:    parseFloat(d.v),
            open:      parseFloat(d.o),
          });
        } catch { /* ignore malformed */ }
      };
    }

    connect();

    return () => {
      dead = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [stream]);

  return { data, connected, isCrypto: !!stream };
}
