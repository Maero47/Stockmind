from datetime import datetime, timedelta
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Prediction, Search, Cache


# ── Cache ────────────────────────────────────────────────────────────────────

async def get_cache(db: AsyncSession, symbol: str, data_type: str) -> str | None:
    result = await db.execute(
        select(Cache)
        .where(Cache.symbol == symbol.upper())
        .where(Cache.data_type == data_type)
        .where(Cache.expires_at > datetime.utcnow())
    )
    row = result.scalar_one_or_none()
    return row.data_json if row else None


async def set_cache(db: AsyncSession, symbol: str, data_type: str, data_json: str, ttl_minutes: int = 5):
    # Remove stale entry first
    await db.execute(
        delete(Cache)
        .where(Cache.symbol == symbol.upper())
        .where(Cache.data_type == data_type)
    )
    db.add(Cache(
        symbol=symbol.upper(),
        data_type=data_type,
        data_json=data_json,
        expires_at=datetime.utcnow() + timedelta(minutes=ttl_minutes),
    ))
    await db.commit()


# ── Searches ─────────────────────────────────────────────────────────────────

async def log_search(db: AsyncSession, symbol: str, user_session: str | None = None):
    db.add(Search(symbol=symbol.upper(), user_session=user_session))
    await db.commit()


# ── Predictions ──────────────────────────────────────────────────────────────

async def save_prediction(
    db: AsyncSession,
    symbol: str,
    signal: str,
    confidence: float,
    model_version: str = "xgboost-v1",
) -> Prediction:
    pred = Prediction(
        symbol=symbol.upper(),
        signal=signal,
        confidence=confidence,
        model_version=model_version,
    )
    db.add(pred)
    await db.commit()
    await db.refresh(pred)
    return pred
