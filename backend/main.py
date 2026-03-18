from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from api.middleware.cors import add_cors
from api.middleware.rate_limit import rate_limit_middleware
from api.routes import stocks, crypto, news, ai, predictions, keys, watchlist, alerts
from db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="StockMind API",
    description="AI-powered stock analysis backend",
    version="0.1.0",
    lifespan=lifespan,
)

# Security headers
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Middleware — CORS must be added LAST so it wraps everything (outermost layer)
app.add_middleware(BaseHTTPMiddleware, dispatch=rate_limit_middleware)
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


@app.get("/api/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "StockMind API"}
