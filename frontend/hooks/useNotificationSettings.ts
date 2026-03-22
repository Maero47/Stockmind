"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { useStore } from "@/lib/store";
import { getNotificationSettings, updateNotificationSettings } from "@/lib/api";
import type { NotificationSettings } from "@/lib/types";

const DEFAULTS: NotificationSettings = {
  quiet_hours_enabled: false,
  quiet_start: null,
  quiet_end: null,
  group_notifications: false,
  sound: "default",
};

export function useNotificationSettings() {
  const user = useStore((s) => s.user);
  const setNotificationSettings = useStore((s) => s.setNotificationSettings);

  const { data, mutate, isLoading } = useSWR(
    user ? "notification-settings" : null,
    getNotificationSettings,
    { revalidateOnFocus: false }
  );

  const settings = data ?? DEFAULTS;

  useEffect(() => {
    setNotificationSettings(settings);
  }, [settings, setNotificationSettings]);

  async function update(patch: Partial<NotificationSettings>) {
    const merged = { ...settings, ...patch };
    setNotificationSettings(merged);
    await mutate(merged, false);
    await updateNotificationSettings(patch);
    await mutate();
  }

  return { settings, isLoading, update };
}
