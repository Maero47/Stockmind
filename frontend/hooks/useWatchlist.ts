"use client";

import useSWR from "swr";
import { useStore } from "@/lib/store";
import { getWatchlist, addToWatchlist, removeFromWatchlist, reorderWatchlist } from "@/lib/api";

export function useWatchlist() {
  const user = useStore((s) => s.user);

  const { data, mutate, isLoading } = useSWR(
    user ? "watchlist" : null,
    getWatchlist,
    { revalidateOnFocus: false }
  );

  const items = data ?? [];
  const symbols = items.map((i) => i.symbol);

  async function add(symbol: string) {
    if (!user) return;
    if (symbols.length >= 15) return;
    await addToWatchlist(symbol);
    await mutate();
  }

  async function remove(symbol: string) {
    if (!user) return;
    await removeFromWatchlist(symbol);
    await mutate();
  }

  async function reorder(newSymbols: string[]) {
    await mutate(
      newSymbols.map((s) => ({ symbol: s, added_at: items.find((i) => i.symbol === s)?.added_at ?? "" })),
      false
    );
    await reorderWatchlist(newSymbols);
    await mutate();
  }

  return { symbols, items, isLoading, add, remove, reorder };
}
