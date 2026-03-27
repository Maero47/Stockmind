"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Heart, Trash2, Target } from "lucide-react";
import type { PredictionPost } from "@/lib/types";
import { safeImageUrl } from "@/lib/sanitize";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function safeColor(raw: string): string {
  return HEX_RE.test(raw) ? raw : "#2979FF";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

interface Props {
  predictions: PredictionPost[];
  isOwn: boolean;
  onToggleLike: (id: number, liked: boolean) => void;
  onDelete?: (id: number) => void;
}

export default function PredictionFeed({ predictions, isOwn, onToggleLike, onDelete }: Props) {
  if (predictions.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
      >
        <Target size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {isOwn ? "No predictions yet. Share your first stock call above." : "No predictions yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {predictions.map((p) => {
        const color = safeColor(p.avatar_color);
        const isBullish = p.direction === "bullish";

        return (
          <div
            key={p.id}
            className="rounded-xl p-4"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${p.user_id}`}>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden"
                    style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}
                  >
                    {safeImageUrl(p.avatar_url) ? (
                      <img src={safeImageUrl(p.avatar_url)!} alt="" className="w-full h-full object-cover" />
                    ) : (
                      p.display_name[0]?.toUpperCase()
                    )}
                  </div>
                </Link>
                <div>
                  <Link href={`/profile/${p.user_id}`} className="text-xs font-medium hover:underline" style={{ color }}>
                    {p.display_name}
                  </Link>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(p.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/stock/${p.symbol}`}>
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: "var(--bg-subtle)", color: "var(--accent-green)", border: "1px solid var(--border)" }}
                  >
                    {p.symbol}
                  </span>
                </Link>
                <span
                  className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: isBullish ? "rgba(0,230,118,0.1)" : "rgba(255,23,68,0.1)",
                    color: isBullish ? "var(--accent-green)" : "var(--accent-red, #FF1744)",
                  }}
                >
                  {isBullish ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {isBullish ? "Bullish" : "Bearish"}
                </span>
              </div>
            </div>

            {/* Target price */}
            {p.target_price && (
              <div className="flex items-center gap-1.5 mb-2">
                <Target size={11} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                  Target: ${p.target_price.toLocaleString()}
                </span>
              </div>
            )}

            {/* Note */}
            {p.note && (
              <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                {p.note}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
              <button
                onClick={() => onToggleLike(p.id, p.liked_by_me)}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: p.liked_by_me ? "#FF1744" : "var(--text-muted)" }}
              >
                <Heart size={13} fill={p.liked_by_me ? "#FF1744" : "none"} />
                {p.likes_count > 0 && <span>{p.likes_count}</span>}
              </button>
              {isOwn && onDelete && (
                <button
                  onClick={() => onDelete(p.id)}
                  className="flex items-center gap-1 text-[10px] transition-colors"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
