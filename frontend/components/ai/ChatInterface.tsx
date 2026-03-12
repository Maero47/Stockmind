"use client";

import {
  useState, useRef, useEffect, useCallback,
} from "react";
import { Send, Square, Trash2, Bot } from "lucide-react";
import { useStore } from "@/lib/store";
import { streamAnalysis } from "@/lib/api";
import type { AIProvider } from "@/lib/types";
import type { ChatMessage } from "@/lib/types";
import ChatMessageComponent from "./ChatMessage";
import ProviderSelector from "./ProviderSelector";

const QUICK_PROMPTS = [
  { label: "📊 Full Analysis",    text: "Give me a comprehensive analysis of this stock including trend, technicals, and recommendation." },
  { label: "⚠️ Risk Assessment",  text: "What are the key risk factors and what could go wrong with this stock?" },
  { label: "📈 Price Target",     text: "Based on the technical indicators and ML prediction, what are realistic price targets?" },
  { label: "📰 News Impact",      text: "How is the recent news sentiment affecting the stock and what should I watch for?" },
];

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

interface Props { symbol: string }

export default function ChatInterface({ symbol }: Props) {
  const {
    chatHistory, addMessage, updateLastMessage, clearChat,
    activeProvider, apiKeys, savedProviders,
    isChatStreaming, setIsChatStreaming,
  } = useStore();

  const [input,  setInput]  = useState("");
  const abortRef            = useRef<AbortController | null>(null);
  const bottomRef           = useRef<HTMLDivElement>(null);
  const textareaRef         = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Load keys from sessionStorage on mount
  const loadApiKeysFromSession = useStore((s) => s.loadApiKeysFromSession);
  useEffect(() => { loadApiKeysFromSession(); }, []);

  const activeKey       = apiKeys[activeProvider];
  // Key is available either locally (session) or saved to account in Supabase
  const hasCloudKey     = savedProviders.includes(activeProvider as AIProvider);
  const hasKey          = Boolean(activeKey) || hasCloudKey;

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isChatStreaming) return;

    // User message
    addMessage({
      id: nanoid(), role: "user", content: text.trim(),
      symbol, timestamp: new Date(),
    });
    setInput("");

    // Empty assistant message placeholder
    const assistantId = nanoid();
    const placeholder: ChatMessage = {
      id: assistantId, role: "assistant", content: "",
      symbol, timestamp: new Date(), isStreaming: true,
    };
    addMessage(placeholder);
    setIsChatStreaming(true);

    if (!hasKey) {
      updateLastMessage(
        "⚠️ No API key set for the selected provider. Go to **Settings** to add one.",
        false
      );
      setIsChatStreaming(false);
      return;
    }

    let accumulated = "";

    // Build history from all completed messages (exclude the new streaming placeholder)
    const history = useStore.getState().chatHistory
      .filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    abortRef.current = streamAnalysis({
      symbol,
      question: text.trim(),
      provider: activeProvider,
      apiKey:   activeKey,
      history,
      onToken: (token) => {
        accumulated += token;
        updateLastMessage(accumulated, true);
      },
      onDone: () => {
        updateLastMessage(accumulated, false);
        setIsChatStreaming(false);
      },
      onError: (msg) => {
        updateLastMessage(`❌ Error: ${msg}`, false);
        setIsChatStreaming(false);
      },
    });
  }, [
    isChatStreaming, addMessage, updateLastMessage, setIsChatStreaming,
    symbol, activeProvider, activeKey, hasKey,
  ]);

  const handleStop = () => {
    abortRef.current?.abort();
    updateLastMessage(
      useStore.getState().chatHistory.at(-1)?.content ?? "",
      false
    );
    setIsChatStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

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
            style={{
              backgroundColor: "rgba(0,230,118,0.1)",
              border: "1px solid rgba(0,230,118,0.25)",
            }}
          >
            <Bot size={13} style={{ color: "var(--accent-green)" }} />
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              StockMind AI
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              Analyzing {symbol}
            </span>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="p-1.5 rounded-lg transition-colors hover:bg-bg-elevated"
          title="Clear chat"
        >
          <Trash2 size={13} style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Provider selector */}
      <div
        className="px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <ProviderSelector />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: "rgba(0,230,118,0.06)",
                border: "1px solid rgba(0,230,118,0.15)",
              }}
            >
              <Bot size={24} style={{ color: "var(--accent-green)" }} />
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Ask anything about {symbol}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                I have live price data, technical indicators, and ML predictions ready.
              </p>
            </div>

            {/* Quick prompts */}
            <div className="flex flex-col gap-2 w-full mt-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.text)}
                  disabled={isChatStreaming}
                  className="w-full px-3 py-2.5 rounded-lg text-xs text-left transition-all disabled:opacity-50"
                  style={{
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatHistory.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            {/* Quick prompts above input when chat has messages */}
            {!isChatStreaming && (
              <div className="flex flex-wrap gap-1.5 mt-2 pb-1">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => sendMessage(p.text)}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div
        className="px-3 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2"
          style={{
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-bright)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${symbol}… (Enter to send)`}
            disabled={isChatStreaming}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-1 max-h-32"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              lineHeight: "1.5",
            }}
          />
          {isChatStreaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,61,87,0.15)", color: "var(--accent-red)" }}
              title="Stop generating"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
              title="Send (Enter)"
            >
              <Send size={13} />
            </button>
          )}
        </div>
        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
