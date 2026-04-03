"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Square, Bot, Briefcase } from "lucide-react";
import { useStore } from "@/lib/store";
import { streamAnalysis, getFreeRemaining } from "@/lib/api";
import type { AIProvider } from "@/lib/types";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import type { EnrichedPosition, PortfolioSummary } from "@/hooks/usePortfolioStats";
import ChatMessageComponent from "../ai/ChatMessage";
import ProviderSelector from "../ai/ProviderSelector";
import { currencySymbol } from "@/lib/currency";

const QUICK_PROMPTS = [
  { label: "Portfolio Overview", text: "Give me a full overview of my portfolio: diversification, risk, and performance." },
  { label: "Risk Assessment", text: "What are the biggest risks in my current portfolio and how can I reduce them?" },
  { label: "Rebalance Ideas", text: "Based on my current allocation, how should I rebalance my portfolio?" },
  { label: "Best & Worst", text: "Which positions are my best and worst performers and why?" },
];

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

function buildPortfolioContext(positions: EnrichedPosition[], summary: PortfolioSummary): string {
  if (!positions.length) return "The user has no positions in their portfolio.";

  const currencies = [...new Set(positions.map((p) => p.currency))];
  const multiCurrency = currencies.length > 1;

  const lines = [
    `PORTFOLIO SUMMARY:`,
    `Total Value: $${summary.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Total Cost: $${summary.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Total P&L: $${summary.totalPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${summary.totalPnlPct >= 0 ? "+" : ""}${summary.totalPnlPct.toFixed(2)}%)`,
    `Daily Change: $${summary.dailyChange.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${summary.dailyChangePct >= 0 ? "+" : ""}${summary.dailyChangePct.toFixed(2)}%)`,
    `Positions: ${summary.positionCount}`,
    multiCurrency ? `Note: Portfolio contains multiple currencies (${currencies.join(", ")}). Use each position's own currency when discussing its price.` : `Currency: ${currencies[0] ?? "USD"}`,
    ``,
    `POSITIONS:`,
  ];

  const sorted = [...positions].sort((a, b) => b.marketValueUsd - a.marketValueUsd);
  for (const p of sorted) {
    const cs = currencySymbol(p.currency);
    lines.push(
      `- ${p.symbol} [${p.currency}]: ${p.quantity} shares @ ${cs}${p.avg_buy_price.toFixed(2)} avg | ` +
      `Price: ${cs}${p.currentPrice?.toFixed(2) ?? "N/A"} | ` +
      `Value: ${cs}${p.marketValue.toFixed(2)} | ` +
      `P&L: ${cs}${p.unrealizedPnl.toFixed(2)} (${p.unrealizedPnlPct >= 0 ? "+" : ""}${p.unrealizedPnlPct.toFixed(2)}%) | ` +
      `Weight: ${p.allocation.toFixed(1)}%`
    );
  }

  return lines.join("\n");
}

interface PortfolioChatProps {
  positions: EnrichedPosition[];
  summary: PortfolioSummary;
}

export default function PortfolioChat({ positions, summary }: PortfolioChatProps) {
  const {
    activeProvider, apiKeys, savedProviders, user,
  } = useStore();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [freeRemaining, setFreeRemaining] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadApiKeysFromSession = useStore((s) => s.loadApiKeysFromSession);
  useEffect(() => { loadApiKeysFromSession(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isFree = activeProvider === "free";

  useEffect(() => {
    if (isFree && user) getFreeRemaining().then((r) => setFreeRemaining(r.remaining)).catch(() => {});
    else if (!isFree) setFreeRemaining(null);
  }, [isFree, user]);
  const activeKey = isFree ? "" : apiKeys[activeProvider];
  const hasCloudKey = savedProviders.includes(activeProvider as AIProvider);
  const hasKey = isFree || Boolean(activeKey) || hasCloudKey;

  const addMsg = useCallback((msg: ChatMessageType) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const updateLast = useCallback((content: string, streaming: boolean) => {
    setMessages((prev) => {
      const copy = [...prev];
      if (copy.length) {
        copy[copy.length - 1] = { ...copy[copy.length - 1], content, isStreaming: streaming };
      }
      return copy;
    });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const trimmed = text.trim();

    addMsg({
      id: nanoid(), role: "user", content: trimmed,
      symbol: "PORTFOLIO", timestamp: new Date(),
    });
    setInput("");

    addMsg({
      id: nanoid(), role: "assistant", content: "",
      symbol: "PORTFOLIO", timestamp: new Date(), isStreaming: true,
    });
    setIsStreaming(true);

    if (!hasKey) {
      updateLast("No API key set for the selected provider. Go to **Settings** to add one.", false);
      setIsStreaming(false);
      return;
    }

    const portfolioContext = buildPortfolioContext(positions, summary);
    const questionWithContext = `[PORTFOLIO DATA]\n${portfolioContext}\n\n[USER QUESTION]\n${trimmed}`;

    const history = messages
      .filter((m) => !m.isStreaming && m.content.trim())
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    let accumulated = "";

    abortRef.current = streamAnalysis({
      symbol: positions[0]?.symbol ?? "SPY",
      question: questionWithContext,
      provider: isFree ? "free" : activeProvider,
      apiKey: isFree ? "" : activeKey,
      history,
      onToken: (token) => {
        accumulated += token;
        updateLast(accumulated, true);
      },
      onDone: () => {
        updateLast(accumulated, false);
        setIsStreaming(false);
        if (isFree) getFreeRemaining().then((r) => setFreeRemaining(r.remaining)).catch(() => {});
      },
      onError: (msg) => {
        updateLast(`Error: ${msg}`, false);
        setIsStreaming(false);
        if (isFree) getFreeRemaining().then((r) => setFreeRemaining(r.remaining)).catch(() => {});
      },
    });
  }, [isStreaming, addMsg, updateLast, positions, summary, messages, activeProvider, activeKey, hasKey]);

  const handleStop = () => {
    abortRef.current?.abort();
    updateLast(messages[messages.length - 1]?.content ?? "", false);
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden w-full"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        height: "480px",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "rgba(0,230,118,0.1)",
            border: "1px solid rgba(0,230,118,0.25)",
          }}
        >
          <Briefcase size={13} style={{ color: "var(--accent-green)" }} />
        </div>
        <div>
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Portfolio Analyst
          </span>
          <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
            {summary.positionCount} position{summary.positionCount !== 1 ? "s" : ""}
          </span>
        </div>
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
        {messages.length === 0 ? (
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
                Analyze your portfolio
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Ask about performance, risk, diversification, or rebalancing.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.text)}
                  disabled={isStreaming || !positions.length}
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
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            {!isStreaming && (
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
            placeholder={positions.length ? "Ask about your portfolio... (Enter to send)" : "Add positions to start analyzing"}
            disabled={isStreaming || !positions.length}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm py-1 max-h-32"
            style={{
              color: "var(--text-primary)",
              fontFamily: "var(--font-body)",
              lineHeight: "1.5",
            }}
          />
          {isStreaming ? (
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
              disabled={!input.trim() || !positions.length}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: "var(--accent-green)", color: "#080C14" }}
              title="Send (Enter)"
            >
              <Send size={13} />
            </button>
          )}
        </div>
        {isFree && (
          <p className="text-[10px] text-center mt-2" style={{ color: "var(--accent-green)", opacity: 0.8 }}>
            Free tier{freeRemaining !== null ? `: ${freeRemaining} of 10 remaining today` : ": 10 messages/day"} -- conversations are not saved
          </p>
        )}
        <p className="text-xs text-center mt-1.5" style={{ color: "var(--text-muted)" }}>
          Shift+Enter for new line
        </p>
        <p className="text-[10px] text-center mt-1" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
          Not financial advice. For informational purposes only.
        </p>
      </div>
    </div>
  );
}
