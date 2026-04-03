import json
import logging
import re
import time
import yfinance as yf
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

from api.dependencies.auth import get_optional_user
from api.routes.keys import get_decrypted_key
from services.ai.llm_router import get_chat_model

router = APIRouter(prefix="/api/news", tags=["news"])
log = logging.getLogger(__name__)

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


# ── Keyword fallback sentiment ───────────────────────────────────────────────

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


# ── LLM sentiment analysis ──────────────────────────────────────────────────

_SENTIMENT_PROMPT = """Analyze the sentiment of each financial news headline below.
For each headline, return exactly one of: Positive, Negative, or Neutral.
Also return a confidence score between 0.0 and 1.0.

Return ONLY a JSON array, no explanation. Example:
[{{"sentiment": "Positive", "score": 0.85}}, {{"sentiment": "Negative", "score": 0.72}}]

Headlines:
{headlines}"""


async def _llm_sentiment(headlines: list[str], provider: str, api_key: str) -> list[tuple[str, float]] | None:
    try:
        model = get_chat_model(provider=provider, api_key=api_key)
        numbered = "\n".join(f"{i+1}. {h}" for i, h in enumerate(headlines))
        prompt = _SENTIMENT_PROMPT.format(headlines=numbered)
        response = await model.ainvoke(prompt)
        content = response.content
        if isinstance(content, list):
            content = "".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in content
            )
        text = content.strip()

        # Extract JSON from response (handle markdown code blocks)
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        # Try to find JSON array if response has extra text
        start = text.find("[")
        end = text.rfind("]")
        if start != -1 and end != -1:
            text = text[start:end + 1]

        parsed = json.loads(text)
        if not isinstance(parsed, list) or len(parsed) != len(headlines):
            log.warning("LLM returned %d items, expected %d", len(parsed) if isinstance(parsed, list) else -1, len(headlines))
            return None

        results = []
        for item in parsed:
            if not isinstance(item, dict):
                return None
            label = item.get("sentiment") or item.get("label") or "Neutral"
            if label not in ("Positive", "Negative", "Neutral"):
                label = "Neutral"
            score = float(item.get("score") or item.get("confidence") or 0.5)
            score = max(0.0, min(1.0, score))
            results.append((label, round(score, 4)))
        return results
    except Exception as exc:
        log.warning("LLM sentiment failed, using keyword fallback: %s", exc)
        return None


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
async def get_news(
    symbol: str,
    x_ai_provider: str = Header(default="", description="AI provider for sentiment"),
    x_ai_key:      str = Header(default="", description="API key for sentiment"),
    user: dict | None = Depends(get_optional_user),
):
    if not re.match(r"^[A-Za-z0-9.\-=]{1,20}$", symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol")
    symbol = symbol.upper()
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    try:
        ticker = yf.Ticker(symbol)
        raw    = ticker.news or []
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to fetch news. Please try again.")

    # Phase 1: extract metadata
    items = []
    texts = []
    for item in raw[:10]:
        content = item.get("content", {})

        headline = content.get("title") or item.get("title") or ""
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

        pub_date = content.get("pubDate") or item.get("providerPublishTime") or ""
        if isinstance(pub_date, (int, float)):
            from datetime import datetime, timezone
            pub_date = datetime.fromtimestamp(pub_date, tz=timezone.utc).isoformat()

        summary = content.get("summary") or item.get("summary") or None

        items.append({"headline": headline, "source": source, "url": url,
                       "published_at": pub_date, "summary": summary})
        texts.append(headline + " " + (summary or ""))

    # Phase 2: resolve AI key for sentiment
    provider = x_ai_provider.strip() or ""
    api_key  = x_ai_key.strip()

    if not api_key and user and provider:
        saved = await get_decrypted_key(user["user_id"], provider)
        if saved:
            api_key = saved

    if not api_key and user:
        for p in ("groq", "openai", "gemini", "anthropic"):
            saved = await get_decrypted_key(user["user_id"], p)
            if saved:
                api_key = saved
                provider = p
                break

    if not api_key:
        from services.usage.free_tier import get_config
        cfg = get_config()
        if cfg["enabled"] and cfg["groq_api_key"]:
            api_key = cfg["groq_api_key"]
            provider = "groq"

    # Phase 3: sentiment analysis (LLM or keyword fallback)
    sentiments = None
    if api_key and provider and texts:
        sentiments = await _llm_sentiment(texts, provider, api_key)

    if sentiments is None:
        sentiments = [_sentiment(t) for t in texts]

    results = [
        NewsItem(**meta, sentiment=label, sentiment_score=score)
        for meta, (label, score) in zip(items, sentiments)
    ]

    _cache_set(symbol, [r.model_dump() for r in results])
    return results
