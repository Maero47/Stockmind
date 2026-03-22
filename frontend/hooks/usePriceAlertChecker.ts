"use client";

import { useEffect } from "react";
import type { PriceAlert, NotificationSettings } from "@/lib/types";
import type { AlertToastData } from "@/components/alerts/AlertToast";
import { markFired, hasFired } from "@/lib/firedAlerts";
import { playSound } from "@/lib/sounds";
import { useStore } from "@/lib/store";

function isQuietHour(s: NotificationSettings | null): boolean {
  if (!s?.quiet_hours_enabled) return false;
  const qs = s.quiet_start ?? "22:00";
  const qe = s.quiet_end ?? "08:00";
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (qs <= qe) return hhmm >= qs && hhmm < qe;
  return hhmm >= qs || hhmm < qe;
}

export function usePriceAlertChecker(
  symbol: string,
  livePrice: number | null,
  alerts: PriceAlert[],
  onTrigger: (alertId: number, price?: number) => void,
  onToast?: (data: AlertToastData) => void,
) {
  useEffect(() => {
    if (livePrice == null) return;

    const symbolAlerts = alerts.filter(
      (a) => a.symbol === symbol && !a.triggered && !hasFired(a.id)
    );

    for (const alert of symbolAlerts) {
      const hit =
        (alert.direction === "above" && livePrice >= alert.target_price) ||
        (alert.direction === "below" && livePrice <= alert.target_price);

      if (!hit) continue;

      markFired(alert.id);
      onTrigger(alert.id, livePrice);

      const settings = useStore.getState().notificationSettings;
      const quiet = isQuietHour(settings);

      if (!quiet) {
        onToast?.({
          id: alert.id,
          symbol: alert.symbol,
          direction: alert.direction,
          target_price: alert.target_price,
          livePrice,
        });

        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`${alert.symbol} Alert`, {
            body: `Price is ${alert.direction} $${alert.target_price.toLocaleString()} — now $${livePrice.toLocaleString()}`,
            icon: "/icons/icon-192.png",
          });
        }

        playSound(settings?.sound ?? "default");
      }
    }
  }, [livePrice, alerts, symbol, onTrigger, onToast]);
}
