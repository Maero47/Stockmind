"use client";

import useSWR from "swr";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

async function fetchWatchlist() {
  const { data, error } = await supabase
    .from("watchlist")
    .select("symbol, added_at")
    .order("added_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function useWatchlist() {
  const user = useStore((s) => s.user);

  const { data, mutate, isLoading } = useSWR(
    user ? "watchlist:supabase" : null,
    fetchWatchlist,
    { revalidateOnFocus: false }
  );

  const symbols = data?.map((i) => i.symbol) ?? [];

  async function add(symbol: string) {
    if (!user) return;
    if (symbols.length >= 15) {
      alert("Watchlist is full (15 max). Remove a symbol first.");
      return;
    }
    await supabase.from("watchlist").upsert(
      { user_id: user.id, symbol: symbol.toUpperCase() },
      { onConflict: "user_id,symbol" }
    );
    await mutate();
  }

  async function remove(symbol: string) {
    if (!user) return;
    await supabase.from("watchlist").delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol.toUpperCase());
    await mutate();
  }

  return { symbols, items: data ?? [], isLoading, add, remove };
}
