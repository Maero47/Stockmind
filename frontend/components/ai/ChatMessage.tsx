"use client";

import { Bot, User } from "lucide-react";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Minimal markdown renderer: bold, code, headers, lists
function renderContent(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    // H2/H3 (## / ###)
    if (line.startsWith("### ")) {
      nodes.push(
        <p key={i} className="text-sm font-semibold mt-3 mb-0.5" style={{ color: "var(--text-primary)" }}>
          {line.slice(4)}
        </p>
      );
      return;
    }
    if (line.startsWith("## ")) {
      nodes.push(
        <p key={i} className="text-sm font-semibold mt-4 mb-1" style={{ color: "var(--text-primary)" }}>
          {line.slice(3)}
        </p>
      );
      return;
    }
    // List item
    if (line.startsWith("- ") || line.startsWith("• ")) {
      nodes.push(
        <div key={i} className="flex gap-2 text-sm leading-relaxed">
          <span style={{ color: "var(--accent-green)" }}>▸</span>
          <span>{inlineFormat(line.slice(2))}</span>
        </div>
      );
      return;
    }
    // Numbered list
    if (/^\d+\./.test(line)) {
      const rest = line.replace(/^\d+\.\s*/, "");
      nodes.push(
        <div key={i} className="text-sm leading-relaxed mt-1">
          {inlineFormat(line.replace(rest, ""))}
          <span>{inlineFormat(rest)}</span>
        </div>
      );
      return;
    }
    // Empty line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={i} className="h-1.5" />);
      return;
    }
    // Normal paragraph
    nodes.push(
      <p key={i} className="text-sm leading-relaxed">
        {inlineFormat(line)}
      </p>
    );
  });

  return nodes;
}

function inlineFormat(text: string): React.ReactNode {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 600 }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ backgroundColor: "var(--bg-subtle)", color: "var(--accent-blue)" }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[80%]">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm"
            style={{
              backgroundColor: "var(--bg-subtle)",
              border: "1px solid var(--border-bright)",
              color: "var(--text-primary)",
            }}
          >
            {message.content}
          </div>
          <p className="text-xs mt-1 text-right" style={{ color: "var(--text-muted)" }}>
            {formatTime(message.timestamp)}
          </p>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center ml-2 mt-0.5 shrink-0"
          style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border)" }}
        >
          <User size={13} style={{ color: "var(--text-secondary)" }} />
        </div>
      </div>
    );
  }

  // Assistant
  return (
    <div className="flex gap-2 mb-5">
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: "rgba(0,230,118,0.1)",
          border: "1px solid rgba(0,230,118,0.25)",
        }}
      >
        <Bot size={13} style={{ color: "var(--accent-green)" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl rounded-tl-sm px-4 py-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text-secondary)" }}>
            {renderContent(message.content)}
            {message.isStreaming && (
              <span className="cursor-blink" aria-label="typing" />
            )}
          </div>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          StockMind AI · {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
