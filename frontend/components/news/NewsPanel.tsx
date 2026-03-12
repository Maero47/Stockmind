"use client";

import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { useNews } from "@/hooks/useStockData";
import type { SentimentLabel } from "@/lib/types";

const SENTIMENT_COLOR: Record<SentimentLabel, string> = {
  Positive: "var(--accent-green)",
  Negative: "var(--accent-red)",
  Neutral:  "var(--text-secondary)",
};

function timeAgo(value: string | number) {
  const ts   = typeof value === "number" ? value * 1000 : new Date(value).getTime();
  const diff = Date.now() - ts;
  const h    = Math.floor(diff / 3_600_000);
  if (h < 1)  return "< 1h ago";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface Props { symbol: string }

export default function NewsPanel({ symbol }: Props) {
  const { data: news, isLoading, mutate } = useNews(symbol);

  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Newspaper size={14} style={{ color: "var(--accent-blue)" }} />
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          News &amp; Sentiment
        </span>
        <button
          onClick={() => mutate()}
          className="ml-auto p-1 rounded transition-colors hover:bg-bg-elevated"
          title="Refresh"
        >
          <RefreshCw size={12} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-3 py-3 animate-pulse">
              <div className="w-0.5 rounded-full bg-border shrink-0 h-10" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 rounded bg-bg-elevated w-full" />
                <div className="h-3 rounded bg-bg-elevated w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && (!news || news.length === 0) && (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No recent news for {symbol}
        </p>
      )}

      {/* News items */}
      {!isLoading && news && news.length > 0 && (
        <div className="space-y-0">
          {news.map((item, i) => {
            const sentiment = item.sentiment as SentimentLabel;
            const color     = SENTIMENT_COLOR[sentiment] ?? "var(--text-secondary)";
            return (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 py-3 transition-colors hover:bg-bg-elevated rounded-lg px-2 -mx-2 group"
                style={{
                  borderBottom: i < news.length - 1 ? "1px solid var(--border)" : "none",
                  textDecoration: "none",
                }}
              >
                {/* Sentiment bar */}
                <div
                  className="w-0.5 shrink-0 rounded-full self-stretch"
                  style={{ backgroundColor: color }}
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug mb-1.5 line-clamp-2" style={{ color: "var(--text-primary)" }}>
                    {item.headline}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.source}</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {item.published_at ? timeAgo(item.published_at) : ""}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium ml-auto"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {sentiment}
                    </span>
                  </div>
                </div>

                <ExternalLink
                  size={12}
                  className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity"
                  style={{ color: "var(--text-muted)" }}
                />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
