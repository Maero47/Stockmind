"use client";

import { useEffect, useState, useCallback } from "react";
import { Keyboard, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["\u2318/Ctrl", "K"], description: "Focus search" },
  { keys: ["/"], description: "Focus search" },
  { keys: ["Esc"], description: "Close search / modal" },
  { keys: ["?"], description: "Keyboard shortcuts" },
  { keys: ["Shift", "Enter"], description: "New line in chat" },
  { keys: ["Enter"], description: "Send chat message" },
];

export default function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const editable = (e.target as HTMLElement).isContentEditable;
      if (tag === "INPUT" || tag === "TEXTAREA" || editable) return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((p) => !p);
        return;
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md mx-4 rounded-xl p-6"
        style={{
          backgroundColor: "var(--bg-elevated)",
          border: "1px solid var(--border-bright)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Keyboard size={16} style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg transition-colors hover:bg-bg-subtle"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-2">
          {SHORTCUTS.map((s) => (
            <div
              key={s.description}
              className="flex items-center justify-between py-2 px-3 rounded-lg"
              style={{ backgroundColor: "var(--bg-subtle)" }}
            >
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {s.description}
              </span>
              <div className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: "var(--bg-base)",
                      border: "1px solid var(--border-bright)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
          Press <kbd className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: "var(--bg-subtle)", border: "1px solid var(--border)" }}>?</kbd> to toggle this panel
        </p>
      </div>
    </div>
  );
}
