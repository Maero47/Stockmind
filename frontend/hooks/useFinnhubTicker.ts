"use client";

import { useState, useEffect, useRef } from "react";

const WS_URL = `wss://ws.finnhub.io?token=${process.env.NEXT_PUBLIC_FINNHUB_KEY}`;

// Symbols that use Binance instead — skip Finnhub for these
const CRYPTO_SYMBOLS = new Set([
  "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD",
  "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD",
]);

export interface FinnhubTick {
  price: number;
  volume: number;
  timestamp: number;
}

export function useFinnhubTicker(symbol: string) {
  const [tick,      setTick]      = useState<FinnhubTick | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef  = useRef<WebSocket | null>(null);
  const active = useRef(false);

  const upper = symbol.toUpperCase();
  const isCryptoOrForex = CRYPTO_SYMBOLS.has(upper) || upper.includes("=");
  const shouldConnect = !!symbol && !isCryptoOrForex && !!process.env.NEXT_PUBLIC_FINNHUB_KEY;

  useEffect(() => {
    if (!shouldConnect || typeof window === "undefined") return;

    let dead = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (dead) return;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      active.current = true;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ type: "subscribe", symbol: symbol.toUpperCase() }));
      };

      ws.onclose = () => {
        setConnected(false);
        if (!dead) reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string);
          if (msg.type !== "trade" || !msg.data?.length) return;
          // Take the latest trade in the batch
          const latest = msg.data[msg.data.length - 1];
          setTick({
            price:     parseFloat(latest.p),
            volume:    parseFloat(latest.v),
            timestamp: latest.t,
          });
        } catch { /* ignore malformed */ }
      };
    }

    connect();

    return () => {
      dead = true;
      active.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.onopen  = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "unsubscribe", symbol: symbol.toUpperCase() }));
        }
        ws.close();
      }
    };
  }, [symbol, shouldConnect]);

  return { tick, connected, isStock: shouldConnect };
}
