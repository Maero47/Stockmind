"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import ChatInterface from "@/components/ai/ChatInterface";
import ChatRoom from "@/components/community/ChatRoom";

interface Props {
  symbol: string;
}

export default function MobileChatPanel({ symbol }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ai" | "community">("ai");

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 lg:hidden w-14 h-14 rounded-full flex items-center justify-center shadow-xl"
        style={{
          backgroundColor: "var(--accent-green)",
          color: "#080C14",
          boxShadow: "0 4px 20px rgba(0,230,118,0.3)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <Bot size={22} />
      </button>

      {/* Full-screen overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[60] lg:hidden flex flex-col"
          style={{ backgroundColor: "var(--bg-base)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 shrink-0"
            style={{
              borderBottom: "1px solid var(--border)",
              paddingTop: "env(safe-area-inset-top, 12px)",
              paddingBottom: "12px",
            }}
          >
            <div
              className="flex gap-1 rounded-lg p-1"
              style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setTab("ai")}
                className="px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
                style={{
                  backgroundColor: tab === "ai" ? "var(--accent-green)" : "transparent",
                  color: tab === "ai" ? "#080C14" : "var(--text-muted)",
                }}
              >
                AI Analysis
              </button>
              <button
                onClick={() => setTab("community")}
                className="px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all"
                style={{
                  backgroundColor: tab === "community" ? "var(--accent-blue)" : "transparent",
                  color: tab === "community" ? "#080C14" : "var(--text-muted)",
                }}
              >
                Community
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-lg"
              style={{ color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {tab === "ai" ? (
              <ChatInterface symbol={symbol} />
            ) : (
              <ChatRoom symbol={symbol} />
            )}
          </div>
        </div>
      )}
    </>
  );
}
