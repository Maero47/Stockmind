"use client";

import { useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { ChatRoomMessage } from "@/lib/types";

const supabase = createClient();

export type ChannelStatus = "connected" | "connecting" | "disconnected";

export function useChatRoom(symbol: string) {
  const user = useStore((s) => s.user);
  const [messages, setMessages] = useState<ChatRoomMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<ChannelStatus>("connecting");

  const upperSymbol = symbol.toUpperCase();

  useEffect(() => {
    if (!upperSymbol) return;
    setIsLoading(true);
    setStatus("connecting");

    supabase
      .from("chat_messages")
      .select("id, user_id, symbol, content, created_at, display_name, avatar_color, avatar_url, account_age_days")
      .eq("symbol", upperSymbol)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        setMessages(data ?? []);
        setIsLoading(false);
      });

    const channel = supabase
      .channel(`chat:${upperSymbol}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `symbol=eq.${upperSymbol}`,
        },
        (payload) => {
          const msg = payload.new as ChatRoomMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe((state) => {
        if (state === "SUBSCRIBED") setStatus("connected");
        else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") setStatus("disconnected");
        else setStatus("connecting");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [upperSymbol]);

  const sendMessage = useCallback(async (content: string, displayName: string, avatarColor: string, accountAgeDays: number, avatarUrl?: string | null) => {
    if (!user || !content.trim()) return;

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      symbol: upperSymbol,
      content: content.trim().slice(0, 500),
      display_name: displayName,
      avatar_color: avatarColor,
      avatar_url: avatarUrl ?? null,
      account_age_days: accountAgeDays,
    });

    if (error) throw error;
  }, [user, upperSymbol]);

  return { messages, isLoading, sendMessage, status };
}
