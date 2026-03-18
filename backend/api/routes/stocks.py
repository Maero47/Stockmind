import yfinance as yf
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from db.database import get_db
from db import crud
from services.data import stock_fetcher

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


# ── Response Models ───────────────────────────────────────────────────────────

class QuoteResponse(BaseModel):
    symbol: str
    name: str
    price: float | None
    prev_close: float | None
    change: float | None
    change_pct: float | None
    open: float | None
    day_high: float | None
    day_low: float | None
    volume: float | None
    market_cap: float | None
    pe_ratio: float | None
    week_52_high: float | None
    week_52_low: float | None
    currency: str
    exchange: str
    sector: str
    industry: str


class OHLCVBar(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: int


class HistoryResponse(BaseModel):
    symbol: str
    period: str
    interval: str
    bars: list[OHLCVBar]


class TrendingResponse(BaseModel):
    symbols: list[str]


# ── Routes ────────────────────────────────────────────────────────────────────

class SearchResult(BaseModel):
    symbol: str
    name: str
    exchange: str
    type: str


@router.get("/search", response_model=list[SearchResult])
async def search_stocks(q: str = Query(..., min_length=1, max_length=20)):
    """
    Live symbol search via yfinance.Search.
    Returns up to 8 matching stocks/ETFs/crypto.
    """
    try:
        results = yf.Search(q, max_results=8, news_count=0)
        quotes  = results.quotes or []
    except Exception:
        quotes = []

    out = []
    for item in quotes:
        symbol = item.get("symbol", "")
        name   = item.get("longname") or item.get("shortname") or symbol
        if not symbol:
            continue
        out.append(SearchResult(
            symbol=symbol,
            name=name,
            exchange=item.get("exchange", ""),
            type=item.get("quoteType", "EQUITY"),
        ))
    return out


@router.get("/trending")
async def get_trending(category: str = Query("stocks", pattern="^(stocks|crypto|etf|gainers|losers)$")):
    """
    Returns trending symbols per category.
    category: stocks | crypto | etf | gainers | losers
    """
    symbols = stock_fetcher.get_trending(category)
    return {"category": category, "symbols": symbols}


_SYM = Path(..., min_length=1, max_length=20, pattern=r"^[A-Za-z0-9.\-\^=]+$")

@router.get("/{symbol}/realtime", response_model=QuoteResponse)
async def get_realtime(symbol: str = _SYM):
    """
    Finnhub real-time quote with 3s cache.
    Used by the stock detail page — 1 Finnhub call per refresh, profile cached 1h.
    """
    symbol = symbol.upper()
    try:
        data = stock_fetcher.get_realtime_quote(symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return QuoteResponse(
        symbol=data["symbol"], name=data["name"],
        price=data["price"], prev_close=data["prev_close"],
        change=data["change"], change_pct=data["change_pct"],
        open=data["open"], day_high=data["day_high"], day_low=data["day_low"],
        volume=data["volume"], market_cap=data["market_cap"],
        pe_ratio=data["pe_ratio"], week_52_high=data["52w_high"], week_52_low=data["52w_low"],
        currency=data["currency"], exchange=data["exchange"],
        sector=data["sector"], industry=data["industry"],
    )


@router.get("/{symbol}", response_model=QuoteResponse)
async def get_stock(symbol: str = _SYM, db: AsyncSession = Depends(get_db)):
    """yfinance quote for homepage cards (30s cache)."""
    symbol = symbol.upper()
    try:
        data = stock_fetcher.get_quote_yfinance(symbol)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    try:
        await crud.log_search(db, symbol)
    except Exception:
        pass  # don't let a DB write failure break the quote response

    return QuoteResponse(
        symbol=data["symbol"],
        name=data["name"],
        price=data["price"],
        prev_close=data["prev_close"],
        change=data["change"],
        change_pct=data["change_pct"],
        open=data["open"],
        day_high=data["day_high"],
        day_low=data["day_low"],
        volume=data["volume"],
        market_cap=data["market_cap"],
        pe_ratio=data["pe_ratio"],
        week_52_high=data["52w_high"],
        week_52_low=data["52w_low"],
        currency=data["currency"],
        exchange=data["exchange"],
        sector=data["sector"],
        industry=data["industry"],
    )


@router.get("/{symbol}/history", response_model=HistoryResponse)
async def get_stock_history(
    symbol: str = _SYM,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y)$"),
    interval: str = Query("1d", pattern="^(1m|5m|15m|30m|60m|1d|1wk|1mo)$"),
):
    """
    OHLCV history.
    period  : 1d | 5d | 1mo | 3mo | 6mo | 1y | 2y
    interval: 1m | 5m | 15m | 30m | 60m | 1d | 1wk | 1mo
    """
    symbol = symbol.upper()
    try:
        bars = stock_fetcher.get_history(symbol, period=period, interval=interval)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return HistoryResponse(
        symbol=symbol,
        period=period,
        interval=interval,
        bars=[OHLCVBar(**b) for b in bars],
    )


@router.get("/{symbol}/indicators")
async def get_indicators(symbol: str = _SYM):
    """RSI, MACD, Bollinger Bands, EMAs, Stochastic and more via feature_engineering.py."""
    import math as _math
    import pandas as pd
    from services.ml.feature_engineering import compute_indicators

    symbol = symbol.upper()
    try:
        bars = stock_fetcher.get_history(symbol, period="3mo", interval="1d")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    df = pd.DataFrame(bars)
    df = df[["open", "high", "low", "close", "volume"]].astype(float)
    df = compute_indicators(df)
    row = df.iloc[-1]

    def _s(col: str):
        v = row.get(col)
        if v is None:
            return None
        try:
            f = float(v)
            return None if (_math.isnan(f) or _math.isinf(f)) else round(f, 6)
        except Exception:
            return None

    return {
        "symbol":         symbol,
        "rsi":            _s("rsi"),
        "macd":           _s("macd"),
        "macd_signal":    _s("macd_signal"),
        "macd_diff":      _s("macd_diff"),
        "bb_upper":       _s("bb_upper"),
        "bb_lower":       _s("bb_lower"),
        "bb_middle":      _s("bb_middle"),
        "bb_pct":         _s("bb_pct"),
        "ema_9":          _s("ema_9"),
        "ema_21":         _s("ema_21"),
        "ema_50":         _s("ema_50"),
        "support_20d":    _s("support_20d"),
        "resistance_20d": _s("resistance_20d"),
        "atr":            _s("atr"),
        "stoch_k":        _s("stoch_k"),
        "stoch_d":        _s("stoch_d"),
        "vol_ratio":      _s("vol_ratio"),
        "ema_9_21_cross": _s("ema_9_21_cross"),
    }
