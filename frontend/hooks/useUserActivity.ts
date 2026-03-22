"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface ActivityItem {
  id: number;
  symbol: string;
  content: string;
  created_at: string;
}

export function useUserActivity(userId: string | null) {
  const { data, isLoading } = useSWR(
    userId ? `activity:${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, symbol, content, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as ActivityItem[];
    },
    { revalidateOnFocus: false }
  );

  return { activity: data ?? [], isLoading };
}
