"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, MessageCircle, Users } from "lucide-react";
import { useChatRoom } from "@/hooks/useChatRoom";
import { useProfile } from "@/hooks/useProfile";
import { useStore } from "@/lib/store";
import type { ChatRoomMessage } from "@/lib/types";
import { safeImageUrl } from "@/lib/sanitize";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function AgeBadge({ days }: { days: number }) {
  let label: string;
  let color: string;
  if (days < 7) { label = "new"; color = "var(--text-muted)"; }
  else if (days < 30) { label = `${days}d`; color = "var(--text-muted)"; }
  else if (days < 365) { label = `${Math.floor(days / 30)}mo`; color = "var(--accent-blue)"; }
  else { label = `${Math.floor(days / 365)}y`; color = "var(--accent-green)"; }

  return (
    <span
      className="text-[9px] font-mono px-1 py-0.5 rounded"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {label}
    </span>
  );
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
function safeColor(raw: string): string {
  return HEX_RE.test(raw) ? raw : "#2979FF";
}

function RoomMessage({ msg, isOwn, ownAvatarUrl }: { msg: ChatRoomMessage; isOwn: boolean; ownAvatarUrl?: string | null }) {
  const imgUrl = safeImageUrl(isOwn ? (ownAvatarUrl ?? msg.avatar_url) : msg.avatar_url);
  const color = safeColor(msg.avatar_color);
  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 overflow-hidden"
        style={{
          backgroundColor: `${color}20`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {imgUrl ? (
          <img src={imgUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          msg.display_name[0]?.toUpperCase()
        )}
      </div>
      <div className={`max-w-[75%] ${isOwn ? "text-right" : ""}`}>
        <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? "justify-end" : ""}`}>
          <Link href={`/profile/${msg.user_id}`} className="text-[11px] font-medium hover:underline" style={{ color }}>
            {msg.display_name}
          </Link>
          <AgeBadge days={msg.account_age_days} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {formatTime(msg.created_at)}
          </span>
        </div>
        <div
          className={`inline-block px-3 py-2 text-sm leading-relaxed ${isOwn ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm"}`}
          style={{
            backgroundColor: isOwn ? "var(--bg-subtle)" : "var(--bg-elevated)",
            border: `1px solid ${isOwn ? "var(--border-bright)" : "var(--border)"}`,
            color: "var(--text-secondary)",
          }}
        >
          {msg.content}
        </div>
      </div>
    </div>
  );
}

interface Props {
  symbol: string;
}

export default function ChatRoom({ symbol }: Props) {
  const user = useStore((s) => s.user);
  const { messages, isLoading, sendMessage, status } = useChatRoom(symbol);
  const { displayName, avatarColor, avatarUrl, accountAgeDays, ensureProfile } = useProfile();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim() || sending || !user) return;
    setSending(true);
    try {
      await ensureProfile();
      await sendMessage(input, displayName, avatarColor, accountAgeDays, avatarUrl);
      setInput("");
    } catch {
      // silent
    }
    setSending(false);
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uniqueUsers = new Set(messages.map((m) => m.user_id)).size;

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        height: "calc(100vh - 100px)",
        minHeight: "560px",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(41,121,255,0.1)", border: "1px solid rgba(41,121,255,0.25)" }}
          >
            <MessageCircle size={13} style={{ color: "var(--accent-blue)" }} />
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              {symbol} Chat
            </span>
            <span className="text-xs ml-2 flex items-center gap-1 inline-flex" style={{ color: "var(--text-muted)" }}>
              <Users size={10} /> {uniqueUsers} {uniqueUsers === 1 ? "person" : "people"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${status === "connecting" ? "animate-pulse" : ""}`}
            style={{
              backgroundColor: status === "connected" ? "var(--accent-green)" : status === "connecting" ? "var(--accent-yellow, #FFD600)" : "var(--accent-red, #FF1744)",
            }}
          />
          <span style={{ color: status === "connected" ? "var(--accent-green)" : "var(--text-muted)" }}>
            {status === "connected" ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-blue)" }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(41,121,255,0.06)", border: "1px solid rgba(41,121,255,0.15)" }}
            >
              <MessageCircle size={24} style={{ color: "var(--accent-blue)" }} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                No messages yet
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Be the first to share your thoughts on {symbol}
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <RoomMessage key={msg.id} msg={msg} isOwn={msg.user_id === user?.id} ownAvatarUrl={avatarUrl} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        {!user ? (
          <p className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
            Sign in to join the discussion
          </p>
        ) : (
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${symbol} chat...`}
              rows={1}
              maxLength={500}
              className="flex-1 bg-transparent outline-none resize-none text-sm py-1 max-h-20"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)", lineHeight: "1.5" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: "var(--accent-blue)", color: "#080C14" }}
            >
              <Send size={13} />
            </button>
          </div>
        )}
        {user && (
          <p className="text-[10px] text-center mt-1.5" style={{ color: "var(--text-muted)" }}>
            {input.length}/500
          </p>
        )}
        <p className="text-[10px] text-center mt-1" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
          Messages are automatically deleted every 24 hours.
        </p>
      </div>
    </div>
  );
}
