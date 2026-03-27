from contextlib import asynccontextmanager
import asyncio
import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from api.middleware.cors import add_cors
from api.middleware.rate_limit import rate_limit_middleware
from api.routes import stocks, crypto, news, ai, predictions, keys, watchlist, alerts, notify, portfolio, chat, notifications
from db.database import init_db
from services.alert_checker import run_alert_checker


def _warm_cache():
    import threading, time as _t
    def _run():
        _t.sleep(3)  # let the server finish booting
        try:
            from services.data import stock_fetcher
            for cat in ("stocks", "crypto", "gainers", "losers", "etf"):
                try:
                    stock_fetcher.get_trending(cat)
                except Exception:
                    pass
            try:
                stock_fetcher.get_crypto_movers()
            except Exception:
                pass
        except Exception:
            pass
    threading.Thread(target=_run, daemon=True).start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    _warm_cache()
    checker_task = asyncio.create_task(run_alert_checker())
    yield
    checker_task.cancel()


app = FastAPI(
    title="StockMind API",
    description="AI-powered stock analysis backend",
    version="0.1.0",
    lifespan=lifespan,
)

if os.environ.get("ENVIRONMENT") == "production":
    app.add_middleware(HTTPSRedirectMiddleware)

# Middleware stack (added bottom-up: last added = outermost)
# 1. Rate limiter (innermost)
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)

# 2. Security headers
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

app.add_middleware(BaseHTTPMiddleware, dispatch=add_security_headers)

# 3. CORS (outermost — must wrap everything so error responses get CORS headers)
add_cors(app)

# Routers
app.include_router(stocks.router)
app.include_router(crypto.router)
app.include_router(news.router)
app.include_router(ai.router)
app.include_router(predictions.router)
app.include_router(keys.router)
app.include_router(watchlist.router)
app.include_router(alerts.router)
app.include_router(notify.router)
app.include_router(portfolio.router)
app.include_router(chat.router)
app.include_router(notifications.router)


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "StockMind API"}
