"use client";

import useSWR from "swr";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { PortfolioPosition } from "@/lib/types";

const supabase = createClient();

async function fetchPortfolio(): Promise<PortfolioPosition[]> {
  const { data, error } = await supabase
    .from("portfolio_positions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function usePortfolio() {
  const user = useStore((s) => s.user);

  const { data, mutate, isLoading } = useSWR(
    user ? "portfolio:supabase" : null,
    fetchPortfolio,
    { revalidateOnFocus: false }
  );

  const positions = data ?? [];

  async function add(
    symbol: string, quantity: number, avgBuyPrice: number,
    boughtAt: string, notes?: string,
  ) {
    if (!user) return;

    const existing = positions.find((p) => p.symbol === symbol.toUpperCase());
    let finalQty = quantity;
    let finalAvg = avgBuyPrice;

    if (existing) {
      finalQty = existing.quantity + quantity;
      finalAvg = ((existing.quantity * existing.avg_buy_price) + (quantity * avgBuyPrice)) / finalQty;
      finalAvg = Math.round(finalAvg * 100) / 100;
    }

    await supabase.from("portfolio_positions").upsert(
      {
        user_id: user.id,
        symbol: symbol.toUpperCase(),
        quantity: finalQty,
        avg_buy_price: finalAvg,
        bought_at: boughtAt,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,symbol" }
    );
    await mutate();
  }

  async function edit(id: number, updates: { quantity?: number; avg_buy_price?: number; notes?: string }) {
    if (!user) return;
    await supabase.from("portfolio_positions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    await mutate();
  }

  async function remove(id: number) {
    if (!user) return;
    await supabase.from("portfolio_positions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    await mutate();
  }

  return { positions, isLoading, add, edit, remove, mutate };
}
