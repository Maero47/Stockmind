import time
import yfinance as yf
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/news", tags=["news"])

# ── Simple in-memory cache (5 min) ────────────────────────────────────────────
_CACHE: dict[str, tuple[float, list]] = {}
_TTL = 300


def _cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and time.time() < entry[0]:
        return entry[1]
    return None


def _cache_set(key: str, value):
    _CACHE[key] = (time.time() + _TTL, value)


# ── Lightweight keyword sentiment ─────────────────────────────────────────────

_POSITIVE = {
    "beat", "beats", "surge", "surges", "surging", "rise", "rises", "rising",
    "gain", "gains", "strong", "strength", "growth", "grew", "record", "high",
    "upgrade", "upgrades", "outperform", "buy", "bullish", "profit", "profits",
    "revenue", "boost", "boosted", "rally", "rallies", "rallying", "soar",
    "soars", "exceeds", "exceeded", "positive", "optimistic", "opportunity",
    "breakthrough", "expand", "expansion", "milestone", "partnership",
}

_NEGATIVE = {
    "miss", "misses", "fall", "falls", "falling", "drop", "drops", "dropping",
    "loss", "losses", "weak", "weakness", "decline", "declines", "declining",
    "cut", "cuts", "downgrade", "downgrades", "underperform", "sell", "bearish",
    "concern", "concerns", "risk", "risks", "warning", "warns", "struggle",
    "struggles", "disappoints", "disappointing", "below", "layoff", "layoffs",
    "investigation", "lawsuit", "recall", "down", "slump", "slumps", "plunge",
    "plunges", "tumble", "tumbles", "crash",
}


def _sentiment(text: str) -> tuple[str, float]:
    """Returns (label, score 0-1) using keyword matching."""
    words = set(text.lower().split())
    pos = len(words & _POSITIVE)
    neg = len(words & _NEGATIVE)
    total = pos + neg

    if total == 0:
        return "Neutral", 0.5

    ratio = pos / total
    if ratio >= 0.6:
        score = 0.6 + (ratio - 0.6) * 1.0
        return "Positive", round(min(score, 0.99), 2)
    elif ratio <= 0.4:
        score = 0.4 - (0.4 - ratio) * 1.0
        return "Negative", round(max(score, 0.01), 2)
    else:
        return "Neutral", round(0.45 + ratio * 0.1, 2)


# ── Response model ────────────────────────────────────────────────────────────

class NewsItem(BaseModel):
    headline: str
    source: str
    url: str
    published_at: str
    sentiment: str
    sentiment_score: float
    summary: str | None = None


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{symbol}", response_model=list[NewsItem])
async def get_news(symbol: str):
    """
    Fetches recent news for a stock symbol via yfinance.
    Sentiment is scored with lightweight keyword analysis.
    Results cached 5 minutes.
    """
    symbol = symbol.upper()
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        raw    = ticker.news or []
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {exc}")

    results = []
    for item in raw[:10]:
        # yfinance news dict shape varies slightly between versions
        content = item.get("content", {})

        headline = (
            content.get("title")
            or item.get("title")
            or ""
        )
        if not headline:
            continue

        source = (
            content.get("provider", {}).get("displayName")
            or item.get("publisher")
            or "Yahoo Finance"
        )

        url = (
            content.get("canonicalUrl", {}).get("url")
            or item.get("link")
            or "#"
        )

        pub_date = (
            content.get("pubDate")
            or item.get("providerPublishTime")
            or ""
        )
        # Convert Unix timestamp to ISO string if needed
        if isinstance(pub_date, (int, float)):
            from datetime import datetime, timezone
            pub_date = datetime.fromtimestamp(pub_date, tz=timezone.utc).isoformat()

        summary = content.get("summary") or item.get("summary") or None

        label, score = _sentiment(headline + " " + (summary or ""))

        results.append(NewsItem(
            headline=headline,
            source=source,
            url=url,
            published_at=pub_date,
            sentiment=label,
            sentiment_score=score,
            summary=summary,
        ))

    _cache_set(symbol, [r.model_dump() for r in results])
    return results
