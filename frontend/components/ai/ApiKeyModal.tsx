"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Eye, EyeOff, ExternalLink, ShieldCheck, Cloud, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { PROVIDERS } from "@/lib/types";
import type { KeyProvider } from "@/lib/types";
import { saveKey, testProviderKey } from "@/lib/api";

interface Props {
  provider: KeyProvider;
  onClose: () => void;
}

export default function ApiKeyModal({ provider, onClose }: Props) {
  const info     = PROVIDERS.find((p) => p.id === provider)!;
  const setApiKey        = useStore((s) => s.setApiKey);
  const addSavedProvider = useStore((s) => s.addSavedProvider);
  const existing         = useStore((s) => s.apiKeys[provider]);
  const user             = useStore((s) => s.user);
  const isLoggedIn       = Boolean(user);

  const [value,   setValue]   = useState(existing ?? "");
  const [visible, setVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState("");

  const handleSave = async () => {
    const key = value.trim();
    if (!key) return;

    setError("");
    setTesting(true);
    const result = await testProviderKey(provider, key);
    setTesting(false);

    if (!result.ok) {
      setError(result.error ?? "Invalid key");
      return;
    }

    setSaving(true);
    setApiKey(provider, key);

    if (isLoggedIn) {
      try {
        await saveKey(provider, key);
        addSavedProvider(provider);
      } catch {}
    }

    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 600);
  };

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-bright)" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Connect {info.name}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {info.model}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-bg-subtle"
          >
            <X size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        {/* Key input */}
        <label className="block mb-4">
          <span className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
            API Key
          </span>
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-bright)" }}
          >
            <input
              type={visible ? "text" : "password"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder={`Paste your ${info.name} API key…`}
              className="flex-1 bg-transparent outline-none px-4 py-3 text-sm font-mono"
              style={{ color: "var(--text-primary)" }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="px-3 py-3 transition-colors hover:bg-bg-subtle"
            >
              {visible
                ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} />
                : <Eye    size={14} style={{ color: "var(--text-muted)" }} />
              }
            </button>
          </div>
        </label>

        {/* Free tier CTA */}
        <a
          href={info.freeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-lg mb-4 group"
          style={{
            backgroundColor: "rgba(41,121,255,0.06)",
            border: "1px solid rgba(41,121,255,0.18)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--accent-blue)" }}>
            Get your {info.name} API key →
          </span>
          <ExternalLink size={11} style={{ color: "var(--accent-blue)" }} className="opacity-60 group-hover:opacity-100" />
        </a>

        {/* Security note */}
        <div
          className="flex items-start gap-2 p-3 rounded-lg mb-5"
          style={{
            backgroundColor: isLoggedIn ? "rgba(0,230,118,0.04)" : "rgba(41,121,255,0.04)",
            border: `1px solid ${isLoggedIn ? "rgba(0,230,118,0.1)" : "rgba(41,121,255,0.1)"}`,
          }}
        >
          {isLoggedIn
            ? <Cloud size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent-green)" }} />
            : <ShieldCheck size={13} className="mt-0.5 shrink-0" style={{ color: "var(--accent-blue)" }} />
          }
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {isLoggedIn
              ? <>Encrypted and <strong style={{ color: "var(--text-secondary)" }}>saved to your account</strong>. Available across all devices and sessions.</>
              : <>Stored in <strong style={{ color: "var(--text-secondary)" }}>sessionStorage only</strong>. Sign in to save it to your account permanently.</>
            }
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg mb-4"
            style={{
              backgroundColor: "rgba(255,61,87,0.06)",
              border: "1px solid rgba(255,61,87,0.18)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--accent-red)" }}>{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: "var(--bg-subtle)", color: "var(--text-secondary)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!value.trim() || testing || saving}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            style={{
              backgroundColor: saved ? "rgba(0,230,118,0.15)" : "var(--accent-green)",
              color:           saved ? "var(--accent-green)" : "#080C14",
            }}
          >
            {testing ? <><Loader2 size={13} className="animate-spin" /> Testing...</>
             : saving ? <><Loader2 size={13} className="animate-spin" /> Saving...</>
             : saved ? "Saved!"
             : "Test & Save"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
