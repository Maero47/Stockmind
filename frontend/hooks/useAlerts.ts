"use client";

import useSWR from "swr";
import { useStore } from "@/lib/store";
import { getAlerts, createAlert, deleteAlert, triggerAlert } from "@/lib/api";
import type { AlertDirection } from "@/lib/types";

export function useAlerts() {
  const user = useStore((s) => s.user);

  const { data, mutate, isLoading } = useSWR(
    user ? "alerts" : null,
    getAlerts,
    { revalidateOnFocus: false }
  );

  async function create(symbol: string, targetPrice: number, direction: AlertDirection) {
    await createAlert(symbol, targetPrice, direction);
    await mutate();
  }

  async function remove(alertId: number) {
    await deleteAlert(alertId);
    await mutate();
  }

  async function trigger(alertId: number, price?: number) {
    await triggerAlert(alertId, price);
    await mutate();
  }

  return { alerts: data ?? [], isLoading, create, remove, trigger };
}
