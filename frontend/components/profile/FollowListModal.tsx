"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Users, UserPlus } from "lucide-react";
import { fetchFollowers, fetchFollowing } from "@/hooks/useFollows";
import type { FollowUser } from "@/hooks/useFollows";
import { safeImageUrl } from "@/lib/sanitize";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function safeColor(raw: string): string {
  return HEX_RE.test(raw) ? raw : "#2979FF";
}

interface Props {
  userId: string;
  tab: "followers" | "following";
  onClose: () => void;
}

export default function FollowListModal({ userId, tab, onClose }: Props) {
  const [activeTab, setActiveTab] = useState(tab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn = activeTab === "followers" ? fetchFollowers : fetchFollowing;
    fn(userId).then((list) => {
      setUsers(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, activeTab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />
      <div
        className="relative w-full max-w-sm rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-bright)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("followers")}
              className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === "followers" ? "var(--bg-elevated)" : "transparent",
                color: activeTab === "followers" ? "var(--text-primary)" : "var(--text-muted)",
                border: activeTab === "followers" ? "1px solid var(--border-bright)" : "1px solid transparent",
              }}
            >
              <Users size={12} />
              Followers
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === "following" ? "var(--bg-elevated)" : "transparent",
                color: activeTab === "following" ? "var(--text-primary)" : "var(--text-muted)",
                border: activeTab === "following" ? "1px solid var(--border-bright)" : "1px solid transparent",
              }}
            >
              <UserPlus size={12} />
              Following
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <div
                className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "var(--accent-blue)" }}
              />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {activeTab === "followers" ? "No followers yet" : "Not following anyone"}
              </p>
            </div>
          ) : (
            <div className="py-1">
              {users.map((u) => {
                const color = safeColor(u.avatar_color);
                return (
                  <Link
                    key={u.user_id}
                    href={`/profile/${u.user_id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ color: "var(--text-primary)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: `${color}20`,
                        color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      {safeImageUrl(u.avatar_url) ? (
                        <img src={safeImageUrl(u.avatar_url)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.display_name[0]?.toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">{u.display_name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
