"""
/api/keys — per-user AI API key storage.

Keys are Fernet-encrypted before writing to Supabase.
The plaintext key is never stored anywhere — only the ciphertext lives in the DB.

Endpoints:
  GET    /api/keys          — list connected providers (no key values returned)
  POST   /api/keys          — save/update an encrypted key
  DELETE /api/keys/{provider} — remove a key
"""

import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, constr

from api.dependencies.auth import get_current_user
from services.security.encryption import encrypt, decrypt

router = APIRouter(prefix="/api/keys", tags=["keys"])

_SUPABASE_URL        = os.environ.get("SUPABASE_URL", "")
_SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
_VALID_PROVIDERS     = {"openai", "anthropic", "groq", "gemini"}

_TABLE = "user_api_keys"


def _headers() -> dict:
    return {
        "apikey":        _SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {_SUPABASE_SERVICE_KEY}",
        "Content-Type":  "application/json",
    }


# ── Request models ────────────────────────────────────────────────────────────

class SaveKeyRequest(BaseModel):
    provider: str
    api_key:  constr(min_length=8, max_length=400)  # type: ignore[valid-type]


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("")
async def list_keys(user: dict = Depends(get_current_user)):
    """
    Returns which providers have a saved key for this user.
    Key values are NEVER returned — only provider names + timestamps.
    """
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_SUPABASE_URL}/rest/v1/{_TABLE}",
            headers=_headers(),
            params={
                "select":  "provider,created_at,last_used",
                "user_id": f"eq.{user['user_id']}",
            },
        )
    if res.status_code != 200:
        return []
    return res.json()


@router.post("")
async def save_key(body: SaveKeyRequest, user: dict = Depends(get_current_user)):
    """Encrypt and upsert an API key for the authenticated user."""
    if body.provider not in _VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {body.provider}")

    ciphertext = encrypt(body.api_key.strip())

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{_SUPABASE_URL}/rest/v1/{_TABLE}",
            headers={
                **_headers(),
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            json={
                "user_id":  user["user_id"],
                "provider": body.provider,
                "key_enc":  ciphertext,
            },
        )

    if res.status_code not in (200, 201):
        raise HTTPException(status_code=500, detail="Failed to save key to database")

    return {"ok": True}


@router.delete("/{provider}")
async def delete_key(provider: str, user: dict = Depends(get_current_user)):
    """Remove a saved key for the given provider."""
    if provider not in _VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")

    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{_SUPABASE_URL}/rest/v1/{_TABLE}",
            headers=_headers(),
            params={
                "user_id":  f"eq.{user['user_id']}",
                "provider": f"eq.{provider}",
            },
        )

    return {"ok": True}


# ── Internal helper (used by AI route) ───────────────────────────────────────

async def get_decrypted_key(user_id: str, provider: str) -> str | None:
    """
    Fetch and decrypt a stored key for a user+provider.
    Returns None if no key is saved.
    Called internally by the AI streaming route.
    """
    if not _SUPABASE_URL or not _SUPABASE_SERVICE_KEY:
        return None

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{_SUPABASE_URL}/rest/v1/{_TABLE}",
            headers=_headers(),
            params={
                "select":   "key_enc",
                "user_id":  f"eq.{user_id}",
                "provider": f"eq.{provider}",
                "limit":    "1",
            },
        )

    if res.status_code != 200 or not res.json():
        return None

    try:
        return decrypt(res.json()[0]["key_enc"])
    except ValueError:
        return None
