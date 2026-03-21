import type {
  StockQuote,
  StockHistory,
  TrendingResponse,
  Prediction,
  NewsItem,
  TimePeriod,
  TimeInterval,
  AIProvider,
} from "./types";

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Auth token helper ─────────────────────────────────────────────────────────

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  // Read from the Zustand store — already populated by AuthListener
  const { useStore } = require("./store") as typeof import("./store");
  return useStore.getState().session?.access_token ?? null;
}

// ── Base fetch helper ─────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body?.detail ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── Stocks ────────────────────────────────────────────────────────────────────

export type TrendingCategory = "stocks" | "crypto" | "etf" | "gainers" | "losers";

export async function getTrending(category: TrendingCategory = "stocks"): Promise<{ category: string; symbols: string[] }> {
  return apiFetch(`/api/stocks/trending?category=${category}`);
}

export async function getCryptoMovers(): Promise<{ gainers: StockQuote[]; losers: StockQuote[] }> {
  return apiFetch("/api/crypto/movers");
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  return apiFetch<StockQuote>(`/api/stocks/${encodeURIComponent(symbol)}`);
}

export async function getRealtimeQuote(symbol: string): Promise<StockQuote> {
  return apiFetch<StockQuote>(`/api/stocks/${encodeURIComponent(symbol)}/realtime`);
}

export async function getHistory(
  symbol: string,
  period: TimePeriod = "1mo",
  interval: TimeInterval = "1d",
  start?: string,
  end?: string,
): Promise<StockHistory> {
  const params = new URLSearchParams({ period, interval });
  if (start) params.set("start", start);
  if (end)   params.set("end",   end);
  return apiFetch<StockHistory>(
    `/api/stocks/${encodeURIComponent(symbol)}/history?${params}`
  );
}

// ── Indicators ────────────────────────────────────────────────────────────────

export async function getIndicators(symbol: string): Promise<Record<string, number | null | string>> {
  return apiFetch(`/api/stocks/${encodeURIComponent(symbol)}/indicators`);
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function getPrediction(symbol: string): Promise<Prediction> {
  return apiFetch<Prediction>(`/api/predict/${encodeURIComponent(symbol)}`, {
    method: "POST",
  });
}

// ── News ──────────────────────────────────────────────────────────────────────

export async function getNews(symbol: string): Promise<NewsItem[]> {
  return apiFetch<NewsItem[]>(`/api/news/${encodeURIComponent(symbol)}`);
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(
    `/api/stocks/search?q=${encodeURIComponent(query)}`
  );
}

// ── Key management ────────────────────────────────────────────────────────────

export interface SavedProvider {
  provider: string;
  created_at: string;
  last_used: string | null;
}

export async function listSavedKeys(): Promise<SavedProvider[]> {
  return apiFetch<SavedProvider[]>("/api/keys");
}

export async function saveKey(provider: string, apiKey: string): Promise<void> {
  await apiFetch("/api/keys", {
    method: "POST",
    body: JSON.stringify({ provider, api_key: apiKey }),
  });
}

export async function deleteKey(provider: string): Promise<void> {
  await apiFetch(`/api/keys/${encodeURIComponent(provider)}`, {
    method: "DELETE",
  });
}

// ── AI Streaming ──────────────────────────────────────────────────────────────

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamAnalysisOptions {
  symbol: string;
  question: string;
  provider: AIProvider;
  apiKey: string;
  history?: ChatHistoryMessage[];
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Opens an SSE stream from POST /api/ai/analyze.
 * Calls onToken for each streamed chunk, onDone when finished,
 * onError if the stream contains an error or the fetch fails.
 * Returns an AbortController so the caller can cancel mid-stream.
 */
export function streamAnalysis({
  symbol,
  question,
  provider,
  apiKey,
  history = [],
  onToken,
  onDone,
  onError,
}: StreamAnalysisOptions): AbortController {
  const controller = new AbortController();

  (async () => {
    const token = getAccessToken();
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/api/ai/analyze`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type":  "application/json",
          "X-AI-Provider": provider,
          "X-AI-Key":      apiKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ symbol, question, history }),
      });
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        onError((err as Error).message ?? "Network error");
      }
      return;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ detail: res.statusText }));
      onError(body?.detail ?? `API error ${res.status}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError("No response body");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      let done: boolean, value: Uint8Array | undefined;
      try {
        ({ done, value } = await reader.read());
      } catch (err: unknown) {
        // Intentional abort (e.g. testProviderKey cancels after first token)
        if ((err as Error).name === "AbortError") return;
        throw err;
      }
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process all complete SSE lines in the buffer
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6); // strip "data: "

        if (payload === "[DONE]") {
          onDone();
          return;
        }

        if (payload.startsWith("[ERROR]")) {
          onError(payload.slice(8)); // strip "[ERROR] "
          return;
        }

        onToken(payload);
      }
    }

    onDone();
  })();

  return controller;
}

// ── Provider connection test ──────────────────────────────────────────────────

/**
 * Tests an AI provider key by sending a minimal 1-token request.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 */
function _friendlyKeyError(raw: string, provider: AIProvider): string {
  const s = raw.toLowerCase();
  if (s.includes("401") || s.includes("authentication") || s.includes("invalid") || s.includes("incorrect") || s.includes("unauthorized") || s.includes("api key")) {
    const names: Record<AIProvider, string> = { groq: "Groq", openai: "OpenAI", anthropic: "Anthropic", gemini: "Gemini" };
    return `Invalid ${names[provider]} API key — double-check it and try again.`;
  }
  if (s.includes("403") || s.includes("forbidden") || s.includes("permission") || s.includes("quota")) {
    return "This key doesn't have permission or has exceeded its quota.";
  }
  if (s.includes("429") || s.includes("rate limit")) {
    return "Rate limit hit — wait a moment and try again.";
  }
  if (s.includes("timeout") || s.includes("timed out")) {
    return "Request timed out — check your connection and try again.";
  }
  if (s.includes("network") || s.includes("fetch") || s.includes("failed to fetch")) {
    return "Network error — make sure the backend is running.";
  }
  return "Connection failed — check your key and try again.";
}

export async function testProviderKey(
  provider: AIProvider,
  apiKey: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    let resolved  = false;
    let errorMsg  = "";

    // Stream a 1-word response; if first chunk arrives the key is valid
    const ctrl = streamAnalysis({
      symbol:   "AAPL",
      question: "Reply with only the word OK.",
      provider,
      apiKey,
      onToken:  () => { resolved = true; ctrl.abort(); },
      onDone:   () => {},
      onError:  (msg) => { errorMsg = msg; },
    });

    // Give it 10 seconds to return at least one token
    await new Promise<void>((resolve) => {
      const tid = setTimeout(() => { ctrl.abort(); resolve(); }, 10_000);
      const poll = setInterval(() => {
        if (resolved || errorMsg) { clearTimeout(tid); clearInterval(poll); resolve(); }
      }, 100);
    });

    if (resolved) return { ok: true };
    if (errorMsg) return { ok: false, error: _friendlyKeyError(errorMsg, provider) };
    return { ok: false, error: "Timed out — check your key and try again." };
  } catch (err: unknown) {
    const raw = (err as Error).message ?? "";
    return { ok: false, error: _friendlyKeyError(raw, provider) };
  }
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export async function getWatchlist() {
  return apiFetch<{ symbol: string; added_at: string }[]>("/api/watchlist");
}

export async function addToWatchlist(symbol: string) {
  return apiFetch<{ symbol: string }>("/api/watchlist", {
    method: "POST",
    body: JSON.stringify({ symbol }),
  });
}

export async function removeFromWatchlist(symbol: string) {
  return apiFetch<void>(`/api/watchlist/${encodeURIComponent(symbol)}`, { method: "DELETE" });
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts() {
  return apiFetch<import("./types").PriceAlert[]>("/api/alerts");
}

export async function createAlert(symbol: string, target_price: number, direction: string) {
  return apiFetch<import("./types").PriceAlert>("/api/alerts", {
    method: "POST",
    body: JSON.stringify({ symbol, target_price, direction }),
  });
}

export async function deleteAlert(alertId: number) {
  return apiFetch<void>(`/api/alerts/${alertId}`, { method: "DELETE" });
}

export async function triggerAlert(alertId: number, price?: number) {
  return apiFetch<{ triggered: boolean }>(`/api/alerts/${alertId}/trigger`, {
    method: "POST",
    body: JSON.stringify({ price: price ?? null }),
  });
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export async function getPortfolio() {
  return apiFetch<import("./types").PortfolioPosition[]>("/api/portfolio");
}

export async function createPosition(data: {
  symbol: string; quantity: number; avg_buy_price: number; bought_at: string; notes?: string;
}) {
  return apiFetch<import("./types").PortfolioPosition>("/api/portfolio", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePosition(id: number, data: {
  quantity?: number; avg_buy_price?: number; notes?: string;
}) {
  return apiFetch<import("./types").PortfolioPosition>(`/api/portfolio/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePosition(id: number) {
  return apiFetch<void>(`/api/portfolio/${id}`, { method: "DELETE" });
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; service: string }> {
  return apiFetch("/api/health");
}
