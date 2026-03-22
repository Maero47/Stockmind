"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Eye, EyeOff, CheckCircle2, XCircle, KeyRound,
  Trash2, ExternalLink, ShieldCheck, Zap, ArrowLeft,
  Loader2, ChevronRight, Cloud, CloudOff, Bell, Volume2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { useStore } from "@/lib/store";
import { PROVIDERS } from "@/lib/types";
import type { AIProvider } from "@/lib/types";
import { testProviderKey, listSavedKeys, saveKey, deleteKey } from "@/lib/api";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { playSound } from "@/lib/sounds";

// ── Toast ─────────────────────────────────────────────────────────────────────

type ToastKind = "success" | "error" | "info";

interface Toast { id: number; kind: ToastKind; message: string }

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => onDismiss(t.id)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-xl transition-all max-w-sm text-left"
          style={{
            backgroundColor:
              t.kind === "success" ? "rgba(0,230,118,0.12)"
              : t.kind === "error" ? "rgba(255,61,87,0.12)"
              : "rgba(41,121,255,0.12)",
            border: `1px solid ${
              t.kind === "success" ? "rgba(0,230,118,0.3)"
              : t.kind === "error" ? "rgba(255,61,87,0.3)"
              : "rgba(41,121,255,0.3)"
            }`,
            color:
              t.kind === "success" ? "var(--accent-green)"
              : t.kind === "error" ? "var(--accent-red)"
              : "var(--accent-blue)",
            backdropFilter: "blur(12px)",
          }}
        >
          {t.kind === "success" && <CheckCircle2 size={15} />}
          {t.kind === "error"   && <XCircle      size={15} />}
          {t.kind === "info"    && <Zap          size={15} />}
          {t.message}
        </button>
      ))}
    </div>
  );
}

// ── Provider details ──────────────────────────────────────────────────────────

const PROVIDER_DETAILS: Record<AIProvider, {
  tagline: string;
  freeTier: string | null;
  logo: string;
  models: string[];
}> = {
  groq: {
    tagline: "Fastest inference in the west. Truly free.",
    freeTier: "14,400 requests / day free — no card required",
    logo: "G",
    models: ["Llama 3.3 70B", "Llama 3.1 8B", "Mixtral 8x7B"],
  },
  openai: {
    tagline: "Most capable reasoning. GPT-4o family.",
    freeTier: null,
    logo: "○",
    models: ["GPT-4o Mini", "GPT-4o", "GPT-4 Turbo"],
  },
  anthropic: {
    tagline: "Precise, nuanced analysis. Long context.",
    freeTier: null,
    logo: "A",
    models: ["Claude Haiku 4.5", "Claude Sonnet 4.6", "Claude Opus 4.6"],
  },
  gemini: {
    tagline: "Google's multimodal model.",
    freeTier: null,
    logo: "◈",
    models: ["Gemini 2.5 Flash", "Gemini 2.5 Pro", "Gemini 2.0 Flash Lite"],
  },
};

// ── Provider card ─────────────────────────────────────────────────────────────

interface ProviderCardProps {
  id: AIProvider;
  isLoggedIn: boolean;
  onToast: (kind: ToastKind, msg: string) => void;
}

function ProviderCard({ id, isLoggedIn, onToast }: ProviderCardProps) {
  const info    = PROVIDERS.find((p) => p.id === id)!;
  const details = PROVIDER_DETAILS[id];

  const apiKeys         = useStore((s) => s.apiKeys);
  const setApiKey       = useStore((s) => s.setApiKey);
  const clearApiKey     = useStore((s) => s.clearApiKey);
  const savedProviders  = useStore((s) => s.savedProviders);
  const addSavedProvider    = useStore((s) => s.addSavedProvider);
  const removeSavedProvider = useStore((s) => s.removeSavedProvider);

  const sessionKey   = apiKeys[id] ?? "";
  const isSavedCloud = savedProviders.includes(id);
  // "has key" if either the session has it, or it's saved to the server
  const hasKey = Boolean(sessionKey) || isSavedCloud;

  const [draft,      setDraft]      = useState(sessionKey);
  const [editing,    setEditing]    = useState(!hasKey);
  const [visible,    setVisible]    = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [removing,   setRemoving]   = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  // Keep draft in sync when store changes
  useEffect(() => { if (!editing) setDraft(sessionKey); }, [sessionKey]);

  // Save is only reachable after a successful test — not exposed directly
  const handleSaveAfterTest = async (key: string) => {
    setApiKey(id, key);
    setEditing(false);

    if (isLoggedIn) {
      setSaving(true);
      try {
        await saveKey(id, key);
        addSavedProvider(id);
        onToast("success", `${info.name} connected & saved to account ✓`);
      } catch {
        onToast("success", `${info.name} connected (saved locally only)`);
      } finally {
        setSaving(false);
      }
    } else {
      onToast("success", `${info.name} connected successfully ✓`);
    }
  };

  const handleRemove = async () => {
    clearApiKey(id);
    setDraft("");
    setEditing(true);
    setTestResult(null);

    if (isLoggedIn && isSavedCloud) {
      setRemoving(true);
      try {
        await deleteKey(id);
        removeSavedProvider(id);
        onToast("info", `${info.name} key removed from your account`);
      } catch {
        onToast("error", "Could not remove from account — try again");
      } finally {
        setRemoving(false);
      }
    } else {
      onToast("info", `${info.name} key removed`);
    }
  };

  const handleTest = async () => {
    const key = (editing ? draft : sessionKey).trim();
    if (!key) { onToast("error", "Paste a key first"); return; }

    setTesting(true);
    setTestResult(null);
    const result = await testProviderKey(id, key);
    setTesting(false);

    if (result.ok) {
      setTestResult("ok");
      if (editing) {
        // Only save when in edit mode (new or updated key)
        await handleSaveAfterTest(key);
      } else {
        onToast("success", `${info.name} key is valid ✓`);
      }
    } else {
      setTestResult("fail");
      onToast("error", result.error ?? "Invalid key — not saved");
    }
  };

  const statusColor = hasKey ? "var(--accent-green)" : "var(--text-muted)";
  const statusLabel = isSavedCloud
    ? "Saved to account"
    : hasKey
    ? "Session only"
    : "Not configured";

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        backgroundColor: "var(--bg-surface)",
        border: `1px solid ${hasKey ? `${info.color}30` : "var(--border)"}`,
        boxShadow: hasKey ? `0 0 24px ${info.color}0A` : "none",
      }}
    >
      {/* Card header */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo circle */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0 select-none"
              style={{
                backgroundColor: `${info.color}18`,
                border: `1px solid ${info.color}30`,
                color: info.color,
                fontFamily: "var(--font-dm-mono)",
              }}
            >
              {details.logo}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                  {info.name}
                </h3>
                {/* Status badge */}
                <span
                  className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: hasKey ? "rgba(0,230,118,0.1)" : "var(--bg-elevated)",
                    border: `1px solid ${hasKey ? "rgba(0,230,118,0.25)" : "var(--border)"}`,
                    color: statusColor,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                  {statusLabel}
                  {isSavedCloud && <Cloud size={10} className="ml-0.5" />}
                </span>
              </div>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                {info.model}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                {details.tagline}
              </p>
            </div>
          </div>

          {/* Get key link */}
          <a
            href={info.freeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs shrink-0 transition-colors hover:underline"
            style={{ color: info.color }}
          >
            Get key <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Key input area */}
      <div className="px-6 py-4 space-y-4">
        {/* If cloud-saved but no session key, show info banner instead of input */}
        {isSavedCloud && !sessionKey && !editing ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              backgroundColor: "rgba(0,230,118,0.06)",
              border: "1px solid rgba(0,230,118,0.18)",
            }}
          >
            <Cloud size={14} style={{ color: "var(--accent-green)" }} className="shrink-0" />
            <p className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>
              Key is encrypted and saved to your account. You can use it without entering it again.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="text-xs shrink-0 hover:underline"
              style={{ color: "var(--accent-green)" }}
            >
              Update
            </button>
          </div>
        ) : (
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
              API Key
            </label>
            <div
              className="flex items-center rounded-xl overflow-hidden transition-all"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: `1px solid ${
                  testResult === "ok"   ? "rgba(0,230,118,0.4)"
                  : testResult === "fail" ? "rgba(255,61,87,0.4)"
                  : editing             ? "var(--border-bright)"
                  : "var(--border)"
                }`,
              }}
            >
              <KeyRound size={14} className="ml-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
              <input
                type={visible ? "text" : "password"}
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setTestResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleTest()}
                readOnly={!editing}
                placeholder={editing ? `Paste your ${info.name} API key…` : "••••••••••••••••••••••••"}
                className="flex-1 bg-transparent outline-none px-3 py-3 text-sm font-mono"
                style={{
                  color: editing ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: editing ? "text" : "default",
                  caretColor: info.color,
                }}
              />

              {testResult === "ok"   && <CheckCircle2 size={15} className="mr-2" style={{ color: "var(--accent-green)" }} />}
              {testResult === "fail" && <XCircle      size={15} className="mr-2" style={{ color: "var(--accent-red)" }} />}

              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="px-3 py-3 transition-colors hover:bg-bg-subtle"
                tabIndex={-1}
              >
                {visible
                  ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} />
                  : <Eye    size={14} style={{ color: "var(--text-muted)" }} />
                }
              </button>

              {hasKey && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-3 text-xs font-medium transition-colors border-l"
                  style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Test connection */}
          <button
            onClick={handleTest}
            disabled={testing || saving || (!draft.trim() && !sessionKey)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{
              backgroundColor: "var(--bg-elevated)",
              border: "1px solid var(--border-bright)",
              color: "var(--text-secondary)",
            }}
          >
            {testing
              ? <><Loader2 size={13} className="animate-spin" /> Testing…</>
              : editing
                ? <><Zap size={13} style={{ color: info.color }} /> Test &amp; Save</>
                : <><Zap size={13} style={{ color: info.color }} /> Test Connection</>
            }
          </button>

          {/* Cancel editing */}
          {editing && hasKey && (
            <button
              onClick={() => { setEditing(false); setDraft(sessionKey); setTestResult(null); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
            >
              Cancel
            </button>
          )}

          {/* Remove key */}
          {hasKey && (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ml-auto disabled:opacity-60"
              style={{
                backgroundColor: "rgba(255,61,87,0.06)",
                border: "1px solid rgba(255,61,87,0.15)",
                color: "var(--accent-red)",
              }}
            >
              {removing
                ? <><Loader2 size={13} className="animate-spin" /> Removing…</>
                : <><Trash2 size={13} /> Remove</>
              }
            </button>
          )}
        </div>

        {/* Free tier / Get key link */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
          style={{
            backgroundColor: `${info.color}08`,
            border: `1px solid ${info.color}18`,
          }}
        >
          <Zap size={12} style={{ color: info.color }} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs" style={{ color: info.color }}>
              {details.freeTier ? `Free tier: ${details.freeTier}` : "Paid API key required"}
            </span>
          </div>
          <a
            href={info.freeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs shrink-0 ml-2 hover:underline"
            style={{ color: info.color }}
          >
            Get key <ChevronRight size={11} />
          </a>
        </div>

        {/* Available models */}
        <div className="flex flex-wrap gap-1.5">
          {details.models.map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded text-xs font-mono"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Notification settings section ─────────────────────────────────────────────

const SOUNDS = ["default", "chime", "bell", "none"];

function NotificationSection() {
  const { settings, update } = useNotificationSettings();
  const theme = useStore((s) => s.theme);

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: "var(--accent-blue)" }} />
          <h2 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            Notifications
          </h2>
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Control when and how you receive alert notifications.
        </p>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Quiet Hours */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Quiet Hours</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Suppress notifications during specific hours.
            </p>
          </div>
          <button
            onClick={() => {
              const enabling = !settings.quiet_hours_enabled;
              if (enabling) {
                update({
                  quiet_hours_enabled: true,
                  quiet_start: settings.quiet_start ?? "22:00",
                  quiet_end: settings.quiet_end ?? "08:00",
                });
              } else {
                update({ quiet_hours_enabled: false });
              }
            }}
            className="w-10 h-6 rounded-full transition-colors shrink-0 relative"
            style={{
              backgroundColor: settings.quiet_hours_enabled ? "var(--accent-green)" : "var(--bg-elevated)",
              border: `1px solid ${settings.quiet_hours_enabled ? "var(--accent-green)" : "var(--border-bright)"}`,
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                backgroundColor: settings.quiet_hours_enabled ? "#fff" : "var(--text-muted)",
                left: settings.quiet_hours_enabled ? "calc(100% - 20px)" : "2px",
              }}
            />
          </button>
        </div>

        {settings.quiet_hours_enabled && (
          <div className="flex items-center gap-3 pl-4">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>From</label>
            <input
              type="time"
              value={settings.quiet_start ?? "22:00"}
              onChange={(e) => update({ quiet_start: e.target.value })}
              className="px-2 py-1.5 rounded-lg text-xs font-mono"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                colorScheme: theme,
              }}
            />
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>To</label>
            <input
              type="time"
              value={settings.quiet_end ?? "08:00"}
              onChange={(e) => update({ quiet_end: e.target.value })}
              className="px-2 py-1.5 rounded-lg text-xs font-mono"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                colorScheme: theme,
              }}
            />
          </div>
        )}

        {/* Group notifications */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Group Notifications</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Batch multiple alerts into a single notification.
            </p>
          </div>
          <button
            onClick={() => update({ group_notifications: !settings.group_notifications })}
            className="w-10 h-6 rounded-full transition-colors shrink-0 relative"
            style={{
              backgroundColor: settings.group_notifications ? "var(--accent-green)" : "var(--bg-elevated)",
              border: `1px solid ${settings.group_notifications ? "var(--accent-green)" : "var(--border-bright)"}`,
            }}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
              style={{
                backgroundColor: settings.group_notifications ? "#fff" : "var(--text-muted)",
                left: settings.group_notifications ? "calc(100% - 20px)" : "2px",
              }}
            />
          </button>
        </div>

        {/* Sound */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Alert Sound</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Sound played when an alert triggers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playSound(settings.sound)}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
              title="Preview sound"
            >
              <Volume2 size={13} />
            </button>
            <select
              value={settings.sound}
              onChange={(e) => { update({ sound: e.target.value }); playSound(e.target.value); }}
              className="px-2 py-1.5 rounded-lg text-xs"
              style={{
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {SOUNDS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

let _toastId = 0;

export default function SettingsPage() {
  const loadKeys           = useStore((s) => s.loadApiKeysFromSession);
  const apiKeys            = useStore((s) => s.apiKeys);
  const savedProviders     = useStore((s) => s.savedProviders);
  const setSavedProviders  = useStore((s) => s.setSavedProviders);
  const setActiveProvider  = useStore((s) => s.setActiveProvider);
  const activeProvider     = useStore((s) => s.activeProvider);
  const user               = useStore((s) => s.user);
  const isLoggedIn         = Boolean(user);

  const [toasts,      setToasts]      = useState<Toast[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  useEffect(() => { loadKeys(); }, []);

  // Fetch server-saved providers when user is authenticated
  useEffect(() => {
    if (!isLoggedIn) return;
    setLoadingKeys(true);
    listSavedKeys()
      .then((rows) => {
        const providers = rows.map((r) => r.provider as AIProvider);
        setSavedProviders(providers);
        // Auto-switch active provider to a saved one if current has no local key
        if (providers.length > 0 && !apiKeys[activeProvider]) {
          setActiveProvider(providers[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingKeys(false));
  }, [isLoggedIn]);

  const pushToast = (kind: ToastKind, message: string) => {
    const id = ++_toastId;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const connectedCount = (["groq", "openai", "anthropic", "gemini"] as AIProvider[]).filter(
    (id) => Boolean(apiKeys[id]) || savedProviders.includes(id)
  ).length;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 pt-24 pb-28 md:pb-20">

        {/* ── Back link ──────────────────────────────────────────────── */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-secondary)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        {/* ── Page header ────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              API Keys &amp; Providers
            </h1>
            {connectedCount > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "rgba(0,230,118,0.1)",
                  border: "1px solid rgba(0,230,118,0.25)",
                  color: "var(--accent-green)",
                }}
              >
                {connectedCount} / 4 connected
              </span>
            )}
            {loadingKeys && (
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            )}
          </div>
          <p style={{ color: "var(--text-secondary)" }}>
            {isLoggedIn
              ? "Keys are Fernet-encrypted and stored securely in your account. Only you can use them."
              : "Sign in to save keys to your account. Without an account, keys are stored in this browser session only."}
          </p>
        </div>

        {/* ── Free-tier highlight ─────────────────────────────────────── */}
        <div
          className="flex items-start gap-4 p-5 rounded-2xl mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(0,230,118,0.06) 0%, rgba(41,121,255,0.04) 100%)",
            border: "1px solid rgba(0,230,118,0.18)",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(0,230,118,0.12)" }}
          >
            <Zap size={16} style={{ color: "var(--accent-green)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm mb-1" style={{ color: "var(--accent-green)" }}>
              Start for free with Groq
            </p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Groq offers 14,400 free requests per day — no credit card needed.
              Get your key at{" "}
              <a
                href="https://console.groq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                style={{ color: "var(--accent-green)" }}
              >
                console.groq.com
              </a>{" "}
              in under 2 minutes.
            </p>
          </div>
        </div>

        {/* ── Provider cards ──────────────────────────────────────────── */}
        <div className="space-y-4 mb-10">
          {(["groq", "openai", "anthropic", "gemini"] as AIProvider[]).map((id) => (
            <ProviderCard key={id} id={id} isLoggedIn={isLoggedIn} onToast={pushToast} />
          ))}
        </div>

        {/* ── Notification settings ──────────────────────────────────── */}
        {isLoggedIn && <NotificationSection />}

        {/* ── Security note ───────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: "var(--accent-green)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Security &amp; Privacy
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: "🔐",
                title: "Fernet encrypted",
                body: isLoggedIn
                  ? "Keys are AES-128 encrypted before being stored. The plaintext is never saved anywhere."
                  : "Sign in to enable encrypted cloud storage for your keys.",
              },
              {
                icon: "🗑️",
                title: "Auto-cleared on sign-out",
                body: "Session keys are wiped automatically when you sign out or close the browser tab.",
              },
              {
                icon: "🚫",
                title: "Never logged",
                body: "Keys are only decrypted server-side at request time and are never written to logs.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl p-4"
                style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}
              >
                <p className="text-lg mb-2">{icon}</p>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  {title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>

        </div>
      </main>

      <ToastList toasts={toasts} onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </div>
  );
}
