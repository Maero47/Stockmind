"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useUserActivity } from "@/hooks/useUserActivity";

interface Props {
  userId: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function RecentActivity({ userId }: Props) {
  const { activity, isLoading } = useUserActivity(userId);

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <div className="h-4 w-24 rounded animate-pulse mb-3" style={{ backgroundColor: "var(--bg-subtle)" }} />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: "var(--bg-subtle)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <p className="text-xs font-medium tracking-widest uppercase font-mono mb-3" style={{ color: "var(--text-muted)" }}>
        Recent Activity
      </p>

      {activity.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: "var(--text-muted)" }}>
          No recent chat activity
        </p>
      ) : (
        <div className="space-y-2">
          {activity.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg"
              style={{ backgroundColor: "var(--bg-elevated)" }}
            >
              <MessageCircle size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent-blue)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/stock/${item.symbol}`}>
                    <span className="text-[10px] font-mono font-bold" style={{ color: "var(--accent-green)" }}>
                      {item.symbol}
                    </span>
                  </Link>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.created_at)}</span>
                </div>
                <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {item.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
