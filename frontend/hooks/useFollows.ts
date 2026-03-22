"use client";

import useSWR from "swr";
import { useCallback } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { FollowCounts } from "@/lib/types";

const supabase = createClient();

export function useFollows(targetUserId: string | null) {
  const user = useStore((s) => s.user);

  const { data: counts, mutate: mutateCounts } = useSWR(
    targetUserId ? `follows:counts:${targetUserId}` : null,
    async () => {
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("following_id", targetUserId!),
        supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("follower_id", targetUserId!),
      ]);
      return { followers: followers ?? 0, following: following ?? 0 } as FollowCounts;
    },
    { revalidateOnFocus: false }
  );

  const { data: isFollowing, mutate: mutateFollowing } = useSWR(
    user && targetUserId && user.id !== targetUserId ? `follows:check:${user.id}:${targetUserId}` : null,
    async () => {
      const { data } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();
      return !!data;
    },
    { revalidateOnFocus: false }
  );

  const follow = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    await supabase.from("user_follows").insert({ follower_id: user.id, following_id: targetUserId });
    await Promise.all([mutateFollowing(), mutateCounts()]);
  }, [user, targetUserId, mutateFollowing, mutateCounts]);

  const unfollow = useCallback(async () => {
    if (!user || !targetUserId) return;
    await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
    await Promise.all([mutateFollowing(), mutateCounts()]);
  }, [user, targetUserId, mutateFollowing, mutateCounts]);

  return {
    counts: counts ?? { followers: 0, following: 0 },
    isFollowing: isFollowing ?? false,
    follow,
    unfollow,
  };
}
