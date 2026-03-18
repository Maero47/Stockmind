"use client";

import { useEffect, useRef } from "react";
import type { PriceAlert } from "@/lib/types";
import type { AlertToastData } from "@/components/alerts/AlertToast";

export function usePriceAlertChecker(
  symbol: string,
  livePrice: number | null,
  alerts: PriceAlert[],
  onTrigger: (alertId: number) => void,
  onToast?: (data: AlertToastData) => void,
) {
  // Track already-fired IDs this session to prevent double-firing
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (livePrice == null) return;

    const symbolAlerts = alerts.filter(
      (a) => a.symbol === symbol && !a.triggered && !firedRef.current.has(a.id)
    );

    for (const alert of symbolAlerts) {
      const hit =
        (alert.direction === "above" && livePrice >= alert.target_price) ||
        (alert.direction === "below" && livePrice <= alert.target_price);

      if (!hit) continue;

      // Mark fired immediately to prevent double-fire before DB round-trip
      firedRef.current.add(alert.id);
      onTrigger(alert.id);

      // In-app toast
      onToast?.({
        id: alert.id,
        symbol: alert.symbol,
        direction: alert.direction,
        target_price: alert.target_price,
        livePrice,
      });

      // Browser notification
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(`${alert.symbol} Alert`, {
          body: `Price is ${alert.direction} $${alert.target_price.toLocaleString()} — now $${livePrice.toLocaleString()}`,
          icon: "/icons/icon-192.png",
        });
      }
    }
  }, [livePrice, alerts, symbol, onTrigger, onToast]);
}
