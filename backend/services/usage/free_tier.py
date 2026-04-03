import os
import time
from datetime import datetime, timezone, timedelta

import httpx

_SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
_SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers() -> dict:
    return {
        "apikey": _SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {_SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }


def get_config() -> dict:
    return {
        "enabled": os.getenv("GROQ_FALLBACK_ENABLED", "false").lower() == "true",
        "daily_limit": int(os.getenv("GROQ_FALLBACK_DAILY_LIMIT", "10")),
        "groq_api_key": os.getenv("GROQ_API_KEY", ""),
    }


# ── Usage tracking ───────────────────────────────────────────────────────────

async def get_usage_count(user_id: str) -> int:
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_SUPABASE_URL}/rest/v1/free_usage",
            headers={**_headers(), "Prefer": "count=exact"},
            params={
                "select": "id",
                "user_id": f"eq.{user_id}",
                "used_at": f"gte.{since}",
            },
        )
    if res.status_code != 200:
        return 0
    count = res.headers.get("content-range", "")
    if "/" in count:
        total = count.split("/")[-1]
        return int(total) if total != "*" else len(res.json())
    return len(res.json())


async def record_usage(user_id: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{_SUPABASE_URL}/rest/v1/free_usage",
            headers={**_headers(), "Prefer": "return=minimal"},
            json={"user_id": user_id},
        )
