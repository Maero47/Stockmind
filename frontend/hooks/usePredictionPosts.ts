"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { PredictionPost, PredictionDirection } from "@/lib/types";

const supabase = createClient();

interface RawPost {
  id: number;
  user_id: string;
  symbol: string;
  direction: PredictionDirection;
  target_price: number | null;
  note: string | null;
  created_at: string;
  user_profiles: { display_name: string; avatar_color: string; avatar_url: string | null };
  prediction_likes: { user_id: string }[];
}

function transform(raw: RawPost, myId: string | undefined): PredictionPost {
  return {
    id: raw.id,
    user_id: raw.user_id,
    symbol: raw.symbol,
    direction: raw.direction,
    target_price: raw.target_price,
    note: raw.note,
    created_at: raw.created_at,
    display_name: raw.user_profiles?.display_name ?? "User",
    avatar_color: raw.user_profiles?.avatar_color ?? "#2979FF",
    avatar_url: raw.user_profiles?.avatar_url ?? null,
    likes_count: raw.prediction_likes?.length ?? 0,
    liked_by_me: myId ? raw.prediction_likes?.some((l) => l.user_id === myId) ?? false : false,
  };
}

export function usePredictionPosts(userId: string | null) {
  const user = useStore((s) => s.user);

  const { data, mutate, isLoading } = useSWR(
    userId ? `predictions:user:${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from("prediction_posts")
        .select("*, user_profiles(display_name, avatar_color, avatar_url), prediction_likes(user_id)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as unknown as RawPost[]).map((r) => transform(r, user?.id));
    },
    { revalidateOnFocus: false }
  );

  const create = useCallback(async (input: {
    symbol: string;
    direction: PredictionDirection;
    target_price?: number;
    note?: string;
  }) => {
    if (!user) return;
    const { error } = await supabase.from("prediction_posts").insert({
      user_id: user.id,
      symbol: input.symbol.toUpperCase(),
      direction: input.direction,
      target_price: input.target_price ?? null,
      note: input.note?.trim().slice(0, 280) || null,
    });
    if (error) throw error;
    await mutate();
  }, [user, mutate]);

  const remove = useCallback(async (id: number) => {
    if (!user) return;
    await supabase.from("prediction_posts").delete().eq("id", id).eq("user_id", user.id);
    await mutate();
  }, [user, mutate]);

  const toggleLike = useCallback(async (postId: number, currentlyLiked: boolean) => {
    if (!user) return;
    if (currentlyLiked) {
      await supabase.from("prediction_likes").delete().eq("prediction_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("prediction_likes").insert({ prediction_id: postId, user_id: user.id });
    }
    await mutate();
  }, [user, mutate]);

  return {
    predictions: data ?? [],
    isLoading,
    create,
    remove,
    toggleLike,
    mutate,
  };
}
