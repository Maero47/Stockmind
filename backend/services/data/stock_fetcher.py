"""
Data fetcher:
  - Finnhub: real-time quotes (stock page, 3s cache) + intraday candles (1d/5d chart)
  - yfinance: homepage quotes, history (1mo+), trending, search
"""

import os
import time
import finnhub
import yfinance as yf
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import Any

_FINNHUB_KEY = os.environ.get("FINNHUB_API_KEY", "")
_finnhub_client = finnhub.Client(api_key=_FINNHUB_KEY) if _FINNHUB_KEY else None

# ── In-memory cache ───────────────────────────────────────────────────────────
_MEM_CACHE: dict[str, tuple[float, Any]] = {}

def _cache_get(key: str, ttl: int) -> Any | None:
    entry = _MEM_CACHE.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None

def _cache_set(key: str, value: Any, ttl: int) -> None:
    _MEM_CACHE[key] = (time.time() + ttl, value)


def _safe(val):
    try:
        import math
        if val is None: return None
        if isinstance(val, float) and math.isnan(val): return None
        return float(val) if hasattr(val, "item") else val
    except Exception:
        return None


# ── Meta cache (name/sector/pe — 24h TTL, rarely changes) ────────────────────
_META_CACHE: dict[str, tuple[float, dict]] = {}

def _get_meta(symbol: str) -> dict:
    """Slow fields (name, sector, pe_ratio) — cached 24h so ticker.info only runs once per symbol per day."""
    entry = _META_CACHE.get(symbol)
    if entry and time.time() < entry[0]:
        return entry[1]
    try:
        info = yf.Ticker(symbol).info
        meta = {
            "name":     info.get("longName") or info.get("shortName") or symbol,
            "pe_ratio": _safe(info.get("trailingPE")),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange", ""),
            "sector":   info.get("sector", ""),
            "industry": info.get("industry", ""),
        }
        _META_CACHE[symbol] = (time.time() + 86400, meta)
        return meta
    except Exception:
        return {"name": symbol, "pe_ratio": None, "currency": "USD", "exchange": "", "sector": "", "industry": ""}

def _seed_meta(symbol: str, name: str, currency: str = "USD", exchange: str = "") -> None:
    """Pre-populate meta from screen data so ticker.info is never called for these symbols."""
    if symbol not in _META_CACHE or time.time() >= _META_CACHE[symbol][0]:
        _META_CACHE[symbol] = (time.time() + 86400, {
            "name": name, "pe_ratio": None,
            "currency": currency, "exchange": exchange,
            "sector": "", "industry": "",
        })

# ── Company profile cache (1h TTL — name/sector rarely changes) ───────────────
_PROFILE_CACHE: dict[str, tuple[float, dict]] = {}

def _get_profile(symbol: str) -> dict:
    entry = _PROFILE_CACHE.get(symbol)
    if entry and time.time() < entry[0]:
        return entry[1]
    if not _finnhub_client:
        return {}
    try:
        p = _finnhub_client.company_profile2(symbol=symbol)
        _PROFILE_CACHE[symbol] = (time.time() + 3600, p)
        return p
    except Exception:
        return {}


# ── Real-time quote (Finnhub, 3s cache) — stock detail page ──────────────────

def _get_yf_meta(symbol: str) -> dict:
    """Volume, PE, 52W high/low from yfinance — cached 5 min."""
    key = f"yf_meta:{symbol}"
    cached = _cache_get(key, 300)
    if cached:
        return cached
    try:
        fi = yf.Ticker(symbol).fast_info
        meta = _get_meta(symbol)  # uses 24h cache — avoids repeated ticker.info calls
        result = {
            "volume":   _safe(fi.three_month_average_volume),
            "52w_high": _safe(fi.year_high),
            "52w_low":  _safe(fi.year_low),
            "pe_ratio": meta["pe_ratio"],
        }
        _cache_set(key, result, 300)
        return result
    except Exception:
        return {"volume": None, "52w_high": None, "52w_low": None, "pe_ratio": None}


def get_realtime_quote(symbol: str) -> dict:
    """
    Finnhub quote (price/change/high/low) + yfinance metadata (volume/PE/52W).
    Price fields cached 30s; metadata cached 5 min separately.
    Falls back to pure yfinance if Finnhub unavailable.
    """
    symbol = symbol.upper()
    key = f"rt:{symbol}"
    cached = _cache_get(key, 30)
    if cached:
        return cached

    if _finnhub_client:
        try:
            q = _finnhub_client.quote(symbol)   # 1 Finnhub call per refresh
            p = _get_profile(symbol)            # cached 1h — 0 extra calls after first
            m = _get_yf_meta(symbol)            # cached 5 min — volume/PE/52W
            result = {
                "symbol":     symbol,
                "name":       p.get("name", symbol),
                "price":      _safe(q.get("c")),
                "prev_close": _safe(q.get("pc")),
                "change":     _safe(q.get("d")),
                "change_pct": _safe(q.get("dp")),
                "open":       _safe(q.get("o")),
                "day_high":   _safe(q.get("h")),
                "day_low":    _safe(q.get("l")),
                "volume":     m["volume"],
                "market_cap": (_safe(p.get("marketCapitalization")) or 0) * 1_000_000 or None,
                "pe_ratio":   m["pe_ratio"],
                "52w_high":   m["52w_high"],
                "52w_low":    m["52w_low"],
                "currency":   p.get("currency", "USD"),
                "exchange":   p.get("exchange", ""),
                "sector":     p.get("finnhubIndustry", ""),
                "industry":   p.get("finnhubIndustry", ""),
            }
            if result["price"]:
                _cache_set(key, result, 30)
                return result
        except Exception:
            pass

    # Finnhub unavailable or no data (e.g. crypto) — pure yfinance
    return get_quote_yfinance(symbol)


# ── Homepage quote (yfinance, 30s cache) ──────────────────────────────────────

def get_quote(symbol: str) -> dict:
    """yfinance quote for homepage cards (30s cache)."""
    return get_quote_yfinance(symbol)


def get_quote_yfinance(symbol: str) -> dict:
    symbol = symbol.upper()
    key = f"quote_yf:{symbol}"
    cached = _cache_get(key, 30)
    if cached:
        return cached

    info = yf.Ticker(symbol).fast_info  # fast — no full HTTP request
    try:
        regular_price = _safe(info.last_price)
        prev_close    = _safe(info.previous_close)
        change        = round(regular_price - prev_close, 4) if regular_price and prev_close else None
        change_pct    = round((change / prev_close) * 100, 4) if change and prev_close else None
        meta          = _get_meta(symbol)  # cached 24h — ticker.info only runs once per symbol per day
        result = {
            "symbol":     symbol,
            "name":       meta["name"],
            "price":      regular_price,
            "prev_close": prev_close,
            "change":     change,
            "change_pct": change_pct,
            "open":       _safe(info.open),
            "day_high":   _safe(info.day_high),
            "day_low":    _safe(info.day_low),
            "volume":     _safe(info.three_month_average_volume),
            "market_cap": _safe(info.market_cap),
            "pe_ratio":   meta["pe_ratio"],
            "52w_high":   _safe(info.year_high),
            "52w_low":    _safe(info.year_low),
            "currency":   meta["currency"],
            "exchange":   meta["exchange"],
            "sector":     meta["sector"],
            "industry":   meta["industry"],
        }
    except Exception as exc:
        raise ValueError(f"Could not fetch quote for {symbol}: {exc}") from exc

    _cache_set(key, result, 30)
    return result


# ── Finnhub intraday candles ──────────────────────────────────────────────────

def _get_finnhub_candles(symbol: str, resolution: str, from_ts: int, to_ts: int) -> list[dict]:
    """
    Fetch OHLCV candles from Finnhub.
    resolution: 1 | 5 | 15 | 30 | 60 | D | W | M
    """
    key = f"fhc:{symbol}:{resolution}:{from_ts // 60}"
    cached = _cache_get(key, 60)
    if cached:
        return cached

    data = _finnhub_client.stock_candles(symbol, resolution, from_ts, to_ts)
    if data.get("s") != "ok" or not data.get("t"):
        raise ValueError(f"No Finnhub candle data for {symbol}")

    records = [
        {
            "timestamp": datetime.fromtimestamp(ts, tz=timezone.utc).isoformat(),
            "open":   round(float(data["o"][i]), 4),
            "high":   round(float(data["h"][i]), 4),
            "low":    round(float(data["l"][i]), 4),
            "close":  round(float(data["c"][i]), 4),
            "volume": int(data["v"][i]),
        }
        for i, ts in enumerate(data["t"])
    ]
    _cache_set(key, records, 60)
    return records


# ── History ───────────────────────────────────────────────────────────────────

def get_history(
    symbol: str,
    period: str = "1mo",
    interval: str = "1d",
    start: str | None = None,
    end: str | None = None,
) -> list[dict]:
    """
    OHLCV history.
    Custom start/end → yfinance date-range query (bypasses Finnhub).
    1d / 5d periods  → Finnhub intraday candles (60s cache).
    All other periods → yfinance (900s cache).
    """
    symbol = symbol.upper()

    if start and end:
        key    = f"history:{symbol}:custom:{start}:{end}:{interval}"
        ttl    = 900
        cached = _cache_get(key, ttl)
        if isinstance(cached, list) and cached and isinstance(cached[0], dict):
            return cached
        df = yf.download(symbol, start=start, end=end, interval=interval, progress=False, auto_adjust=True)
        if df.empty:
            raise ValueError(f"No history data for {symbol}")
        if hasattr(df.columns, "levels"):
            df.columns = df.columns.get_level_values(0)
        records = []
        for ts, row in df.iterrows():
            if any(_safe(row[c]) is None for c in ("Open", "High", "Low", "Close")):
                continue
            records.append({
                "timestamp": ts.isoformat(),
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row["Volume"]) if _safe(row["Volume"]) is not None else 0,
            })
        _cache_set(key, records, ttl)
        return records

    key    = f"history:{symbol}:{period}:{interval}"
    ttl    = 60 if period in ("1d", "5d") else 900
    cached = _cache_get(key, ttl)
    if isinstance(cached, list) and cached and isinstance(cached[0], dict):
        return cached

    # Intraday via Finnhub
    _INTERVAL_TO_RES = {"1m": "1", "5m": "5", "15m": "15", "30m": "30", "60m": "60"}
    if _finnhub_client and period in ("1d", "5d"):
        try:
            now = int(time.time())
            resolution = _INTERVAL_TO_RES.get(interval, "5" if period == "1d" else "60")
            if period == "1d":
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                from_ts = int(today.timestamp())
            else:
                from_ts = now - 5 * 24 * 3600
            records = _get_finnhub_candles(symbol, resolution, from_ts, now)
            _cache_set(key, records, ttl)
            return records
        except Exception:
            pass  # fall through to yfinance

    # yfinance for longer periods (and intraday fallback)
    df = yf.download(symbol, period=period, interval=interval, progress=False, auto_adjust=True)
    if df.empty:
        raise ValueError(f"No history data for {symbol}")

    if hasattr(df.columns, "levels"):
        df.columns = df.columns.get_level_values(0)

    records = []
    for ts, row in df.iterrows():
        if any(_safe(row[c]) is None for c in ("Open", "High", "Low", "Close")):
            continue
        records.append({
            "timestamp": ts.isoformat(),
            "open":   round(float(row["Open"]),   4),
            "high":   round(float(row["High"]),   4),
            "low":    round(float(row["Low"]),    4),
            "close":  round(float(row["Close"]),  4),
            "volume": int(row["Volume"]) if _safe(row["Volume"]) is not None else 0,
        })

    _cache_set(key, records, ttl)
    return records


# ── Trending ──────────────────────────────────────────────────────────────────

_CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD"]

_CRYPTO_MOVERS_UNIVERSE = [
    "BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD",
    "ADA-USD", "AVAX-USD", "MATIC-USD", "DOT-USD", "LINK-USD", "LTC-USD",
    "ATOM-USD", "UNI-USD", "ICP-USD", "NEAR-USD", "APT-USD", "OP-USD",
    "ARB-USD", "FIL-USD", "STX-USD", "INJ-USD", "SUI-USD", "TIA-USD",
    "SEI-USD", "TON-USD", "HBAR-USD", "VET-USD", "ALGO-USD", "MANA-USD",
]

def get_crypto_movers(top_n: int = 5) -> dict:
    key = "crypto_movers"
    cached = _cache_get(key, 120)
    if cached:
        return cached

    def _fetch(symbol: str):
        try:
            q = get_quote(symbol)
            if q.get("change_pct") is not None and q.get("price"):
                return q
        except Exception:
            pass
        return None

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_fetch, s): s for s in _CRYPTO_MOVERS_UNIVERSE}
        results = [f.result() for f in as_completed(futures)]

    results = [r for r in results if r is not None]
    results.sort(key=lambda x: x["change_pct"])
    losers  = results[:top_n]
    gainers = list(reversed(results[-top_n:]))

    out = {"gainers": gainers, "losers": losers}
    _cache_set(key, out, 120)
    return out
_ETF_SYMBOLS    = ["SPY", "QQQ", "VTI", "IWM", "GLD", "TLT", "XLK", "ARKK"]

def get_trending(category: str = "stocks") -> list[str]:
    key = f"trending:{category}"
    cached = _cache_get(key, 300)
    if cached:
        return cached

    try:
        if category == "crypto":
            result = _CRYPTO_SYMBOLS
        elif category == "etf":
            result = _ETF_SYMBOLS
        else:
            screen_map = {"gainers": "day_gainers", "losers": "day_losers", "stocks": "most_actives"}
            r = yf.screen(screen_map.get(category, "most_actives"), count=8)
            quotes = r.get("quotes") or []
            result = [q.get("symbol") for q in quotes if q.get("symbol")][:8]
            # yf.screen already has name/currency — seed meta cache so quote calls skip ticker.info
            for q in quotes:
                sym = q.get("symbol")
                if sym:
                    _seed_meta(
                        sym,
                        name=q.get("longname") or q.get("shortname") or sym,
                        currency=q.get("currency", "USD"),
                        exchange=q.get("exchange", ""),
                    )
    except Exception:
        result = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "META", "AMZN", "AMD"]

    _cache_set(key, result, 300)
    return result
