"use client";

import useSWR from "swr";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

const supabase = createClient();

const AVATAR_COLORS = [
  "#00E676", "#2979FF", "#FF6D00", "#AA00FF", "#FFD600",
  "#00BCD4", "#FF1744", "#F50057", "#76FF03", "#00E5FF",
];

function pickColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export function useProfile() {
  const user = useStore((s) => s.user);

  const { data: profile, mutate, isLoading } = useSWR(
    user ? `profile:${user.id}` : null,
    () => fetchProfile(user!.id),
    { revalidateOnFocus: false }
  );

  async function ensureProfile(): Promise<UserProfile> {
    if (!user) throw new Error("not authenticated");
    if (profile) return profile;

    const defaultName = user.email?.split("@")[0] ?? "User";
    const color = pickColor(user.id);

    const { data, error } = await supabase
      .from("user_profiles")
      .upsert(
        { user_id: user.id, display_name: defaultName, avatar_color: color },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;
    await mutate(data);
    return data;
  }

  async function updateProfile(updates: { display_name?: string; bio?: string; avatar_url?: string }) {
    if (!user) return;
    await ensureProfile();
    await supabase
      .from("user_profiles")
      .update(updates)
      .eq("user_id", user.id);
    await mutate();
  }

  async function uploadAvatar(file: File): Promise<string> {
    if (!user) throw new Error("not authenticated");

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const MAX_SIZE = 5 * 1024 * 1024;
    if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
    if (file.size > MAX_SIZE) throw new Error("Image must be under 5 MB");

    await ensureProfile();

    const EXT_MAP: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
    const ext = EXT_MAP[file.type] ?? "png";
    const path = `avatars/${user.id}.${ext}`;

    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("user_profiles")
      .update({ avatar_url: url })
      .eq("user_id", user.id);
    await mutate();
    return url;
  }

  async function removeAvatar() {
    if (!user) return;
    await supabase
      .from("user_profiles")
      .update({ avatar_url: null })
      .eq("user_id", user.id);
    await mutate();
  }

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
  const avatarColor = profile?.avatar_color ?? (user ? pickColor(user.id) : "#2979FF");
  const avatarUrl = profile?.avatar_url ?? null;
  const initial = displayName[0]?.toUpperCase() ?? "?";

  const memberSince = user?.created_at ? new Date(user.created_at) : null;
  const accountAgeDays = memberSince
    ? Math.floor((Date.now() - memberSince.getTime()) / 86400000)
    : 0;

  function formatAge(days: number): string {
    if (days < 1) return "Today";
    if (days < 30) return `${days}d`;
    if (days < 365) return `${Math.floor(days / 30)}mo`;
    return `${Math.floor(days / 365)}y`;
  }

  return {
    profile,
    displayName,
    avatarColor,
    avatarUrl,
    initial,
    memberSince,
    accountAgeDays,
    accountAgeLabel: formatAge(accountAgeDays),
    isLoading,
    ensureProfile,
    updateProfile,
    uploadAvatar,
    removeAvatar,
    mutate,
  };
}

export function usePublicProfile(userId: string | null) {
  const { data, isLoading } = useSWR(
    userId ? `profile:public:${userId}` : null,
    () => fetchProfile(userId!),
    { revalidateOnFocus: false }
  );
  return { profile: data, isLoading };
}
