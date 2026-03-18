"use client";

import { Bookmark } from "lucide-react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useStore } from "@/lib/store";

export default function WatchlistButton({ symbol }: { symbol: string }) {
  const user = useStore((s) => s.user);
  const { symbols, add, remove } = useWatchlist();

  if (!user) return null;

  const saved = symbols.includes(symbol);

  async function toggle() {
    if (saved) await remove(symbol);
    else await add(symbol);
  }

  return (
    <button
      onClick={toggle}
      title={saved ? "Remove from watchlist" : "Add to watchlist"}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition-all"
      style={{
        border: `1px solid ${saved ? "var(--accent-green)" : "var(--border)"}`,
        backgroundColor: saved ? "rgba(0,230,118,0.12)" : "transparent",
        color: saved ? "var(--accent-green)" : "var(--text-muted)",
      }}
    >
      <Bookmark size={12} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Watch"}
    </button>
  );
}
