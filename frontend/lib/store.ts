"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Session, User } from "@supabase/supabase-js";
import type { AIProvider, ApiKeys, ChatMessage, NotificationSettings, Prediction, StockQuote } from "./types";
import { encryptData, decryptData } from "./crypto";

// ── Session key for API keys ──────────────────────────────────────────────────
const SESSION_KEY = "stockmind_keys";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StockMindState {
  // Auth (Supabase)
  user:       User | null;
  session:    Session | null;
  setSession: (session: Session | null) => void;
  clearApiKeys: () => void;

  // Providers that have an encrypted key saved server-side
  savedProviders: AIProvider[];
  setSavedProviders: (providers: AIProvider[]) => void;
  addSavedProvider: (provider: AIProvider) => void;
  removeSavedProvider: (provider: AIProvider) => void;

  // Selected symbol being analyzed
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;

  // Selected AI provider
  activeProvider: AIProvider;
  setActiveProvider: (provider: AIProvider) => void;

  // API keys (sessionStorage — never persisted to server)
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  clearApiKey: (provider: keyof ApiKeys) => void;
  loadApiKeysFromSession: () => void;
  saveApiKeysToSession: () => void;

  // Chat history
  chatHistory: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string, isStreaming?: boolean) => void;
  clearChat: () => void;

  // ML predictions cache (symbol → Prediction)
  predictions: Record<string, Prediction>;
  setPrediction: (symbol: string, prediction: Prediction) => void;

  // Quoted stock cache (symbol → StockQuote)
  quotes: Record<string, StockQuote>;
  setQuote: (symbol: string, quote: StockQuote) => void;

  // Chat persistence
  activeConversationId: number | null;
  setActiveConversationId: (id: number | null) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;

  // Notification settings (reactive, shared across components)
  notificationSettings: NotificationSettings | null;
  setNotificationSettings: (s: NotificationSettings | null) => void;

  // UI state
  isChatStreaming: boolean;
  setIsChatStreaming: (v: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<StockMindState>()(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user:    null,
      session: null,
      setSession: (session) => set({ session, user: session?.user ?? null }),
      clearApiKeys: () => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(SESSION_KEY);
        }
        set({
          apiKeys: { groq: "", openai: "", anthropic: "", gemini: "" },
          savedProviders: [],
        });
      },

      // ── Saved providers (server-side) ─────────────────────────────────────
      savedProviders: [],
      setSavedProviders: (providers) => set({ savedProviders: providers }),
      addSavedProvider: (provider) =>
        set((state) => ({
          savedProviders: state.savedProviders.includes(provider)
            ? state.savedProviders
            : [...state.savedProviders, provider],
        })),
      removeSavedProvider: (provider) =>
        set((state) => ({
          savedProviders: state.savedProviders.filter((p) => p !== provider),
        })),

      // ── Symbol ────────────────────────────────────────────────────────────
      selectedSymbol: "AAPL",
      setSelectedSymbol: (symbol) =>
        set({ selectedSymbol: symbol.toUpperCase() }),

      // ── Provider ─────────────────────────────────────────────────────────
      activeProvider: "free",
      setActiveProvider: (provider) => set({ activeProvider: provider }),

      // ── API Keys ─────────────────────────────────────────────────────────
      apiKeys: { groq: "", openai: "", anthropic: "", gemini: "" },

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        }));
        get().saveApiKeysToSession();
      },

      clearApiKey: (provider) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: "" },
        }));
        get().saveApiKeysToSession();
      },

      loadApiKeysFromSession: () => {
        if (typeof window === "undefined") return;
        try {
          const raw = sessionStorage.getItem(SESSION_KEY);
          if (!raw) return;
          decryptData(raw).then((plain) => {
            const parsed = JSON.parse(plain) as Partial<ApiKeys>;
            set((state) => ({ apiKeys: { ...state.apiKeys, ...parsed } }));
          }).catch(() => {
            sessionStorage.removeItem(SESSION_KEY);
          });
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      },

      saveApiKeysToSession: () => {
        if (typeof window === "undefined") return;
        const { apiKeys } = get();
        encryptData(JSON.stringify(apiKeys)).then((encrypted) => {
          try { sessionStorage.setItem(SESSION_KEY, encrypted); } catch {}
        }).catch(() => {});
      },

      // ── Chat ──────────────────────────────────────────────────────────────
      chatHistory: [],

      addMessage: (message) =>
        set((state) => ({ chatHistory: [...state.chatHistory, message] })),

      updateLastMessage: (content, isStreaming = false) =>
        set((state) => {
          const history = [...state.chatHistory];
          if (history.length === 0) return state;
          const last = { ...history[history.length - 1], content, isStreaming };
          history[history.length - 1] = last;
          return { chatHistory: history };
        }),

      clearChat: () => set({ chatHistory: [], activeConversationId: null }),

      // ── Chat persistence ────────────────────────────────────────────
      activeConversationId: null,
      setActiveConversationId: (id) => set({ activeConversationId: id }),

      // ── Predictions ───────────────────────────────────────────────────────
      predictions: {},
      setPrediction: (symbol, prediction) =>
        set((state) => ({
          predictions: { ...state.predictions, [symbol.toUpperCase()]: prediction },
        })),

      // ── Quotes ────────────────────────────────────────────────────────────
      quotes: {},
      setQuote: (symbol, quote) =>
        set((state) => ({
          quotes: { ...state.quotes, [symbol.toUpperCase()]: quote },
        })),

      // ── Theme ──────────────────────────────────────────────────────────────
      theme: "dark",
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),

      // ── Notification settings ──────────────────────────────────────────────
      notificationSettings: null,
      setNotificationSettings: (s) => set({ notificationSettings: s }),

      // ── UI state ──────────────────────────────────────────────────────────
      isChatStreaming: false,
      setIsChatStreaming: (v) => set({ isChatStreaming: v }),
    }),
    {
      name: "stockmind-ui",
      // Only persist non-sensitive UI prefs — NOT api keys (those stay in sessionStorage)
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : (undefined as never)
      ),
      partialize: (state) => ({
        selectedSymbol: state.selectedSymbol,
        activeProvider: state.activeProvider,
        theme: state.theme,
      }),
    }
  )
);

// ── Selectors ─────────────────────────────────────────────────────────────────

export const useSelectedSymbol  = () => useStore((s) => s.selectedSymbol);
export const useActiveProvider  = () => useStore((s) => s.activeProvider);
export const useApiKeys         = () => useStore((s) => s.apiKeys);
export const useChatHistory     = () => useStore((s) => s.chatHistory);
export const usePredictions     = () => useStore((s) => s.predictions);
export const useIsChatStreaming  = () => useStore((s) => s.isChatStreaming);

export const useActiveApiKey = () =>
  useStore((s) => s.activeProvider === "free" ? "free" : s.apiKeys[s.activeProvider]);
