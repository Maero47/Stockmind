"use client";

import { useEffect, useCallback, useState } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { getQuote } from "@/lib/api";
import { markFired, hasFired } from "@/lib/firedAlerts";
import AlertToast from "./AlertToast";
import type { AlertToastData } from "./AlertToast";
import type { PriceAlert } from "@/lib/types";

const POLL_INTERVAL = 30_000;

export default function AlertMonitor() {
  const { alerts, trigger } = useAlerts();
  const [toast, setToast] = useState<AlertToastData | null>(null);

  const checkAlerts = useCallback(async () => {
    const active = alerts.filter((a) => !a.triggered && !hasFired(a.id));
    if (!active.length) return;

    const symbols = [...new Set(active.map((a) => a.symbol))];
    const prices = new Map<string, number>();

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const q = await getQuote(sym);
          if (q.price != null) prices.set(sym, q.price);
        } catch {}
      })
    );

    for (const alert of active) {
      if (hasFired(alert.id)) continue;
      const price = prices.get(alert.symbol);
      if (price == null) continue;

      const hit =
        (alert.direction === "above" && price >= alert.target_price) ||
        (alert.direction === "below" && price <= alert.target_price);

      if (!hit) continue;

      markFired(alert.id);
      trigger(alert.id, price);

      setToast({
        id: alert.id,
        symbol: alert.symbol,
        direction: alert.direction,
        target_price: alert.target_price,
        livePrice: price,
      });

      showNotification(alert, price);
    }
  }, [alerts, trigger]);

  useEffect(() => {
    if (!alerts.length) return;
    checkAlerts();
    const id = setInterval(checkAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkAlerts, alerts.length]);

  // Sync alert data to service worker for background checking
  useEffect(() => {
    syncAlertsToSW(alerts);
  }, [alerts]);

  // Request notification permission when user has active alerts
  const hasActive = alerts.some((a) => !a.triggered);
  useEffect(() => {
    if (
      hasActive &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
  }, [hasActive]);

  // Register periodic background sync when available
  useEffect(() => {
    registerBackgroundSync();
  }, []);

  return <AlertToast toast={toast} onClose={() => setToast(null)} />;
}

function showNotification(alert: PriceAlert, price: number) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const dir = alert.direction === "above" ? "rose above" : "fell below";
  const body = `${alert.symbol} ${dir} $${alert.target_price.toLocaleString()} — now $${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SHOW_NOTIFICATION",
      title: `${alert.symbol} Price Alert`,
      body,
    });
  } else {
    new Notification(`${alert.symbol} Price Alert`, {
      body,
      icon: "/icons/icon-192.png",
    });
  }
}

function syncAlertsToSW(alerts: PriceAlert[]) {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: "STORE_ALERTS",
    payload: alerts.filter((a) => !a.triggered),
  });
}

async function registerBackgroundSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("periodicSync" in reg) {
      await (reg as any).periodicSync.register("check-alerts", {
        minInterval: 15 * 60 * 1000,
      });
    }
  } catch {}
}
