# StockMind

AI-powered stock and crypto analysis platform. Real-time prices, technical indicators, ML predictions, and AI chat — all with your own API keys.1

---

## Features

- **Real-time prices** — Binance WebSocket for crypto (sub-second), Finnhub WebSocket for stocks (live trade ticks)
- **Candlestick charts** — interactive OHLCV charts with drawing tools and period switching
- **Technical indicators** — RSI, MACD, Bollinger Bands, EMA (9/21/50), support & resistance, ATR
- **ML predictions** — XGBoost model trained on 2 years of daily data, predicts next-day direction with confidence score
- **AI chat** — stream analysis of any symbol using your own Groq, OpenAI, Anthropic, or Gemini key
- **News & sentiment** — latest headlines with sentiment scoring per symbol
- **Watchlist** — save up to 15 symbols, synced to your account via Supabase
- **Price alerts** — set above/below alerts with in-app toast and browser notifications
- **PWA** — installable on mobile and desktop, works as a standalone app

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, TailwindCSS |
| Backend | FastAPI, Python 3.12+ |
| Database | SQLite (backend cache/alerts/predictions) + Supabase (auth/watchlist) |
| ML | XGBoost via scikit-learn |
| Real-time | Binance WebSocket, Finnhub WebSocket |
| Data | yfinance (history/metadata), Finnhub REST (quotes) |
| Auth | Supabase Auth |
| Hosting | Vercel (frontend), any Python host (backend) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Finnhub](https://finnhub.io) API key (free tier: 60 calls/min)

### 1. Clone the repo

```bash
git clone https://github.com/Maero47/Stockmind.git
cd Stockmind/stockmind
```

### 2. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FINNHUB_API_KEY=your-finnhub-key
SECRET_KEY=any-random-string-32-chars
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FINNHUB_KEY=your-finnhub-key
```

Start the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## AI Providers

StockMind uses a bring-your-own-key model. No keys are required to browse — only to use the AI chat feature.

| Provider | Free tier | Get key |
|---|---|---|
| Groq | 14,400 req/day, no card | [console.groq.com](https://console.groq.com) |
| OpenAI | $5 credit for new accounts | [platform.openai.com](https://platform.openai.com) |
| Anthropic | $5 credit for new accounts | [console.anthropic.com](https://console.anthropic.com) |
| Gemini | 1,500 req/day via AI Studio | [aistudio.google.com](https://aistudio.google.com) |

Keys are Fernet-encrypted before being stored in your account. They are never logged.

---

## Project Structure

```
stockmind/
├── backend/
│   ├── api/
│   │   ├── routes/         # stocks, crypto, predictions, news, ai, alerts, watchlist, keys
│   │   ├── middleware/      # CORS, rate limiting
│   │   └── dependencies/   # auth helpers
│   ├── db/                 # SQLAlchemy models, CRUD, migrations
│   ├── services/
│   │   ├── ai/             # LangChain LLM router, analyst chain
│   │   ├── data/           # stock_fetcher (yfinance + Finnhub)
│   │   └── ml/             # XGBoost model
│   └── main.py
└── frontend/
    ├── app/                # Next.js App Router pages
    ├── components/         # UI components (charts, alerts, watchlist, etc.)
    ├── hooks/              # SWR data hooks, WebSocket hooks
    └── lib/                # API client, Supabase client, Zustand store, types
```

---

## Supabase Setup

Run the following in your Supabase SQL editor to create the watchlist table with RLS:

```sql
create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  symbol text not null,
  added_at timestamptz default now(),
  unique (user_id, symbol)
);

alter table public.watchlist enable row level security;

create policy "users can manage own watchlist"
  on public.watchlist for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Environment Variables Reference

### Backend

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `FINNHUB_API_KEY` | Finnhub API key for real-time stock quotes |
| `SECRET_KEY` | Used for Fernet encryption of saved API keys |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins (default: `http://localhost:3000`) |
| `GROQ_FALLBACK_ENABLED` | Set `true` to enable a server-side Groq fallback key |
| `GROQ_API_KEY` | Server-side Groq key used when fallback is enabled |

### Frontend

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_FINNHUB_KEY` | Finnhub key for WebSocket connection |

---

## License

MIT
