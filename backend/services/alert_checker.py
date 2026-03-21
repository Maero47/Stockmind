import asyncio
import logging
from datetime import datetime, timezone
from db.database import AsyncSessionLocal
from db import crud
from db.models import PriceAlert
from services.data import stock_fetcher

log = logging.getLogger("alert_checker")

CHECK_INTERVAL = 60

_history_checked: set[int] = set()


def _fetch_price(symbol: str) -> float | None:
    try:
        data = stock_fetcher.get_quote(symbol)
        return data.get("price")
    except Exception:
        return None


def _check_history(alert: PriceAlert) -> float | None:
    """Check if the price crossed the target at any point since alert creation."""
    try:
        start = alert.created_at.strftime("%Y-%m-%d")
        end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if start == end:
            return None
        bars = stock_fetcher.get_history(alert.symbol, interval="1d", start=start, end=end)
        if not bars:
            return None
        for bar in bars:
            if alert.direction == "above" and bar["high"] >= alert.target_price:
                return bar["high"]
            if alert.direction == "below" and bar["low"] <= alert.target_price:
                return bar["low"]
    except Exception:
        log.debug("history check failed for alert %d (%s)", alert.id, alert.symbol)
    return None


async def _run_check():
    async with AsyncSessionLocal() as db:
        pending = await crud.get_all_pending_alerts(db)
        if not pending:
            return

        symbols = list({a.symbol for a in pending})
        loop = asyncio.get_running_loop()
        prices: dict[str, float] = {}

        results = await asyncio.gather(
            *[loop.run_in_executor(None, _fetch_price, s) for s in symbols],
            return_exceptions=True,
        )
        for sym, result in zip(symbols, results):
            if isinstance(result, (int, float)) and result is not None:
                prices[sym] = result

        for alert in pending:
            price = prices.get(alert.symbol)
            hit_price = None

            if price is not None:
                hit = (
                    (alert.direction == "above" and price >= alert.target_price)
                    or (alert.direction == "below" and price <= alert.target_price)
                )
                if hit:
                    hit_price = price

            if hit_price is None and alert.id not in _history_checked:
                _history_checked.add(alert.id)
                hist_price = await loop.run_in_executor(None, _check_history, alert)
                if hist_price is not None:
                    hit_price = hist_price

            if hit_price is None:
                continue

            await crud.mark_alert_triggered_system(db, alert.id, hit_price)
            _history_checked.discard(alert.id)
            log.info("alert %d triggered: %s %s $%.2f (hit $%.2f)",
                     alert.id, alert.symbol, alert.direction, alert.target_price, hit_price)


async def run_alert_checker():
    log.info("background alert checker started (interval=%ds)", CHECK_INTERVAL)
    while True:
        try:
            await _run_check()
        except Exception:
            log.exception("alert checker cycle failed")
        await asyncio.sleep(CHECK_INTERVAL)
