// ── Stock Data ────────────────────────────────────────────────────────────────

export interface StockQuote {
  symbol: string;
  name: string;
  price: number | null;
  prev_close: number | null;
  change: number | null;
  change_pct: number | null;
  open: number | null;
  day_high: number | null;
  day_low: number | null;
  volume: number | null;
  market_cap: number | null;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  currency: string;
  exchange: string;
  sector: string;
  industry: string;
}

export interface OHLCVBar {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockHistory {
  symbol: string;
  period: string;
  interval: string;
  bars: OHLCVBar[];
}

export type TimePeriod = "1d" | "5d" | "1mo" | "3mo" | "6mo" | "1y" | "2y";
export type TimeInterval = "1m" | "5m" | "15m" | "30m" | "60m" | "1d" | "1wk" | "1mo";

// ── Technical Indicators ──────────────────────────────────────────────────────

export interface TechnicalIndicators {
  rsi: number | null;
  rsi_signal: "Overbought" | "Oversold" | "Neutral";
  macd: number | null;
  macd_signal_line: number | null;
  macd_diff: number | null;
  macd_cross: string;
  bb_upper: number | null;
  bb_lower: number | null;
  bb_middle: number | null;
  bb_pct: number | null;
  ema_9: number | null;
  ema_21: number | null;
  ema_50: number | null;
  support: number | null;
  resistance: number | null;
  atr: number | null;
}

// ── ML Predictions ────────────────────────────────────────────────────────────

export type SignalType = "UP" | "HOLD" | "DOWN";

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface Prediction {
  symbol: string;
  signal: SignalType;
  confidence: number;
  probabilities: {
    UP: number;
    DOWN: number;
  };
  feature_importances: FeatureImportance[];
  training_accuracy: number;
  samples_trained: number;
}

// ── AI / Chat ─────────────────────────────────────────────────────────────────

export type AIProvider = "groq" | "openai" | "anthropic" | "gemini";
export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  symbol?: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export interface ApiKeys {
  groq: string;
  openai: string;
  anthropic: string;
  gemini: string;
}

export type ApiKeyProvider = keyof ApiKeys;

// ── News ──────────────────────────────────────────────────────────────────────

export type SentimentLabel = "Positive" | "Negative" | "Neutral";

export interface NewsItem {
  headline: string;
  source: string;
  url: string;
  published_at: string;
  sentiment: SentimentLabel;
  sentiment_score: number;
  summary?: string;
}

// ── API responses (generic wrapper) ──────────────────────────────────────────

export interface ApiError {
  detail: string;
}

export interface TrendingResponse {
  symbols: string[];
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  symbol: string;
  added_at: string;
}

// ── Price Alerts ──────────────────────────────────────────────────────────────

export type AlertDirection = "above" | "below";

export interface PriceAlert {
  id: number;
  symbol: string;
  target_price: number;
  direction: AlertDirection;
  triggered: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface PortfolioPosition {
  id: number;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  bought_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── User Profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_color: string;
  avatar_url: string | null;
  created_at: string;
}

// ── Chat Room ─────────────────────────────────────────────────────────────────

export interface ChatRoomMessage {
  id: number;
  user_id: string;
  symbol: string;
  content: string;
  created_at: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  account_age_days: number;
}

// ── Prediction Posts ─────────────────────────────────────────────────────────

export type PredictionDirection = "bullish" | "bearish";

export interface PredictionPost {
  id: number;
  user_id: string;
  symbol: string;
  direction: PredictionDirection;
  target_price: number | null;
  note: string | null;
  created_at: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  likes_count: number;
  liked_by_me: boolean;
}

// ── Follows ──────────────────────────────────────────────────────────────────

export interface FollowCounts {
  followers: number;
  following: number;
}

// ── Chat Persistence ─────────────────────────────────────────────────────────

export interface Conversation {
  id: number;
  symbol: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: number;
  conversation_id: number;
  role: string;
  content: string;
  created_at: string;
}

// ── Notification Settings ────────────────────────────────────────────────────

export interface NotificationSettings {
  quiet_hours_enabled: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  group_notifications: boolean;
  sound: string;
}

// ── Provider metadata (used in UI) ───────────────────────────────────────────

export interface ProviderInfo {
  id: AIProvider;
  name: string;
  model: string;
  description: string;
  freeUrl: string;
  color: string;
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "groq",
    name: "Groq",
    model: "Llama 3.3 70B",
    description: "Blazing fast inference. Free tier available.",
    freeUrl: "https://console.groq.com",
    color: "#F55036",
  },
  {
    id: "openai",
    name: "OpenAI",
    model: "GPT-4o Mini",
    description: "Industry-leading reasoning and instruction-following.",
    freeUrl: "https://platform.openai.com",
    color: "#10A37F",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    model: "Claude Haiku 4.5",
    description: "Precise, nuanced analysis with long context support.",
    freeUrl: "https://console.anthropic.com",
    color: "#CC9B7A",
  },
  {
    id: "gemini",
    name: "Gemini",
    model: "Gemini 2.5 Flash",
    description: "Google's multimodal model with generous free tier.",
    freeUrl: "https://aistudio.google.com",
    color: "#4285F4",
  },
];
