"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import PublicProfileCard from "@/components/profile/PublicProfileCard";
import ProfileStats from "@/components/profile/ProfileStats";
import PredictionFeed from "@/components/profile/PredictionFeed";
import RecentActivity from "@/components/profile/RecentActivity";
import { usePredictionPosts } from "@/hooks/usePredictionPosts";
import { useStore } from "@/lib/store";
import { useEffect } from "react";

interface Props {
  params: Promise<{ userId: string }>;
}

export default function PublicProfilePage({ params }: Props) {
  const { userId } = use(params);
  const currentUser = useStore((s) => s.user);
  const router = useRouter();
  const { predictions, toggleLike } = usePredictionPosts(userId);

  useEffect(() => {
    if (currentUser?.id === userId) router.replace("/profile");
  }, [currentUser, userId, router]);

  if (currentUser?.id === userId) return null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-[800px] mx-auto px-4 pt-20 pb-24 md:pb-12">
        <div className="space-y-4">
          <PublicProfileCard userId={userId} />
          <ProfileStats userId={userId} predictionsCount={predictions.length} />

          {predictions.length > 0 && (
            <>
              <p className="text-xs font-medium tracking-widest uppercase font-mono pt-2" style={{ color: "var(--text-muted)" }}>
                Predictions
              </p>
              <PredictionFeed
                predictions={predictions}
                isOwn={false}
                onToggleLike={toggleLike}
              />
            </>
          )}

          <RecentActivity userId={userId} />
        </div>
      </main>
    </div>
  );
}
