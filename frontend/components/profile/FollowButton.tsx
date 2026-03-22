"use client";

import { useState } from "react";
import { UserPlus, UserCheck } from "lucide-react";
import { useFollows } from "@/hooks/useFollows";

interface Props {
  targetUserId: string;
}

export default function FollowButton({ targetUserId }: Props) {
  const { isFollowing, follow, unfollow } = useFollows(targetUserId);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    if (isFollowing) await unfollow();
    else await follow();
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
      style={{
        backgroundColor: isFollowing ? "var(--bg-subtle)" : "var(--accent-blue)",
        color: isFollowing ? "var(--text-secondary)" : "#080C14",
        border: isFollowing ? "1px solid var(--border-bright)" : "1px solid transparent",
      }}
    >
      {isFollowing ? <UserCheck size={13} /> : <UserPlus size={13} />}
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
