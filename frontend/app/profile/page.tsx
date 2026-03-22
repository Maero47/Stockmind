"use client";

import { useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import ProfileCard from "@/components/profile/ProfileCard";
import ProfileStats from "@/components/profile/ProfileStats";
import PostPrediction from "@/components/profile/PostPrediction";
import PredictionFeed from "@/components/profile/PredictionFeed";
import RecentActivity from "@/components/profile/RecentActivity";
import { useProfile } from "@/hooks/useProfile";
import { usePredictionPosts } from "@/hooks/usePredictionPosts";
import { useStore } from "@/lib/store";

export default function ProfilePage() {
  const user = useStore((s) => s.user);
  const { ensureProfile } = useProfile();
  const { predictions, create, remove, toggleLike } = usePredictionPosts(user?.id ?? null);

  useEffect(() => {
    if (user) ensureProfile();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[800px] mx-auto px-4 pt-20 pb-24 md:pb-12">
        <div className="space-y-4">
          <ProfileCard />
          {user && <ProfileStats userId={user.id} isOwn />}

          <PostPrediction onCreate={create} />

          <p className="text-xs font-medium tracking-widest uppercase font-mono pt-2" style={{ color: "var(--text-muted)" }}>
            Your Predictions
          </p>
          <PredictionFeed
            predictions={predictions}
            isOwn
            onToggleLike={toggleLike}
            onDelete={remove}
          />

          {user && <RecentActivity userId={user.id} />}
        </div>
      </main>
    </div>
  );
}
