import os
import httpx
from fastapi import Header, HTTPException

_SUPABASE_URL      = os.environ.get("SUPABASE_URL", "")
_SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")


async def _verify_token(token: str) -> dict:
    """Call Supabase /auth/v1/user to validate the token and return user info."""
    if not _SUPABASE_URL:
        raise HTTPException(status_code=500, detail="SUPABASE_URL is not configured.")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": _SUPABASE_ANON_KEY,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    try:
        data = res.json()
        return {
            "user_id": data["id"],
            "email":   data.get("email", ""),
            "role":    data.get("role", "authenticated"),
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token response")


async def get_current_user(authorization: str = Header(default="")) -> dict:
    """
    Validates the Supabase token via the Supabase Auth API.
    Returns { user_id, email, role } or raises HTTP 401.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    return await _verify_token(token)


async def get_optional_user(authorization: str = Header(default="")) -> dict | None:
    """Like get_current_user but returns None instead of raising for unauthenticated requests."""
    if not authorization.startswith("Bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None
