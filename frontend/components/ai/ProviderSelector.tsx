"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { PROVIDERS } from "@/lib/types";
import type { AIProvider, KeyProvider } from "@/lib/types";
import ApiKeyModal from "./ApiKeyModal";

export default function ProviderSelector() {
  const activeProvider    = useStore((s) => s.activeProvider);
  const setActiveProvider = useStore((s) => s.setActiveProvider);
  const apiKeys           = useStore((s) => s.apiKeys);
  const savedProviders    = useStore((s) => s.savedProviders);

  const [modalProvider, setModalProvider] = useState<KeyProvider | null>(null);

  const handleSelect = (id: AIProvider) => {
    setActiveProvider(id);
    if (id === "free") return;
    const hasLocal = Boolean(apiKeys[id as keyof typeof apiKeys]);
    const hasCloud = savedProviders.includes(id);
    if (!hasLocal && !hasCloud) setModalProvider(id as KeyProvider);
  };

  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        {PROVIDERS.map((p) => {
          const isFree   = p.id === "free";
          const hasLocal = isFree || Boolean(apiKeys[p.id as keyof typeof apiKeys]);
          const hasCloud = savedProviders.includes(p.id);
          const hasKey   = hasLocal || hasCloud;
          const isActive = p.id === activeProvider;

          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                backgroundColor: isActive ? `${p.color}18` : "var(--bg-surface)",
                border: `1px solid ${isActive ? p.color + "55" : "var(--border)"}`,
                color: isActive ? p.color : "var(--text-secondary)",
              }}
              title={`${p.name} · ${p.model}${hasCloud ? " · Saved to account" : ""}`}
            >
              {hasKey ? (
                <CheckCircle2 size={12} style={{ color: isActive ? p.color : "var(--accent-green)" }} />
              ) : (
                <KeyRound size={12} style={{ color: "var(--text-muted)" }} />
              )}
              {p.name}
            </button>
          );
        })}

        {activeProvider !== "free" && (
          <button
            onClick={() => setModalProvider(activeProvider as KeyProvider)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
            title="Edit API key"
          >
            <KeyRound size={11} />
            {apiKeys[activeProvider as keyof typeof apiKeys] || savedProviders.includes(activeProvider) ? "Change key" : "Add key"}
          </button>
        )}
      </div>

      {modalProvider && (
        <ApiKeyModal provider={modalProvider} onClose={() => setModalProvider(null)} />
      )}
    </>
  );
}
