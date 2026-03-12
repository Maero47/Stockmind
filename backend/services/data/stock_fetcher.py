"""
Data fetcher:
  - Finnhub: real-time quotes (stock page, 3s cache) + intraday candles (1d/5d chart)
  - yfinance: homepage quotes, history (1mo+), trending, search
"""

import os
import time
import finnhub
import yfinance as yf
from datetime import datetime, timezone
from typing import Any

_FINNHUB_KEY = os.environ.get("FINNHUB_API_KEY", "")
_finnhub_client = finnhub.Client(api_key=_FINNHUB_KEY) if _FINNHUB_KEY else None

# ── TTL cache ─────────────────────────────────────────────────────────────────
_CACHE: dict[str, tuple[float, Any]] = {}

def _cache_get(key: str, ttl: int) -> Any | None:
    entry = _CACHE.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None

def _cache_set(key: str, value: Any, ttl: int):
    _CACHE[key] = (time.time() + ttl, value)


def _safe(val):
    try:
        import math
        if val is None: return None
        if isinstance(val, float) and math.isnan(val): return None
        return float(val) if hasattr(val, "item") else val
    except Exception:
        return None


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
    """Volume, PE, 52W high/low from yfinance — cached 5 min (slow-changing fields)."""
    key = f"yf_meta:{symbol}"
    cached = _cache_get(key, 300)
    if cached:
        return cached
    try:
        info = yf.Ticker(symbol).fast_info
        result = {
            "volume":   _safe(info.three_month_average_volume),
            "52w_high": _safe(info.year_high),
            "52w_low":  _safe(info.year_low),
            "pe_ratio": _safe(yf.Ticker(symbol).info.get("trailingPE")),
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

    ticker = yf.Ticker(symbol)
    info   = ticker.fast_info
    try:
        regular_price = _safe(info.last_price)
        prev_close    = _safe(info.previous_close)
        change        = round(regular_price - prev_close, 4) if regular_price and prev_close else None
        change_pct    = round((change / prev_close) * 100, 4) if change and prev_close else None
        full_info     = ticker.info
        result = {
            "symbol":     symbol,
            "name":       full_info.get("longName") or full_info.get("shortName", symbol),
            "price":      regular_price,
            "prev_close": prev_close,
            "change":     change,
            "change_pct": change_pct,
            "open":       _safe(info.open),
            "day_high":   _safe(info.day_high),
            "day_low":    _safe(info.day_low),
            "volume":     _safe(info.three_month_average_volume),
            "market_cap": _safe(info.market_cap),
            "pe_ratio":   _safe(full_info.get("trailingPE")),
            "52w_high":   _safe(info.year_high),
            "52w_low":    _safe(info.year_low),
            "currency":   full_info.get("currency", "USD"),
            "exchange":   full_info.get("exchange", ""),
            "sector":     full_info.get("sector", ""),
            "industry":   full_info.get("industry", ""),
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

def get_history(symbol: str, period: str = "1mo", interval: str = "1d") -> list[dict]:
    """
    OHLCV history.
    1d / 5d periods → Finnhub intraday candles (real-time, 60s cache).
    All other periods → yfinance (5-min cache).
    Falls back to yfinance if Finnhub unavailable or returns no data.
    """
    symbol = symbol.upper()
    key    = f"history:{symbol}:{period}:{interval}"
    ttl    = 60 if period in ("1d", "5d") else 300
    cached = _cache_get(key, ttl)
    if cached:
        return cached

    # Intraday via Finnhub
    if _finnhub_client and period in ("1d", "5d"):
        try:
            now = int(time.time())
            if period == "1d":
                today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
                from_ts    = int(today.timestamp())
                resolution = "5"
            else:  # 5d
                from_ts    = now - 5 * 24 * 3600
                resolution = "60"
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
        records.append({
            "timestamp": ts.isoformat(),
            "open":   round(float(row["Open"]),   4),
            "high":   round(float(row["High"]),   4),
            "low":    round(float(row["Low"]),    4),
            "close":  round(float(row["Close"]),  4),
            "volume": int(row["Volume"]),
        })

    _cache_set(key, records, ttl)
    return records


# ── Trending ──────────────────────────────────────────────────────────────────

_CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD", "ADA-USD", "AVAX-USD"]
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
        elif category == "gainers":
            r = yf.screen("day_gainers", count=8)
            result = [q.get("symbol") for q in (r.get("quotes") or []) if q.get("symbol")][:8]
        elif category == "losers":
            r = yf.screen("day_losers", count=8)
            result = [q.get("symbol") for q in (r.get("quotes") or []) if q.get("symbol")][:8]
        else:  # stocks — most active
            r = yf.screen("most_actives", count=8)
            result = [q.get("symbol") for q in (r.get("quotes") or []) if q.get("symbol")][:8]
    except Exception:
        result = ["AAPL", "MSFT", "GOOGL", "NVDA", "TSLA", "META", "AMZN", "AMD"]

    _cache_set(key, result, 300)
    return result
