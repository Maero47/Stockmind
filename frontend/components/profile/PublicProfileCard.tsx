"use client";

import { Calendar } from "lucide-react";
import { usePublicProfile } from "@/hooks/useProfile";
import { useStore } from "@/lib/store";
import FollowButton from "./FollowButton";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function safeColor(raw: string): string {
  return HEX_RE.test(raw) ? raw : "#2979FF";
}

interface Props {
  userId: string;
}

export default function PublicProfileCard({ userId }: Props) {
  const currentUser = useStore((s) => s.user);
  const { profile, isLoading } = usePublicProfile(userId);

  if (isLoading) {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="h-24 animate-pulse" style={{ backgroundColor: "var(--bg-subtle)" }} />
        <div className="px-6 pt-14 pb-6">
          <div className="h-5 w-32 rounded animate-pulse mb-2" style={{ backgroundColor: "var(--bg-subtle)" }} />
          <div className="h-3 w-48 rounded animate-pulse" style={{ backgroundColor: "var(--bg-subtle)" }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>User not found</p>
      </div>
    );
  }

  const color = safeColor(profile.avatar_color);
  const initial = profile.display_name[0]?.toUpperCase() ?? "?";
  const memberSince = new Date(profile.created_at);
  const ageDays = Math.floor((Date.now() - memberSince.getTime()) / 86400000);
  const isOwnProfile = currentUser?.id === userId;

  function formatDate(d: Date): string {
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function formatAge(days: number): string {
    if (days < 1) return "Joined today";
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
    const years = Math.floor(days / 365);
    const rem = Math.floor((days % 365) / 30);
    return rem > 0 ? `${years}y ${rem}mo` : `${years} year${years > 1 ? "s" : ""}`;
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Banner */}
      <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${color}20, ${color}05)` }}>
        <div
          className="absolute -bottom-10 left-6 w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold font-mono shadow-lg overflow-hidden"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `2px solid ${color}50`,
          }}
        >
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-6 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {profile.display_name}
            </h2>
          </div>
          {!isOwnProfile && currentUser && <FollowButton targetUserId={userId} />}
        </div>

        {profile.bio && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {profile.bio}
          </p>
        )}

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} style={{ color: "var(--text-muted)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {formatDate(memberSince)}
            </span>
          </div>
          <div
            className="px-2 py-0.5 rounded-md text-xs font-mono font-medium"
            style={{
              backgroundColor: ageDays >= 365 ? "rgba(0,230,118,0.1)" : ageDays >= 30 ? "rgba(41,121,255,0.1)" : "rgba(255,255,255,0.04)",
              color: ageDays >= 365 ? "var(--accent-green)" : ageDays >= 30 ? "var(--accent-blue)" : "var(--text-muted)",
            }}
          >
            {formatAge(ageDays)}
          </div>
        </div>
      </div>
    </div>
  );
}
