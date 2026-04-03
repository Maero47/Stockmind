from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, constr

from api.dependencies.auth import get_optional_user
from api.routes.keys import get_decrypted_key
from services.ai.llm_router import get_chat_model
from services.ai.analyst_chain import stream_analysis
from services.usage.free_tier import get_config, get_usage_count, record_usage

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/free-remaining")
async def free_remaining(
    user: dict | None = Depends(get_optional_user),
):
    cfg = get_config()
    limit = cfg["daily_limit"]

    if not cfg["enabled"] or not user:
        return {"limit": limit, "used": 0, "remaining": limit}

    used = await get_usage_count(user["user_id"])
    return {"limit": limit, "used": used, "remaining": max(0, limit - used)}


class HistoryMessage(BaseModel):
    role:    str
    content: str

class AnalyzeRequest(BaseModel):
    symbol:   constr(pattern=r"^[A-Za-z0-9.\-=]{1,15}$")  # type: ignore[valid-type]
    question: constr(max_length=2000) = ""             # type: ignore[valid-type]
    history:  list[HistoryMessage] = []


@router.post("/analyze")
async def analyze(
    request: Request,
    body:    AnalyzeRequest,
    x_ai_provider: str = Header(default="groq"),
    x_ai_key:      str = Header(default=""),
    user:    dict | None = Depends(get_optional_user),
):
    provider = x_ai_provider.strip() or "groq"
    api_key  = x_ai_key.strip()
    free_remaining_count: int | None = None
    is_free = provider == "free"

    if not is_free and not api_key and user:
        saved = await get_decrypted_key(user["user_id"], provider)
        if saved:
            api_key = saved

    if is_free or not api_key:
        cfg = get_config()

        if not cfg["enabled"] or not user:
            raise HTTPException(
                status_code=400,
                detail="Sign in to use free AI, or add your own API key in Settings.",
            )

        limit = cfg["daily_limit"]
        uid = user["user_id"]
        used = await get_usage_count(uid)

        if used >= limit:
            raise HTTPException(
                status_code=429,
                detail=f"Free AI limit reached ({limit} requests/day). Add your own API key in Settings for unlimited use.",
            )

        await record_usage(uid)
        free_remaining_count = limit - used - 1
        api_key  = cfg["groq_api_key"]
        provider = "groq"

        if not api_key:
            raise HTTPException(status_code=500, detail="Fallback key not configured on this server.")

    try:
        model = get_chat_model(provider=provider, api_key=api_key)
    except ValueError:
        raise HTTPException(status_code=400, detail="Failed to process request")

    resp_headers: dict[str, str] = {
        "Cache-Control":     "no-cache",
        "X-Accel-Buffering": "no",
    }
    if free_remaining_count is not None:
        resp_headers["X-Free-Remaining"] = str(free_remaining_count)

    return StreamingResponse(
        stream_analysis(
            symbol=body.symbol.upper(),
            user_question=body.question,
            model=model,
            chat_history=[m.model_dump() for m in body.history],
        ),
        media_type="text/event-stream",
        headers=resp_headers,
    )
