import os
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, constr

from api.dependencies.auth import get_optional_user
from api.routes.keys import get_decrypted_key
from services.ai.llm_router import get_chat_model
from services.ai.analyst_chain import stream_analysis

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ── Groq fallback config ──────────────────────────────────────────────────────

_FALLBACK_ENABLED = os.getenv("GROQ_FALLBACK_ENABLED", "false").lower() == "true"
_FALLBACK_LIMIT   = int(os.getenv("GROQ_FALLBACK_DAILY_LIMIT", "10"))
_fallback_counts: dict[str, list[float]] = defaultdict(list)


class HistoryMessage(BaseModel):
    role:    str   # "user" | "assistant"
    content: str

class AnalyzeRequest(BaseModel):
    symbol:   constr(pattern=r"^[A-Za-z0-9.\-=]{1,15}$")  # type: ignore[valid-type]
    question: constr(max_length=2000) = ""             # type: ignore[valid-type]
    history:  list[HistoryMessage] = []


@router.post("/analyze")
async def analyze(
    request: Request,
    body:    AnalyzeRequest,
    x_ai_provider: str = Header(default="groq",  description="AI provider: openai | anthropic | groq | gemini"),
    x_ai_key:      str = Header(default="",       description="API key for the chosen provider"),
    user:    dict | None = Depends(get_optional_user),
):
    """
    Streams an AI analysis of the given stock symbol via SSE.

    Authentication (optional):
      - Include  Authorization: Bearer <supabase_access_token>  for per-user tracking.
      - Without a token, requests are tracked by IP against a stricter limit.

    AI key resolution (in order):
      1. X-AI-Key header (user's own key — unlimited)
      2. Server GROQ_API_KEY fallback (if GROQ_FALLBACK_ENABLED=true, rate-limited)
      3. 400 error if neither is available

    Returns a text/event-stream (SSE) response.
    Each chunk: `data: <token>\\n\\n`
    Final:       `data: [DONE]\\n\\n`
    On error:    `data: [ERROR] <message>\\n\\n`
    """
    provider = x_ai_provider.strip() or "groq"
    api_key  = x_ai_key.strip()

    # ── Resolve API key ───────────────────────────────────────────────────────
    if not api_key and user:
        # Try to fetch the user's saved (encrypted) key from Supabase
        saved = await get_decrypted_key(user["user_id"], provider)
        if saved:
            api_key = saved

    if not api_key:
        if not _FALLBACK_ENABLED:
            raise HTTPException(
                status_code=400,
                detail="No API key provided. Add your key in Settings.",
            )

        # Rate-limit the fallback by user_id (authenticated) or IP (anonymous)
        rate_key = user["user_id"] if user else (request.client.host if request.client else "unknown")
        now      = time.time()
        window   = 86_400  # 24 h
        hits     = _fallback_counts[rate_key]
        _fallback_counts[rate_key] = [t for t in hits if now - t < window]

        if len(_fallback_counts[rate_key]) >= _FALLBACK_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Free AI limit reached ({_FALLBACK_LIMIT} requests/day). "
                    "Add your own API key in Settings for unlimited use."
                ),
            )

        _fallback_counts[rate_key].append(now)
        api_key  = os.environ.get("GROQ_API_KEY", "")
        provider = "groq"

        if not api_key:
            raise HTTPException(status_code=500, detail="Fallback key not configured on this server.")

    # ── Build LangChain model ─────────────────────────────────────────────────
    try:
        model = get_chat_model(provider=provider, api_key=api_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Failed to process request")

    # ── Stream response ───────────────────────────────────────────────────────
    return StreamingResponse(
        stream_analysis(
            symbol=body.symbol.upper(),
            user_question=body.question,
            model=model,
            chat_history=[m.model_dump() for m in body.history],
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control":               "no-cache",
            "X-Accel-Buffering":           "no",
            "Access-Control-Allow-Origin": "*",
        },
    )
