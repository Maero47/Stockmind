"""
Analyst chain: assembles live market data into a rich system prompt,
then streams the LLM response token-by-token.

Returns an async generator of str chunks — consumed by the FastAPI route
and forwarded as a Server-Sent Events (SSE) StreamingResponse.
"""

import math
from typing import AsyncGenerator

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from services.data.stock_fetcher import get_quote, get_history
from services.ml.feature_engineering import compute_indicators, FEATURE_COLUMNS
from services.ml.xgboost_model import predict as ml_predict

import pandas as pd


# ── Indicator helpers ─────────────────────────────────────────────────────────

def _rsi_signal(rsi: float) -> str:
    if rsi >= 70:
        return "Overbought"
    if rsi <= 30:
        return "Oversold"
    return "Neutral"


def _macd_cross(macd: float, signal: float) -> str:
    if macd > signal:
        return "Bullish crossover"
    if macd < signal:
        return "Bearish crossover"
    return "Neutral"


def _fmt(val, decimals: int = 2, prefix: str = "") -> str:
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return "N/A"
    return f"{prefix}{val:,.{decimals}f}"


def _fmt_large(val) -> str:
    """Human-readable market cap / volume."""
    if val is None:
        return "N/A"
    val = float(val)
    if val >= 1e12:
        return f"${val/1e12:.2f}T"
    if val >= 1e9:
        return f"${val/1e9:.2f}B"
    if val >= 1e6:
        return f"${val/1e6:.2f}M"
    return f"${val:,.0f}"


# ── Data assembly ─────────────────────────────────────────────────────────────

def _build_context(symbol: str) -> dict:
    """Fetches quote + indicators + ML prediction and returns a flat context dict."""
    symbol = symbol.upper()

    # Quote
    quote = get_quote(symbol)

    # Historical OHLCV → indicators
    bars = get_history(symbol, period="3mo", interval="1d")
    df = pd.DataFrame(bars)
    df.rename(columns={"timestamp": "date"}, inplace=True)
    df = df[["open", "high", "low", "close", "volume"]].astype(float)
    df = compute_indicators(df)
    latest = df.iloc[-1]

    def _get(col):
        val = latest.get(col)
        if val is None or (isinstance(val, float) and math.isnan(val)):
            return None
        return float(val)

    # ML prediction (uses its own cache)
    try:
        pred = ml_predict(symbol)
        ml_signal     = pred["signal"]
        ml_confidence = pred["confidence"] * 100
        top_features  = ", ".join(f["feature"] for f in pred["feature_importances"][:3])
    except Exception:
        ml_signal     = "N/A"
        ml_confidence = 0.0
        top_features  = "N/A"

    return {
        "symbol":         symbol,
        "name":           quote.get("name", symbol),
        "price":          quote.get("price"),
        "change_pct":     quote.get("change_pct") or 0.0,
        "currency":       quote.get("currency", "USD"),
        "day_low":        quote.get("day_low"),
        "day_high":       quote.get("day_high"),
        "volume":         quote.get("volume"),
        "market_cap":     quote.get("market_cap"),
        "rsi":            _get("rsi"),
        "rsi_signal":     _rsi_signal(_get("rsi") or 50),
        "macd":           _get("macd"),
        "macd_signal":    _get("macd_signal"),
        "macd_cross":     _macd_cross(_get("macd") or 0, _get("macd_signal") or 0),
        "bb_pct":         (_get("bb_pct") or 0) * 100,   # convert 0-1 → 0-100
        "ema_cross":      "Bullish" if (_get("ema_9_21_cross") or 0) == 1 else "Bearish",
        "support":        _get("support_20d"),
        "resistance":     _get("resistance_20d"),
        "ml_signal":      ml_signal,
        "ml_confidence":  ml_confidence,
        "top_features":   top_features,
    }


# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_TEMPLATE = """\
You are StockMind AI, an expert quantitative analyst. You have live market data below.
Answer the user's specific question directly using this data. Do not repeat yourself.
Vary your phrasing and insights — every response should feel fresh and specific.

LIVE DATA FOR {symbol} ({name}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Currency:    {currency}
Price:       {price} {currency} ({change_pct:+.2f}%)
Day Range:   {day_low} – {day_high} {currency}
Volume:      {volume}  |  Mkt Cap: {market_cap}

TECHNICALS:
RSI(14):     {rsi:.1f} → {rsi_signal}
MACD:        {macd:.3f} / Signal {macd_signal:.3f} → {macd_cross}
Bollinger:   {bb_pct:.0f}% between bands (100 = upper, 0 = lower)
EMA 9/21:    {ema_cross}
Support:     {support:.2f} {currency}  |  Resistance: {resistance:.2f} {currency}

ML PREDICTION:
Signal:      {ml_signal} ({ml_confidence:.0f}% confidence)
Key Factors: {top_features}

INSTRUCTIONS:
- If asked for a full analysis, use this structure:
  1. **Market Overview** 2. **Technical Analysis** 3. **ML Signal**
  4. **Key Levels** 5. **Risk Factors** 6. **Recommendation**
- For specific questions (e.g. "what is the RSI?"), answer concisely and directly.
- Always use the exact numbers above. Never make up data.
- Always use the correct currency ({currency}) when mentioning prices. Never default to USD unless the stock is actually priced in USD.
- Keep responses varied — do not reuse the same sentences as before.
⚠️ Not financial advice. For informational purposes only.
"""


def _build_system_prompt(ctx: dict) -> str:
    return _SYSTEM_TEMPLATE.format(
        symbol=ctx["symbol"],
        name=ctx["name"],
        currency=ctx["currency"],
        price=_fmt(ctx["price"]),
        change_pct=ctx["change_pct"],
        day_low=_fmt(ctx["day_low"]),
        day_high=_fmt(ctx["day_high"]),
        volume=_fmt_large(ctx["volume"]),
        market_cap=_fmt_large(ctx["market_cap"]),
        rsi=ctx["rsi"] or 50.0,
        rsi_signal=ctx["rsi_signal"],
        macd=ctx["macd"] or 0.0,
        macd_signal=ctx["macd_signal"] or 0.0,
        macd_cross=ctx["macd_cross"],
        bb_pct=ctx["bb_pct"],
        ema_cross=ctx["ema_cross"],
        support=ctx["support"] or 0.0,
        resistance=ctx["resistance"] or 0.0,
        ml_signal=ctx["ml_signal"],
        ml_confidence=ctx["ml_confidence"],
        top_features=ctx["top_features"],
    )


# ── Streaming entry point ─────────────────────────────────────────────────────

async def stream_analysis(
    symbol: str,
    user_question: str,
    model: BaseChatModel,
    chat_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """
    Yields SSE-formatted chunks:  data: <token>\n\n
    Final chunk:                  data: [DONE]\n\n
    On error:                     data: [ERROR] <message>\n\n

    chat_history: list of {"role": "user"|"assistant", "content": "..."}
                  representing the prior conversation turns.
    """
    try:
        ctx = _build_context(symbol)
        system_prompt = _build_system_prompt(ctx)
    except Exception:
        yield f"data: [ERROR] Failed to fetch market data\n\n"
        return

    # Build message list: system + history + current question
    messages: list = [SystemMessage(content=system_prompt)]

    for turn in (chat_history or [])[-10:]:   # keep last 10 turns to stay within token limits
        role    = turn.get("role", "user")
        content = turn.get("content", "")
        if not content.strip():
            continue
        if role == "assistant":
            from langchain_core.messages import AIMessage
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    messages.append(HumanMessage(
        content=user_question or f"Give me a full analysis of {symbol}."
    ))

    try:
        async for chunk in model.astream(messages):
            token = chunk.content
            if token:
                yield f"data: {token}\n\n"
    except Exception:
        yield f"data: [ERROR] Analysis failed\n\n"
        return

    yield "data: [DONE]\n\n"
