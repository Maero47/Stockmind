"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useAlerts } from "@/hooks/useAlerts";
import { getQuote, getNotificationSettings } from "@/lib/api";
import { markFired, hasFired } from "@/lib/firedAlerts";
import { useStore } from "@/lib/store";
import { playSound } from "@/lib/sounds";
import AlertToast from "./AlertToast";
import type { AlertToastData } from "./AlertToast";
import type { NotificationSettings, PriceAlert } from "@/lib/types";

const POLL_INTERVAL = 30_000;
const GROUP_WINDOW = 3000;

function isQuietHour(settings: NotificationSettings | null): boolean {
  if (!settings?.quiet_hours_enabled) return false;
  const qs = settings.quiet_start ?? "22:00";
  const qe = settings.quiet_end ?? "08:00";
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (qs <= qe) return hhmm >= qs && hhmm < qe;
  return hhmm >= qs || hhmm < qe;
}

export default function AlertMonitor() {
  const { alerts, trigger } = useAlerts();
  const user = useStore((s) => s.user);
  const setNotificationSettings = useStore((s) => s.setNotificationSettings);
  const [toast, setToast] = useState<AlertToastData | null>(null);
  const pendingGroupRef = useRef<{ alert: PriceAlert; price: number }[]>([]);
  const groupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    getNotificationSettings()
      .then((s) => { setNotificationSettings(s); })
      .catch(() => {});
  }, [user, setNotificationSettings]);

  const flushGrouped = useCallback(() => {
    const batch = pendingGroupRef.current;
    pendingGroupRef.current = [];
    groupTimerRef.current = null;
    if (!batch.length) return;

    if (batch.length === 1) {
      showNotification(batch[0].alert, batch[0].price);
    } else {
      const body = batch.map((b) => {
        const dir = b.alert.direction === "above" ? "above" : "below";
        return `${b.alert.symbol} ${dir} $${b.alert.target_price}`;
      }).join(", ");
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "SHOW_NOTIFICATION",
            title: `${batch.length} Price Alerts Triggered`,
            body,
          });
        } else {
          new Notification(`${batch.length} Price Alerts Triggered`, {
            body,
            icon: "/icons/icon-192.png",
          });
        }
      }
    }
  }, []);

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

    const settings = useStore.getState().notificationSettings;
    const quiet = isQuietHour(settings);
    const grouping = settings?.group_notifications ?? false;

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

      if (!quiet) {
        setToast({
          id: alert.id,
          symbol: alert.symbol,
          direction: alert.direction,
          target_price: alert.target_price,
          livePrice: price,
        });
        const soundName = settings?.sound ?? "default";
        if (grouping) {
          pendingGroupRef.current.push({ alert, price });
          if (!groupTimerRef.current) {
            groupTimerRef.current = setTimeout(() => {
              flushGrouped();
              playSound(soundName);
            }, GROUP_WINDOW);
          }
        } else {
          showNotification(alert, price);
          playSound(soundName);
        }
      }
    }
  }, [alerts, trigger, flushGrouped]);

  useEffect(() => {
    if (!alerts.length) return;
    checkAlerts();
    const id = setInterval(checkAlerts, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [checkAlerts, alerts.length]);

  // Sync alert data and settings to service worker for background checking
  const notifSettings = useStore((s) => s.notificationSettings);
  useEffect(() => {
    syncAlertsToSW(alerts);
  }, [alerts]);
  useEffect(() => {
    syncSettingsToSW(notifSettings);
  }, [notifSettings]);

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

function syncSettingsToSW(settings: import("@/lib/types").NotificationSettings | null) {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller || !settings) return;
  navigator.serviceWorker.controller.postMessage({
    type: "STORE_NOTIF_SETTINGS",
    payload: settings,
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
