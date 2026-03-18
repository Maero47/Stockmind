from datetime import datetime, timedelta
from sqlalchemy import select, delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from db.models import Prediction, Search, Cache, WatchlistItem, PriceAlert


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


# ── Watchlist ─────────────────────────────────────────────────────────────────

async def get_watchlist(db: AsyncSession, user_id: str) -> list[WatchlistItem]:
    result = await db.execute(
        select(WatchlistItem).where(WatchlistItem.user_id == user_id).order_by(WatchlistItem.added_at.desc())
    )
    return list(result.scalars().all())


async def add_to_watchlist(db: AsyncSession, user_id: str, symbol: str) -> None:
    stmt = sqlite_insert(WatchlistItem).values(
        user_id=user_id, symbol=symbol.upper(), added_at=datetime.utcnow()
    ).on_conflict_do_nothing(index_elements=["user_id", "symbol"])
    await db.execute(stmt)
    await db.commit()


async def remove_from_watchlist(db: AsyncSession, user_id: str, symbol: str) -> None:
    await db.execute(
        delete(WatchlistItem)
        .where(WatchlistItem.user_id == user_id)
        .where(WatchlistItem.symbol == symbol.upper())
    )
    await db.commit()


# ── Price Alerts ──────────────────────────────────────────────────────────────

async def get_alerts(db: AsyncSession, user_id: str) -> list[PriceAlert]:
    result = await db.execute(
        select(PriceAlert)
        .where(PriceAlert.user_id == user_id)
        .order_by(PriceAlert.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().all())


async def create_alert(
    db: AsyncSession, user_id: str, symbol: str, target_price: float, direction: str
) -> PriceAlert:
    alert = PriceAlert(
        user_id=user_id, symbol=symbol.upper(),
        target_price=target_price, direction=direction,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


async def delete_alert(db: AsyncSession, alert_id: int, user_id: str) -> bool:
    result = await db.execute(
        delete(PriceAlert)
        .where(PriceAlert.id == alert_id)
        .where(PriceAlert.user_id == user_id)
    )
    await db.commit()
    return result.rowcount > 0


async def mark_alert_triggered(db: AsyncSession, alert_id: int, user_id: str) -> bool:
    result = await db.execute(
        update(PriceAlert)
        .where(PriceAlert.id == alert_id)
        .where(PriceAlert.user_id == user_id)
        .values(triggered=True, triggered_at=datetime.utcnow())
    )
    await db.commit()
    return result.rowcount > 0
