"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export interface UserSearchResult {
  user_id: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
}

export function useUserSearch(query: string) {
  const trimmed = query.trim();

  const { data, isLoading } = useSWR(
    trimmed.length >= 2 ? `user-search:${trimmed}` : null,
    async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, avatar_color, avatar_url")
        .ilike("display_name", `%${trimmed}%`)
        .limit(5);
      if (error) throw error;
      return data as UserSearchResult[];
    },
    { revalidateOnFocus: false, dedupingInterval: 300 }
  );

  return { users: data ?? [], isLoading };
}
